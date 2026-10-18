import Runner from "../../src/compute/runner";
import Database from "../../src/graph/database";
import {
    NodeSourceCapabilities,
    NodeSourceProvider,
    QueryCancelledError,
    RelationshipSourceCapabilities,
    RelationshipSourceProvider,
    SourceCapabilityError,
    SourceResponseError,
    SourceRow,
    SourceUnsupportedError,
    cursorPages,
    matchesPredicate,
} from "../../src/graph/source_provider";

const db = Database.getInstance();
const drop = (...labels: string[]) => labels.forEach((l) => db.nodes.delete(l));
const V = 1;

function pages(rows: SourceRow[], size: number): SourceRow[][] {
    const out: SourceRow[][] = [];
    for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
    return out.length === 0 ? [[]] : out;
}

/** Array-backed provider returning an async iterable of pages. */
class ArrayNodes implements NodeSourceProvider {
    public requests: any[] = [];
    public opened = 0;
    public closed = 0;
    constructor(
        public rows: SourceRow[],
        public capabilities: NodeSourceCapabilities = { version: V }
    ) {}
    public openReadContext() {
        this.opened++;
        return { snapshot: this.opened };
    }
    public closeReadContext() {
        this.closed++;
    }
    public async *scan(request: any) {
        this.requests.push(request);
        const rows = this.rows.filter((r) => matchesPredicate(request.predicate, r));
        for (const page of pages(rows, request.pageSize)) yield page;
    }
    public lookup(request: any) {
        this.requests.push(request);
        const ids = new Set(request.ids);
        return this.rows.filter((r) => ids.has(r.id) && matchesPredicate(request.predicate, r));
    }
}

/** Cursor-paged provider built on `cursorPages` (opaque string tokens). */
class CursorNodes implements NodeSourceProvider {
    public requests: any[] = [];
    constructor(
        public rows: SourceRow[],
        public capabilities: NodeSourceCapabilities = { version: V }
    ) {}
    private _query(request: any, filter: (r: SourceRow) => boolean) {
        const rows = this.rows.filter((r) => filter(r) && matchesPredicate(request.predicate, r));
        const size = Math.min(request.pageSize, 2);
        return cursorPages(async (cursor) => {
            const offset = cursor === null ? 0 : Number(cursor.substring(1));
            const next = offset + size;
            return {
                rows: rows.slice(offset, next),
                cursor: next < rows.length ? `c${next}` : null,
            };
        });
    }
    public scan(request: any) {
        this.requests.push(request);
        return this._query(request, () => true);
    }
    public lookup(request: any) {
        this.requests.push(request);
        return this._query(request, (r) => request.ids.includes(r.id));
    }
}

class ArrayRels implements RelationshipSourceProvider {
    public requests: any[] = [];
    constructor(
        public rows: SourceRow[],
        public capabilities: RelationshipSourceCapabilities = { version: V }
    ) {}
    public scan(request: any) {
        this.requests.push(request);
        return Promise.resolve(this.rows.filter((r) => matchesPredicate(request.predicate, r)));
    }
    public async *expand(request: any) {
        this.requests.push(request);
        const field = request.side === "left" ? "left_id" : "right_id";
        const ids = new Set(request.ids);
        const rows = this.rows.filter(
            (r) => ids.has(r[field]) && matchesPredicate(request.predicate, r)
        );
        for (const page of pages(rows, request.pageSize)) yield page;
    }
}

const PEOPLE = [
    { id: 1, name: "Ann", age: 31 },
    { id: 2, name: "Bob", age: 25 },
    { id: 3, name: "Cid", age: 42 },
    { id: 4, name: "Dee", age: 19 },
    { id: 5, name: "Eve", age: 37 },
    { id: 6, name: "Fay", age: 28 },
];
const KNOWS = [
    { left_id: 1, right_id: 2, since: 2010 },
    { left_id: 1, right_id: 3, since: 2015 },
    { left_id: 2, right_id: 3, since: 2012 },
    { left_id: 3, right_id: 4, since: 2020 },
    { left_id: 4, right_id: 5, since: 2001 },
    { left_id: 5, right_id: 1, since: 2018 },
    { left_id: 6, right_id: 6, since: 2019 },
];
const CITIES = [
    { id: 1, name: "Oslo" },
    { id: 2, name: "Rome" },
];
const LIVES = [
    { left_id: 1, right_id: 1 },
    { left_id: 2, right_id: 2 },
    { left_id: 3, right_id: 1 },
    { left_id: 4, right_id: 2 },
    { left_id: 5, right_id: 1 },
    { left_id: 6, right_id: 2 },
];

const FULL_NODE: NodeSourceCapabilities = {
    version: V,
    lookup: true,
    cacheable: true,
    predicates: { operators: ["eq", "gt", "gte", "lt", "lte", "in"] },
};
const FULL_REL: RelationshipSourceCapabilities = {
    version: V,
    expand: { left: true, right: true },
    cacheable: true,
    predicates: { operators: ["eq", "in"] },
};

function literal(rows: SourceRow[]): string {
    return JSON.stringify(rows).replace(/"(\w+)":/g, "$1:");
}

async function defineLegacy(prefix: string): Promise<void> {
    const node = (label: string, rows: SourceRow[]) =>
        new Runner(
            `CREATE VIRTUAL (:${prefix}${label}) AS { UNWIND ${literal(rows)} AS r RETURN r.id AS id, r.name AS name, r.age AS age }`
        ).run();
    const rel = (type: string, from: string, to: string, rows: SourceRow[]) =>
        new Runner(
            `CREATE VIRTUAL (:${prefix}${from})-[:${prefix}${type}]-(:${prefix}${to}) AS { UNWIND ${literal(rows)} AS r RETURN r.left_id AS left_id, r.right_id AS right_id, r.since AS since }`
        ).run();
    await node("P", PEOPLE);
    await node("C", CITIES);
    await rel("K", "P", "P", KNOWS);
    await rel("L", "P", "C", LIVES);
}

interface Providers {
    people: ArrayNodes | CursorNodes;
    cities: ArrayNodes | CursorNodes;
    knows: ArrayRels;
    lives: ArrayRels;
}

function defineSources(
    prefix: string,
    kind: "array" | "cursor" = "array",
    nodeCaps: NodeSourceCapabilities = FULL_NODE,
    relCaps: RelationshipSourceCapabilities = FULL_REL
): Providers {
    const make = (rows: SourceRow[]) =>
        kind === "array" ? new ArrayNodes(rows, nodeCaps) : new CursorNodes(rows, nodeCaps);
    const p: Providers = {
        people: make(PEOPLE),
        cities: make(CITIES),
        knows: new ArrayRels(KNOWS, relCaps),
        lives: new ArrayRels(LIVES, relCaps),
    };
    db.registerNodeSource(`${prefix}P`, p.people);
    db.registerNodeSource(`${prefix}C`, p.cities);
    db.registerRelationshipSource(`${prefix}K`, `${prefix}P`, `${prefix}P`, p.knows);
    db.registerRelationshipSource(`${prefix}L`, `${prefix}P`, `${prefix}C`, p.lives);
    return p;
}

async function query(
    statement: string,
    options: any = {}
): Promise<{ results: any[]; runner: Runner }> {
    const runner = new Runner(statement, null, null, options);
    await runner.run();
    return { results: runner.results, runner };
}

function sorted(rows: any[]): string[] {
    return rows.map((r) => JSON.stringify(r)).sort();
}

const DIFFERENTIAL_QUERIES = [
    "MATCH (a:$P)-[:$K]->(b:$P) RETURN a.id AS a, b.id AS b",
    "MATCH (a:$P)<-[:$K]-(b:$P) RETURN a.id AS a, b.id AS b",
    "MATCH (a:$P)-[:$K]-(b:$P) RETURN a.id AS a, b.id AS b",
    "MATCH (a:$P {name: 'Ann'})-[:$K]->(b:$P) RETURN b.name AS name",
    "MATCH (a:$P)-[r:$K]->(b:$P) WHERE a.age > 30 RETURN a.id AS a, r.since AS since, b.id AS b",
    "MATCH (a:$P)-[:$K]->(b:$P) WHERE b.id IN [2, 3] AND a.age >= 25 RETURN a.id AS a, b.id AS b",
    "MATCH (a:$P)-[:$K]->(b:$P) WHERE 30 > b.age RETURN a.id AS a, b.id AS b",
    "MATCH (a:$P)-[:$K]->(b:$P)-[:$L]->(c:$C {name: 'Oslo'}) RETURN a.id AS a, b.id AS b, c.id AS c",
    "MATCH (a:$P)-[:$K]->(b:$P)-[:$K]->(c:$P) RETURN a.id AS a, b.id AS b, c.id AS c",
    "MATCH (a:$P)-[:$K*1..3]->(b:$P) RETURN a.id AS a, b.id AS b",
    "MATCH (a:$P)-[:$K*0..1]->(b:$P) RETURN a.id AS a, b.id AS b",
    "MATCH (a:$P {id: 1})-[:$K]->(b:$P) MATCH (b)-[:$L]->(c:$C) RETURN b.id AS b, c.name AS c",
    "MATCH (a:$P) OPTIONAL MATCH (a)-[:$L]->(c:$C {name: 'Rome'}) RETURN a.id AS a, c.id AS c",
    "MATCH (a:$P)-[:$L]->(c:$C) RETURN c.name AS city, count(a) AS people",
    "MATCH (a:$P) WHERE (a)-[:$K]->(:$P {name: 'Cid'}) RETURN a.name AS name",
    "MATCH (a:$P)-[:$K]->(a) RETURN a.id AS a",
    "MATCH (a:$P)-[:$K]->(b:$P) RETURN a.id AS a, b.id AS b ORDER BY a DESC, b LIMIT 3",
    "MATCH (a:$P)-[:$K]->(b:$P) WHERE a.name >= 'C' RETURN a.id AS a, b.id AS b",
];

function bind(statement: string, prefix: string): string {
    return statement.replace(/\$([PKLC])\b/g, `${prefix}$1`);
}

describe("backend-aware virtual sources", () => {
    beforeAll(async () => {
        await defineLegacy("Leg");
    });

    for (const kind of ["array", "cursor"] as const) {
        test.each(DIFFERENTIAL_QUERIES)(
            `${kind} provider matches legacy: %s`,
            async (statement) => {
                const prefix = `Diff${kind}`;
                defineSources(prefix, kind);
                const legacy = await query(bind(statement, "Leg"));
                const sourced = await query(bind(statement, prefix));
                if (statement.includes("ORDER BY")) {
                    expect(sourced.results).toEqual(legacy.results);
                } else {
                    expect(sorted(sourced.results)).toEqual(sorted(legacy.results));
                }
                expect(sourced.results.length).toBeGreaterThan(0);
            }
        );
    }

    test.each(DIFFERENTIAL_QUERIES)(
        "minimal (scan-only) provider matches legacy: %s",
        async (statement) => {
            defineSources("Min", "array", { version: V }, { version: V });
            const legacy = await query(bind(statement, "Leg"));
            const sourced = await query(bind(statement, "Min"));
            expect(sorted(sourced.results)).toEqual(sorted(legacy.results));
        }
    );

    test.each(DIFFERENTIAL_QUERIES)("no-reorder matches legacy: %s", async (statement) => {
        defineSources("NoRe");
        const legacy = await query(bind(statement, "Leg"));
        const sourced = await query(bind(statement, "NoRe"), {
            sources: { reorder: false, maxBatchSize: 1 },
        });
        expect(sorted(sourced.results)).toEqual(sorted(legacy.results));
    });

    test("correlated loading uses lookup and expand instead of scans", async () => {
        const p = defineSources("Corr");
        const { results, runner } = await query(
            "MATCH (a:CorrP {id: 1})-[:CorrK]->(b:CorrP) RETURN b.name AS name"
        );
        expect(sorted(results)).toEqual(sorted([{ name: "Bob" }, { name: "Cid" }]));
        const stats = runner.sourceStats;
        expect(stats.calls.scan).toBe(0);
        expect(p.people.requests[0]).toMatchObject({
            version: V,
            operation: "lookup",
            label: "CorrP",
            ids: [1],
            args: { id: 1 },
        });
        expect(p.knows.requests).toHaveLength(1);
        expect(p.knows.requests[0]).toMatchObject({
            operation: "expand",
            type: "CorrK",
            sourceLabel: "CorrP",
            targetLabel: "CorrP",
            side: "left",
            ids: [1],
            args: null,
        });
        const targetLookup = p.people.requests[1];
        expect(targetLookup.operation).toBe("lookup");
        expect([...targetLookup.ids].sort()).toEqual([2, 3]);
    });

    test("incoming patterns expand by right_id", async () => {
        const p = defineSources("Inc");
        const { results } = await query(
            "MATCH (a:IncP {id: 3})<-[:IncK]-(b:IncP) RETURN b.id AS b"
        );
        expect(sorted(results)).toEqual(sorted([{ b: 1 }, { b: 2 }]));
        expect(p.knows.requests[0]).toMatchObject({ operation: "expand", side: "right", ids: [3] });
    });

    test("expansion is batched in ceil(u / B) requests", async () => {
        const p = defineSources("Batch");
        const { runner } = await query("MATCH (a:BatchP)-[:BatchK]->(b:BatchP) RETURN a.id, b.id", {
            sources: { maxBatchSize: 4 },
        });
        const expands = p.knows.requests.filter((r) => r.operation === "expand");
        expect(expands.map((r) => r.ids.length)).toEqual([4, 2]);
        expect(runner.sourceStats.batches).toBeGreaterThanOrEqual(2);
        for (const lookup of p.people.requests.filter((r) => r.operation === "lookup")) {
            expect(lookup.ids.length).toBeLessThanOrEqual(4);
        }
    });

    test("provider maxBatchSize lowers the batch size", async () => {
        const p = defineSources("PBatch", "array", FULL_NODE, { ...FULL_REL, maxBatchSize: 2 });
        await query("MATCH (a:PBatchP)-[:PBatchK]->(b:PBatchP) RETURN a.id, b.id");
        const expands = p.knows.requests.filter((r) => r.operation === "expand");
        expect(expands.map((r) => r.ids.length)).toEqual([2, 2, 2]);
    });

    test("reads are cached per query and the cache is bounded", async () => {
        const p = defineSources("Cache");
        const statement =
            "MATCH (a:CacheP {id: 1})-[:CacheK]->(b:CacheP) MATCH (c:CacheP {id: 1})-[:CacheK]->(d:CacheP) RETURN b.id, d.id";
        const cached = await query(statement);
        expect(cached.results).toHaveLength(4);
        expect(cached.runner.sourceStats.cacheHits).toBeGreaterThan(0);
        const callsWithCache = p.people.requests.length + p.knows.requests.length;

        p.people.requests = [];
        p.knows.requests = [];
        const uncached = await query(statement, { sources: { cacheCapacity: 0 } });
        expect(sorted(uncached.results)).toEqual(sorted(cached.results));
        expect(uncached.runner.sourceStats.cacheHits).toBe(0);
        expect(p.people.requests.length + p.knows.requests.length).toBeGreaterThan(callsWithCache);

        // A new query never reuses a previous query's cache.
        p.people.requests = [];
        await query(statement);
        expect(p.people.requests.length).toBeGreaterThan(0);
    });

    test("non-cacheable sources are re-read", async () => {
        const p = defineSources("NoCache", "array", { ...FULL_NODE, cacheable: false });
        const { runner } = await query(
            "MATCH (a:NoCacheP {id: 1}) MATCH (b:NoCacheP {id: 1}) RETURN a.id, b.id"
        );
        expect(p.people.requests.filter((r) => r.operation === "lookup")).toHaveLength(2);
        expect(runner.sourceStats.cacheHits).toBe(0);
    });

    test("WHERE eq, range and IN predicates are pushed down", async () => {
        const p = defineSources("Push", "array", { ...FULL_NODE, lookup: false });
        await query(
            "MATCH (a:PushP) WHERE a.age > 30 AND a.name IN ['Ann', 'Cid', 'Ann'] RETURN a.id"
        );
        expect(p.people.requests[0].predicate).toEqual({
            op: "and",
            terms: [
                { op: "gt", property: "age", value: 30 },
                { op: "in", property: "name", values: ["Ann", "Cid"] },
            ],
        });
        p.people.requests = [];
        await query("MATCH (a:PushP) WHERE a.name = 'Ann' RETURN a.id");
        expect(p.people.requests[0].predicate).toEqual({
            op: "eq",
            property: "name",
            value: "Ann",
        });
        expect(p.people.requests[0].args).toEqual({ name: "Ann" });
    });

    test("predicates are only pushed when declared and safe", async () => {
        const p = defineSources("Safe", "array", {
            version: V,
            predicates: { operators: ["gt", "in"], properties: ["age"] },
        });
        const run = async (statement: string) => {
            p.people.requests = [];
            await query(statement);
            return p.people.requests[0].predicate;
        };
        expect(await run("MATCH (a:SafeP) WHERE a.age > 30 RETURN a.id")).toEqual({
            op: "gt",
            property: "age",
            value: 30,
        });
        expect(await run("MATCH (a:SafeP) WHERE a.age < 30 RETURN a.id")).toBeNull();
        expect(await run("MATCH (a:SafeP) WHERE a.name IN ['Ann'] RETURN a.id")).toBeNull();
        expect(await run("MATCH (a:SafeP) WHERE a.age > 30 OR a.age < 20 RETURN a.id")).toBeNull();
        expect(await run("MATCH (a:SafeP) WHERE a.age IN [31, null] RETURN a.id")).toBeNull();
        expect(await run("MATCH (a:SafeP) WHERE a.age IN [31, [1]] RETURN a.id")).toBeNull();
        expect(await run("MATCH (a:SafeP) WHERE a.age > 'x' RETURN a.id")).toBeNull();
        // Range predicates are not pushed into OPTIONAL MATCH.
        p.people.requests = [];
        await query("UNWIND [1] AS x OPTIONAL MATCH (a:SafeP) WHERE a.age > 30 RETURN a.id");
        expect(p.people.requests[0].predicate).toBeNull();
    });

    test("string ranges are pushed only with binary ordering", async () => {
        const p = defineSources("Str", "array", {
            version: V,
            predicates: { operators: ["gte"], stringOrdering: "binary" },
        });
        const { results } = await query("MATCH (a:StrP) WHERE a.name >= 'D' RETURN a.name AS name");
        expect(p.people.requests[0].predicate).toEqual({ op: "gte", property: "name", value: "D" });
        expect(sorted(results)).toEqual(
            sorted([{ name: "Dee" }, { name: "Eve" }, { name: "Fay" }])
        );
    });

    test("pushed predicates are re-checked (sources may ignore them)", async () => {
        const provider = new ArrayNodes(PEOPLE, FULL_NODE);
        provider.scan = async function* (this: ArrayNodes, request: any) {
            this.requests.push(request);
            yield this.rows;
        } as any;
        db.registerNodeSource("IgnoreP", provider);
        const { results } = await query("MATCH (a:IgnoreP) WHERE a.age > 30 RETURN a.id AS id");
        expect(provider.requests[0].predicate).not.toBeNull();
        expect(sorted(results)).toEqual(sorted([{ id: 1 }, { id: 3 }, { id: 5 }]));
    });

    test("selective end node starts the traversal (chain reversal)", async () => {
        const p = defineSources("Rev");
        const { results, runner } = await query(
            "MATCH (a:RevP)-[:RevK]->(b:RevP)-[:RevK]->(c:RevP {id: 3}) RETURN a.id AS a, b.id AS b"
        );
        expect(sorted(results)).toEqual(
            sorted([
                { a: 1, b: 2 },
                { a: 5, b: 1 },
            ])
        );
        expect(runner.sourceStats.plans).toEqual([expect.objectContaining({ start: "last" })]);
        expect(p.people.requests.every((r) => r.operation === "lookup")).toBe(true);
        expect(p.knows.requests.every((r) => r.operation === "expand" && r.side === "right")).toBe(
            true
        );
    });

    test("reordering can be disabled", async () => {
        defineSources("NoRev");
        const { runner } = await query(
            "MATCH (a:NoRevP)-[:NoRevK]->(b:NoRevP)-[:NoRevK]->(c:NoRevP {id: 3}) RETURN a.id",
            { sources: { reorder: false } }
        );
        expect(runner.sourceStats.plans).toEqual([]);
    });

    test("LIMIT stops reading and closes the source early", async () => {
        let pulled = 0;
        let finalized = false;
        let aborted = false;
        db.registerNodeSource("LimitP", {
            capabilities: { version: V },
            async *scan(_request, context) {
                try {
                    for (let i = 0; i < 1000; i++) {
                        pulled++;
                        yield [{ id: i }];
                    }
                } finally {
                    finalized = true;
                    aborted = context.signal.aborted;
                }
            },
        });
        const { results } = await query("MATCH (a:LimitP) RETURN a.id AS id LIMIT 2");
        expect(results).toEqual([{ id: 0 }, { id: 1 }]);
        expect(pulled).toBeLessThan(5);
        expect(finalized).toBe(true);
        expect(aborted).toBe(false);

        pulled = 0;
        const viaWith = await query("MATCH (a:LimitP) WITH a LIMIT 3 RETURN a.id AS id");
        expect(viaWith.results).toHaveLength(3);
        expect(pulled).toBeLessThan(6);
    });

    test("ORDER BY and aggregates with LIMIT still read everything", async () => {
        defineSources("Agg");
        const top = await query("MATCH (a:AggP) RETURN a.age AS age ORDER BY age DESC LIMIT 2");
        expect(top.results).toEqual([{ age: 42 }, { age: 37 }]);
        const count = await query("MATCH (a:AggP) RETURN count(a) AS n LIMIT 1");
        expect(count.results).toEqual([{ n: 6 }]);
    });

    test("rows stream: the first row is processed before later pages are requested", async () => {
        const events: string[] = [];
        db.registerNodeSource("StreamP", {
            capabilities: { version: V, streaming: true },
            async *scan() {
                for (let i = 0; i < 3; i++) {
                    events.push(`page${i}`);
                    yield [{ id: i }];
                }
            },
        });
        await new Runner(
            "CREATE VIRTUAL (:StreamQ) AS { UNWIND [0, 1, 2] AS x RETURN x AS id }"
        ).run();
        db.registerRelationshipSource("STREAM_R", "StreamP", "StreamQ", {
            capabilities: { version: V, expand: { left: true } },
            expand(request) {
                events.push(`expand${request.ids.join(",")}`);
                return request.ids.map((id: number) => ({ left_id: id, right_id: id }));
            },
            scan() {
                events.push("scan");
                return [];
            },
        });
        const { results } = await query(
            "MATCH (a:StreamP)-[:STREAM_R]->(b:StreamQ) RETURN a.id AS id"
        );
        expect(results).toHaveLength(3);
        expect(events).toEqual(["page0", "expand0", "page1", "expand1", "page2", "expand2"]);
    });

    test("empty non-final pages are not treated as the end", async () => {
        db.registerNodeSource("EmptyP", {
            capabilities: { version: V },
            async *scan() {
                yield [];
                yield [{ id: 1 }];
                yield [];
                yield [{ id: 2 }];
            },
        });
        const { results } = await query("MATCH (a:EmptyP) RETURN a.id AS id");
        expect(results).toEqual([{ id: 1 }, { id: 2 }]);
    });

    test("a repeated continuation token is reported", async () => {
        db.registerNodeSource("LoopP", {
            capabilities: { version: V },
            scan() {
                return cursorPages(async () => ({ rows: [{ id: 1 }], cursor: "same" }));
            },
        });
        await expect(query("MATCH (a:LoopP) RETURN a.id")).rejects.toThrow(SourceResponseError);
        drop("LoopP");
    });

    test("malformed responses raise SourceResponseError", async () => {
        const bad = (scan: any) =>
            db.registerNodeSource("BadP", { capabilities: { version: V }, scan });
        bad(() => "nope");
        await expect(query("MATCH (a:BadP) RETURN a")).rejects.toThrow(SourceResponseError);
        bad(() => [1, 2]);
        await expect(query("MATCH (a:BadP) RETURN a")).rejects.toThrow(SourceResponseError);
        bad(async function* () {
            yield { id: 1 };
        });
        await expect(query("MATCH (a:BadP) RETURN a")).rejects.toThrow(SourceResponseError);
        bad(() => [{ name: "no id" }]);
        await expect(query("MATCH (a:BadP) RETURN a")).rejects.toThrow(/id/);
        drop("BadP");
    });

    test("provider errors propagate with the source name", async () => {
        db.registerNodeSource("ErrP", {
            capabilities: { version: V },
            scan() {
                throw new Error("backend down");
            },
        });
        await expect(query("MATCH (a:ErrP) RETURN a")).rejects.toThrow(/backend down/);
        drop("ErrP");
    });

    test("SourceUnsupportedError falls back to a scan", async () => {
        const provider = new ArrayNodes(PEOPLE, FULL_NODE);
        provider.lookup = () => {
            throw new SourceUnsupportedError();
        };
        db.registerNodeSource("FbP", provider);
        const { results, runner } = await query("MATCH (a:FbP {id: 2}) RETURN a.name AS name");
        expect(results).toEqual([{ name: "Bob" }]);
        expect(runner.sourceStats.fallbacks).toBeGreaterThan(0);
        expect(provider.requests.some((r) => r.operation === "scan")).toBe(true);
    });

    test("cancellation aborts in-flight reads", async () => {
        let seen: AbortSignal | null = null;
        db.registerNodeSource("SlowP", {
            capabilities: { version: V },
            scan(_request, context) {
                seen = context.signal;
                return new Promise(() => undefined);
            },
        });
        const runner = new Runner("MATCH (a:SlowP) RETURN a");
        const running = runner.run();
        await new Promise((r) => setTimeout(r, 10));
        runner.cancel();
        await expect(running).rejects.toThrow(QueryCancelledError);
        expect(seen!.aborted).toBe(true);
        expect(runner.sourceStats.cancellations).toBe(1);

        const controller = new AbortController();
        const external = new Runner("MATCH (a:SlowP) RETURN a", null, null, {
            sources: { signal: controller.signal },
        });
        const pending = external.run();
        await new Promise((r) => setTimeout(r, 10));
        controller.abort();
        await expect(pending).rejects.toThrow(QueryCancelledError);
        drop("SlowP");
    });

    test("read contexts are opened once per query and closed afterwards", async () => {
        const p = defineSources("Snap");
        await query("MATCH (a:SnapP)-[:SnapK]->(b:SnapP) RETURN a.id, b.id");
        expect((p.people as ArrayNodes).opened).toBe(1);
        expect((p.people as ArrayNodes).closed).toBe(1);
        await expect(query("MATCH (a:SnapP) UNWIND a.id AS x RETURN x")).rejects.toThrow(/array/);
        expect((p.people as ArrayNodes).closed).toBe(2);
    });

    test("ids are label-local and type-sensitive", async () => {
        db.registerNodeSource(
            "LocA",
            new ArrayNodes(
                [
                    { id: 1, n: "a1" },
                    { id: "2", n: "a2" },
                ],
                FULL_NODE
            )
        );
        db.registerNodeSource(
            "LocB",
            new ArrayNodes(
                [
                    { id: 1, n: "b1" },
                    { id: 2, n: "b2" },
                ],
                FULL_NODE
            )
        );
        db.registerRelationshipSource(
            "LOC",
            "LocA",
            "LocB",
            new ArrayRels(
                [
                    { left_id: 1, right_id: 1 },
                    { left_id: "2", right_id: 2 },
                    { left_id: 2, right_id: 2 },
                ],
                FULL_REL
            )
        );
        const { results } = await query(
            "MATCH (a:LocA)-[:LOC]->(b:LocB) RETURN a.n AS a, b.n AS b"
        );
        expect(sorted(results)).toEqual(
            sorted([
                { a: "a1", b: "b1" },
                { a: "a2", b: "b2" },
            ])
        );
    });

    test("legacy and provider sources can be mixed in one pattern", async () => {
        const knows = new ArrayRels(KNOWS, FULL_REL);
        db.registerRelationshipSource("MIXK", "LegP", "LegP", knows);
        const legacy = await query("MATCH (a:LegP)-[:LegK]->(b:LegP) RETURN a.id AS a, b.id AS b");
        const mixed = await query("MATCH (a:LegP)-[:MIXK]->(b:LegP) RETURN a.id AS a, b.id AS b");
        expect(sorted(mixed.results)).toEqual(sorted(legacy.results));
    });

    test("legacy definitions keep eager loading; $args alone does not opt in", async () => {
        await new Runner(
            "CREATE VIRTUAL (:ArgsP) AS { UNWIND [{id: 1, k: 'a'}, {id: 2, k: 'b'}] AS r WITH r WHERE $args.k IS NULL OR r.k = $args.k RETURN r.id AS id, r.k AS k }"
        ).run();
        const { results, runner } = await query("MATCH (a:ArgsP {k: 'b'}) RETURN a.id AS id");
        expect(results).toEqual([{ id: 2 }]);
        expect(runner.sourceStats.calls).toEqual({ scan: 0, lookup: 0, expand: 0 });
        expect(runner.sourceStats.plans).toEqual([]);
    });

    test("invalid capabilities are rejected at registration", async () => {
        const scan = () => [];
        expect(() =>
            db.registerNodeSource("InvP", { capabilities: { version: 2 } as any, scan })
        ).toThrow(SourceCapabilityError);
        expect(() =>
            db.registerNodeSource("InvP", { capabilities: { version: V, lookup: true }, scan })
        ).toThrow(/lookup/);
        expect(() =>
            db.registerNodeSource("InvP", {
                capabilities: { version: V, predicates: { operators: ["like" as any] } },
                scan,
            })
        ).toThrow(/like/);
        expect(() =>
            db.registerNodeSource("InvP", { capabilities: { version: V, maxBatchSize: 0 }, scan })
        ).toThrow(/maxBatchSize/);
        expect(() =>
            db.registerRelationshipSource("INV", null, null, {
                capabilities: { version: V, expand: { left: true } },
                scan,
            })
        ).toThrow(/expand/);
        expect(() =>
            db.registerNodeSource("InvP", { capabilities: { version: V } } as any)
        ).toThrow(/scan/);
        expect(() => db.setNodeSourceCapabilities("NoSuchLabel", { version: V })).toThrow(
            SourceCapabilityError
        );
    });

    test("a node source can be removed with DELETE VIRTUAL", async () => {
        defineSources("Del");
        await new Runner("DELETE VIRTUAL (:DelP)").run();
        await expect(query("MATCH (a:DelP) RETURN a")).rejects.toThrow();
    });

    test("provenance works with registered sources", async () => {
        defineSources("Prov");
        const runner = new Runner(
            "MATCH (a:ProvP {id: 1})-[:ProvK]->(b:ProvP) RETURN b.id AS b",
            null,
            null,
            {
                provenance: true,
            }
        );
        await runner.run();
        expect(runner.provenance).toHaveLength(2);
        expect(runner.provenance[0].nodes.map((n: any) => n.alias).sort()).toEqual(["a", "b"]);
    });

    test("schema introspection materializes provider scans", async () => {
        defineSources("Schema");
        const { results } = await query(
            "CALL schema() YIELD kind, label, type, properties RETURN kind, label, type, properties"
        );
        const entry = results.find((r: any) => r.label === "SchemaP");
        expect(entry).toBeDefined();
    });

    describe("statement-backed definitions", () => {
        const definition = (label: string) => `
            CREATE VIRTUAL (:${label}) AS {
                UNWIND ${literal(PEOPLE)} AS r
                WITH r, $request AS req
                WHERE req IS NULL OR req.operation = 'scan' OR r.id IN req.ids
                RETURN r.id AS id, r.name AS name, r.age AS age, req.operation AS op
            }`;

        test("opt-in passes $request and keeps results identical", async () => {
            await new Runner(definition("StmtP")).run();
            await new Runner(
                "CREATE VIRTUAL (:StmtP)-[:STMT_K]-(:StmtP) AS { UNWIND " +
                    literal(KNOWS) +
                    " AS r WITH r, $request AS req WHERE req IS NULL OR req.operation = 'scan' OR (req.side = 'left' AND r.left_id IN req.ids) OR (req.side = 'right' AND r.right_id IN req.ids) RETURN r.left_id AS left_id, r.right_id AS right_id }"
            ).run();
            const statement =
                "MATCH (a:StmtP {id: 1})-[:STMT_K]->(b:StmtP) RETURN a.id AS a, b.id AS b, b.op AS op";
            const before = await query(statement);
            expect(before.results.every((r: any) => r.op === null)).toBe(true);

            for (const streaming of [false, true]) {
                db.setNodeSourceCapabilities("StmtP", { version: V, lookup: true, streaming });
                db.setRelationshipSourceCapabilities("STMT_K", "StmtP", "StmtP", {
                    version: V,
                    expand: { left: true, right: true },
                    streaming,
                });
                const after = await query(statement);
                expect(sorted(after.results.map(({ a, b }: any) => ({ a, b })))).toEqual(
                    sorted(before.results.map(({ a, b }: any) => ({ a, b })))
                );
                expect(after.results.every((r: any) => r.op === "lookup")).toBe(true);
                expect(after.runner.sourceStats.calls.lookup).toBeGreaterThan(0);
                expect(after.runner.sourceStats.calls.expand).toBeGreaterThan(0);
            }

            db.setNodeSourceCapabilities("StmtP", null);
            const reverted = await query(statement);
            expect(reverted.results.every((r: any) => r.op === null)).toBe(true);
        });

        test("streaming statements stop early under LIMIT", async () => {
            await new Runner(
                "CREATE VIRTUAL (:StmtBig) AS { UNWIND range(1, 5000) AS i RETURN i AS id }"
            ).run();
            db.setNodeSourceCapabilities("StmtBig", { version: V, streaming: true });
            const { results, runner } = await query("MATCH (a:StmtBig) RETURN a.id AS id LIMIT 3", {
                sources: { pageSize: 10 },
            });
            expect(results).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
            expect(runner.sourceStats.rows).toBeLessThan(100);
            expect(runner.sourceStats.materializations).toBe(0);
            // The definition remains usable afterwards.
            const all = await query("MATCH (a:StmtBig) RETURN count(a) AS n");
            expect(all.results).toEqual([{ n: 5000 }]);
        });

        test("redefining the label clears the opt-in", async () => {
            await new Runner(definition("StmtRe")).run();
            db.setNodeSourceCapabilities("StmtRe", { version: V });
            await new Runner(definition("StmtRe")).run();
            const { runner } = await query("MATCH (a:StmtRe) RETURN a.id");
            expect(runner.sourceStats.calls.scan).toBe(0);
        });
    });
});
