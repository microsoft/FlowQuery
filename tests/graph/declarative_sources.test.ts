import FlowQuery from "../../src/compute/flowquery";
import Runner from "../../src/compute/runner";
import Database from "../../src/graph/database";
import {
    PREDICATE_OPERATORS,
    QueryCancelledError,
    SourceCapabilityError,
    SourceRow,
    matchesPredicate,
    normalizeCapabilities,
} from "../../src/graph/source_provider";
import AsyncFunction from "../../src/parsing/functions/async_function";
import { FunctionDef } from "../../src/parsing/functions/function_metadata";
import { MockBackend, mock } from "./mock_backend";

const db = Database.getInstance();

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
@FunctionDef({
    description: "mockbackend variant without declared capabilities",
    category: "async",
    parameters: [],
    output: { description: "rows", type: "object" },
})
class DsPlain extends MockBackend {
    static capabilities: any = undefined;
    constructor() {
        super("dsplain");
    }
}

@FunctionDef({
    description: "mockbackend variant answering capabilities per label",
    category: "async",
    parameters: [],
    output: { description: "rows", type: "object" },
})
class DsDynamic extends MockBackend {
    static asked: any[] = [];
    static capabilities: any = (request: any) => {
        DsDynamic.asked.push(request);
        return request.label?.endsWith("P") ? { lookup: true } : null;
    };
    constructor() {
        super("dsdynamic");
    }
}

@FunctionDef({
    description: "Backend that blocks until the query signal aborts",
    category: "async",
    parameters: [],
    output: { description: "rows", type: "object" },
})
class DsBlocking extends AsyncFunction {
    static started: () => void = () => undefined;
    static abortedSeen = false;
    public async *generate(request: any): AsyncGenerator<any> {
        const signal = this.context!.signal;
        DsBlocking.started();
        await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve()));
        DsBlocking.abortedSeen = signal.aborted;
        yield { id: 1 };
    }
}

@FunctionDef({
    description: "Code-point ordered string backend",
    category: "async",
    parameters: [],
    output: { description: "rows", type: "object" },
})
class DsCodepoint extends AsyncFunction {
    static capabilities = {
        predicates: {
            operators: ["eq", "in", "gt", "gte", "lt", "lte"],
            stringOrdering: "codepoint",
        },
    };
    static rows: SourceRow[] = [];
    static requests: any[] = [];
    public async *generate(request: any): AsyncGenerator<any> {
        DsCodepoint.requests.push(request);
        yield* DsCodepoint.rows.filter((r) => codePointMatches(request?.predicate ?? null, r));
    }
}

function codePointCompare(a: string, b: string): number {
    const x = Array.from(a).map((c) => c.codePointAt(0)!);
    const y = Array.from(b).map((c) => c.codePointAt(0)!);
    for (let i = 0; i < Math.min(x.length, y.length); i++) {
        if (x[i] !== y[i]) return x[i] - y[i];
    }
    return x.length - y.length;
}

/** Exact predicate evaluation using code-point order for strings. */
function codePointMatches(predicate: any, row: SourceRow): boolean {
    if (predicate === null) return true;
    if (predicate.op === "and") return predicate.terms.every((t: any) => codePointMatches(t, row));
    const value = row[predicate.property];
    if (typeof value !== "string" || typeof predicate.value !== "string") {
        return matchesPredicate(predicate, row);
    }
    const c = codePointCompare(value, predicate.value);
    switch (predicate.op) {
        case "gt":
            return c > 0;
        case "gte":
            return c >= 0;
        case "lt":
            return c < 0;
        case "lte":
            return c <= 0;
        default:
            return matchesPredicate(predicate, row);
    }
}

const nodeBody = (fn: string, label: string) =>
    `{ LOAD JSON FROM ${fn}($request, '${label}') AS n RETURN n.id AS id, n.name AS name, n.age AS age }`;
const relBody = (fn: string, type: string) =>
    `{ LOAD JSON FROM ${fn}($request, 'rel:${type}') AS r RETURN r.left_id AS left_id, r.right_id AS right_id, r.since AS since }`;

const seeded = new Set<string>();

/** Seed the mock with PEOPLE / KNOWS under `prefix` and define both over `fn`. */
async function define(prefix: string, fn: string, caps: string = ""): Promise<void> {
    if (!seeded.has(prefix)) {
        seeded.add(prefix);
        mock.addNodes(`${prefix}_P`, PEOPLE);
        mock.addRelationships(`${prefix}_K`, KNOWS);
    }
    const clause = caps === "" ? "" : ` WITH CAPABILITIES ${caps}`;
    await new Runner(
        `CREATE VIRTUAL (:${prefix}_P)${clause} AS ${nodeBody(fn, `${prefix}_P`)}`
    ).run();
    await new Runner(
        `CREATE VIRTUAL (:${prefix}_P)-[:${prefix}_K]-(:${prefix}_P)${clause} AS ${relBody(fn, `${prefix}_K`)}`
    ).run();
}

async function defineLegacy(prefix: string): Promise<void> {
    const literal = (rows: SourceRow[]) => JSON.stringify(rows).replace(/"(\w+)":/g, "$1:");
    await new Runner(
        `CREATE VIRTUAL (:${prefix}_P) AS { UNWIND ${literal(PEOPLE)} AS n RETURN n.id AS id, n.name AS name, n.age AS age }`
    ).run();
    await new Runner(
        `CREATE VIRTUAL (:${prefix}_P)-[:${prefix}_K]-(:${prefix}_P) AS { UNWIND ${literal(KNOWS)} AS r RETURN r.left_id AS left_id, r.right_id AS right_id, r.since AS since }`
    ).run();
}

async function query(statement: string, options: any = {}) {
    const runner = new Runner(statement, null, null, options);
    await runner.run();
    return { results: runner.results, runner };
}

const sorted = (rows: any[]) => rows.map((r) => JSON.stringify(r)).sort();
const bind = (statement: string, prefix: string) =>
    statement.replace(/\$P/g, `${prefix}_P`).replace(/\$K/g, `${prefix}_K`);

const QUERIES = [
    "MATCH (a:$P)-[:$K]->(b:$P) RETURN a.id AS a, b.id AS b",
    "MATCH (a:$P)<-[:$K]-(b:$P) RETURN a.id AS a, b.id AS b",
    "MATCH (a:$P {name: 'Ann'})-[:$K]->(b:$P) RETURN b.name AS name",
    "MATCH (a:$P)-[r:$K]->(b:$P) WHERE a.age > 30 RETURN a.id AS a, r.since AS since, b.id AS b",
    "MATCH (a:$P)-[:$K]->(b:$P) WHERE b.id IN [2, 3] AND a.age >= 25 RETURN a.id AS a, b.id AS b",
    "MATCH (a:$P)-[:$K]->(b:$P)-[:$K]->(c:$P) RETURN a.id AS a, b.id AS b, c.id AS c",
    "MATCH (a:$P)-[:$K*1..3]->(b:$P) RETURN a.id AS a, b.id AS b",
    "MATCH (a:$P)-[:$K]->(b:$P {id: 3}) RETURN a.id AS a",
    "MATCH (a:$P) WHERE a.name >= 'Cid' AND a.name < 'Fay' RETURN a.name AS name",
    "MATCH (a:$P) RETURN a.name AS name ORDER BY name LIMIT 2",
];

beforeAll(async () => {
    await defineLegacy("DsLeg");
});

beforeEach(() => mock.reset());

describe("item 3: stringOrdering 'codepoint'", () => {
    const strings = ["a", "b", "\uE000", "\uFFFF", "😀", "😀b", "\uD7FF", "z"];

    beforeAll(async () => {
        DsCodepoint.rows = strings.map((s, i) => ({ id: i, s }));
        await new Runner(
            `CREATE VIRTUAL (:DsCp) AS { LOAD JSON FROM dscodepoint($request) AS n RETURN n.id AS id, n.s AS s }`
        ).run();
        await new Runner(
            `CREATE VIRTUAL (:DsCpScan) AS { LOAD JSON FROM dscodepoint(null) AS n RETURN n.id AS id, n.s AS s }`
        ).run();
    });

    test("a codepoint source receives gte and lt string terms", async () => {
        DsCodepoint.requests = [];
        const { results } = await query(
            "MATCH (n:DsCp) WHERE n.s >= 'a' AND n.s < 'c' RETURN n.s AS s"
        );
        expect(sorted(results)).toEqual(sorted([{ s: "a" }, { s: "b" }]));
        expect(DsCodepoint.requests[0].predicate).toEqual({
            op: "and",
            terms: [
                { op: "gte", property: "s", value: "a" },
                { op: "lt", property: "s", value: "c" },
            ],
        });
    });

    test.each([
        ["n.s >= '\uFFFF'"],
        ["n.s < '\uFFFF'"],
        ["n.s > '\uE000'"],
        ["n.s <= '😀'"],
        ["n.s >= 'b' AND n.s < '😀b'"],
        ["n.s > '\uD7FF'"],
        ["n.s < 'z'"],
    ])("matches an unpushed scan: %s", async (where) => {
        const pushed = await query(`MATCH (n:DsCp) WHERE ${where} RETURN n.s AS s`);
        const scanned = await query(`MATCH (n:DsCpScan) WHERE ${where} RETURN n.s AS s`);
        expect(sorted(pushed.results)).toEqual(sorted(scanned.results));
    });

    test("bounds at or above U+D800 stay in FlowQuery", async () => {
        DsCodepoint.requests = [];
        await query("MATCH (n:DsCp) WHERE n.s < '\uFFFF' AND n.s > 'a' RETURN n.s AS s");
        expect(DsCodepoint.requests[0].predicate).toEqual({ op: "gt", property: "s", value: "a" });
    });

    test("invalid stringOrdering is rejected", async () => {
        await expect(
            new Runner(
                `CREATE VIRTUAL (:DsCpBad) WITH CAPABILITIES {predicates: {operators: ['lt'], stringOrdering: 'locale'}} AS { RETURN 1 AS id }`
            ).run()
        ).rejects.toThrow(SourceCapabilityError);
    });
});

describe("item 4: async function context", () => {
    beforeAll(async () => {
        await define("DsCtx", "mockbackend");
    });

    test("every request of a query shares one snapshot, opened and closed once", async () => {
        const { results } = await query(
            "MATCH (a:DsCtx_P {id: 1})-[:DsCtx_K]->(b:DsCtx_P) MATCH (c:DsCtx_P) WHERE c.age > 40 RETURN b.id AS b, c.id AS c"
        );
        expect(sorted(results)).toEqual(
            sorted([
                { b: 2, c: 3 },
                { b: 3, c: 3 },
            ])
        );
        const operations = new Set(mock.requests.map((r) => r.operation));
        expect(operations).toEqual(new Set(["scan", "lookup", "expand"]));
        const snapshots = mock.log.map((e) => e.snapshot);
        expect(snapshots[0]).toEqual({ snapshot: 1 });
        expect(snapshots.every((s) => s === snapshots[0])).toBe(true);
        expect(mock.log.every((e) => e.signal instanceof AbortSignal)).toBe(true);
        expect(mock.opened).toBe(1);
        expect(mock.closed).toBe(1);
    });

    test("the read context is closed when the query fails", async () => {
        mock.failOn = "expand";
        await expect(
            query("MATCH (a:DsCtx_P {id: 1})-[:DsCtx_K]->(b:DsCtx_P) RETURN b.id AS b")
        ).rejects.toThrow(/backend failure/);
        expect(mock.opened).toBe(1);
        expect(mock.closed).toBe(1);
    });

    test("functions see the query signal, which runner.cancel() aborts", async () => {
        await new Runner(
            `CREATE VIRTUAL (:DsBlock) WITH CAPABILITIES {} AS { LOAD JSON FROM dsblocking($request) AS n RETURN n.id AS id }`
        ).run();
        const started = new Promise<void>((resolve) => (DsBlocking.started = resolve));
        DsBlocking.abortedSeen = false;
        const runner = new Runner("MATCH (n:DsBlock) RETURN n.id AS id");
        const done = runner.run();
        await started;
        runner.cancel();
        await expect(done).rejects.toBeInstanceOf(QueryCancelledError);
        await new Promise((r) => setTimeout(r, 0));
        expect(DsBlocking.abortedSeen).toBe(true);
    });

    test("the snapshot is closed when the query is cancelled", async () => {
        const runner = new Runner("MATCH (a:DsCtx_P) RETURN a.id AS id");
        runner.cancel();
        await expect(runner.run()).rejects.toBeInstanceOf(QueryCancelledError);
        expect(mock.closed).toBe(mock.opened);
    });

    test("top-level LOAD and CALL also get a context", async () => {
        const { results } = await query(
            "LOAD JSON FROM mockbackend(null, 'DsCtx_P') AS n RETURN n.id AS id"
        );
        expect(results.length).toBe(PEOPLE.length);
        expect(mock.log[0].signal).toBeInstanceOf(AbortSignal);
        expect(mock.opened).toBe(1);
        expect(mock.closed).toBe(1);
    });
});

describe("item 4: declarative definitions cover the provider contract", () => {
    beforeAll(async () => {
        await define("DsDecl", "mockbackend", "{maxBatchSize: 2}");
    });

    test.each(QUERIES)("matches legacy: %s", async (statement) => {
        const legacy = await query(bind(statement, "DsLeg"));
        const declarative = await query(bind(statement, "DsDecl"), { sources: { pageSize: 2 } });
        if (statement.includes("ORDER BY")) {
            expect(declarative.results).toEqual(legacy.results);
        } else {
            expect(sorted(declarative.results)).toEqual(sorted(legacy.results));
        }
    });

    test("batching: expansions honour maxBatchSize", async () => {
        const { runner } = await query(
            "MATCH (a:DsDecl_P)-[:DsDecl_K]->(b:DsDecl_P) RETURN a.id AS a, b.id AS b"
        );
        const expands = mock.requests.filter((r) => r?.operation === "expand");
        expect(expands.length).toBeGreaterThan(0);
        expect(expands.every((r) => r.ids.length <= 2)).toBe(true);
        expect(runner.sourceStats.batches).toBeGreaterThan(0);
    });

    test("push-down: WHERE and pattern constraints reach the backend", async () => {
        await query("MATCH (a:DsDecl_P) WHERE a.age > 30 RETURN a.id AS id");
        expect(mock.requests[0].predicate).toEqual({ op: "gt", property: "age", value: 30 });
    });

    test("streaming and early termination", async () => {
        const { results } = await query("MATCH (a:DsDecl_P) RETURN a.id AS id LIMIT 1", {
            sources: { pageSize: 1 },
        });
        expect(results.length).toBe(1);
        expect(mock.yielded).toBeLessThan(PEOPLE.length);
    });

    test("caching: repeated identical reads are served from the query cache", async () => {
        const { runner } = await query(
            "MATCH (a:DsDecl_P {id: 1}) MATCH (b:DsDecl_P {id: 1}) RETURN a.id AS a, b.id AS b"
        );
        expect(runner.sourceStats.cacheHits).toBeGreaterThan(0);
    });

    test("start-point reordering", async () => {
        const { runner } = await query(
            "MATCH (a:DsDecl_P)-[:DsDecl_K]->(b:DsDecl_P {id: 3}) RETURN a.id AS a"
        );
        expect(runner.sourceStats.plans.some((p) => p.start === "last")).toBe(true);
    });
});

describe("item 4: deprecated programmatic APIs", () => {
    test("still work and warn once", async () => {
        const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
        try {
            const provider = { capabilities: { version: 1 }, scan: () => [{ id: 1 }] };
            FlowQuery.registerNodeSource("DsDep", provider as any);
            FlowQuery.registerNodeSource("DsDep", provider as any);
            const { results } = await query("MATCH (n:DsDep) RETURN n.id AS id");
            expect(results).toEqual([{ id: 1 }]);
            const calls = warn.mock.calls.filter((c) =>
                String(c[0]).includes("FlowQuery.registerNodeSource is deprecated")
            );
            expect(calls.length).toBe(1);
        } finally {
            warn.mockRestore();
        }
    });
});

describe("item 5: function-declared capabilities and shorthands", () => {
    test("a definition without a clause uses the function's declared capabilities", async () => {
        await define("DsAuto", "mockbackend");
        await define(
            "DsLong",
            "mockbackend",
            "{lookup: true, expand: {left: true, right: true}, streaming: true, cacheable: true, predicates: {operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'in']}}"
        );
        expect(db.nodes.get("DsAuto_P")!.provider!.capabilities).toEqual({
            version: 1,
            lookup: true,
            streaming: true,
            cacheable: true,
            predicates: { operators: [...PREDICATE_OPERATORS] },
            writes: true,
        });
        const statement =
            "MATCH (a:$P {id: 1})-[:$K]->(b:$P) WHERE b.age > 30 RETURN b.name AS name";
        const auto = await query(bind(statement, "DsAuto"));
        const autoLog = mock.requests.map((r) => ({
            ...r,
            label: r.label?.replace("DsAuto", ""),
            type: r.type?.replace("DsAuto", ""),
            sourceLabel: undefined,
            targetLabel: undefined,
        }));
        mock.reset();
        const long = await query(bind(statement, "DsLong"));
        const longLog = mock.requests.map((r) => ({
            ...r,
            label: r.label?.replace("DsLong", ""),
            type: r.type?.replace("DsLong", ""),
            sourceLabel: undefined,
            targetLabel: undefined,
        }));
        expect(auto.results).toEqual([{ name: "Cid" }]);
        expect(long.results).toEqual(auto.results);
        expect(autoLog).toEqual(longLog);
        expect(new Set(autoLog.map((r) => r.operation))).toEqual(new Set(["lookup", "expand"]));
    });

    test("an explicit clause overrides declared capabilities", async () => {
        await define("DsOff", "mockbackend", "{predicates: false}");
        await query("MATCH (a:DsOff_P) WHERE a.age > 30 RETURN a.id AS id");
        expect(mock.requests.length).toBeGreaterThan(0);
        expect(mock.requests.every((r) => r.predicate === null)).toBe(true);
        expect(db.nodes.get("DsOff_P")!.provider!.capabilities.lookup).toBe(true);
    });

    test("shorthands normalize to the long forms", () => {
        expect(normalizeCapabilities({ predicates: true, expand: true }, "relationship")).toEqual(
            normalizeCapabilities(
                {
                    predicates: { operators: ["eq", "gt", "gte", "lt", "lte", "in"] },
                    expand: { left: true, right: true },
                },
                "relationship"
            )
        );
        expect(normalizeCapabilities({ predicates: true }, "node").predicates.stringOrdering).toBe(
            undefined
        );
        expect(normalizeCapabilities({ expand: true, lookup: true }, "node")).toEqual({
            version: 1,
            lookup: true,
        });
        expect(normalizeCapabilities({ expand: true, lookup: true }, "relationship")).toEqual({
            version: 1,
            expand: { left: true, right: true },
        });
    });

    test("shorthands work in WITH CAPABILITIES", async () => {
        await define("DsShort", "dsplain", "{predicates: true, expand: true}");
        expect(
            db.relationships.get("DsShort_K")!.get("DsShort_P:DsShort_P")!.provider!.capabilities
        ).toEqual({
            version: 1,
            expand: { left: true, right: true },
            predicates: { operators: [...PREDICATE_OPERATORS] },
        });
    });

    test("a function without declared capabilities behaves as today", async () => {
        await define("DsEager", "dsplain");
        expect(db.nodes.get("DsEager_P")!.provider).toBeNull();
        const { results } = await query("MATCH (a:DsEager_P {id: 2}) RETURN a.name AS name");
        expect(results).toEqual([{ name: "Bob" }]);
    });

    test("capabilities can be answered per label", async () => {
        DsDynamic.asked = [];
        await define("DsDyn", "dsdynamic");
        expect(DsDynamic.asked).toEqual([
            { version: 1, operation: "capabilities", label: "DsDyn_P" },
            {
                version: 1,
                operation: "capabilities",
                type: "DsDyn_K",
                sourceLabel: "DsDyn_P",
                targetLabel: "DsDyn_P",
            },
        ]);
        expect(db.nodes.get("DsDyn_P")!.provider!.capabilities).toEqual({
            version: 1,
            lookup: true,
        });
        expect(db.relationships.get("DsDyn_K")!.get("DsDyn_P:DsDyn_P")!.provider).toBeNull();
    });

    test("source_capabilities() exposes the effective capabilities", async () => {
        await define("DsInfo", "mockbackend", "{predicates: false}");
        const { results } = await query(
            "LOAD JSON FROM source_capabilities() AS s WITH s WHERE s.label = 'DsInfo_P' OR s.type = 'DsInfo_K' RETURN s"
        );
        expect(results.map((r: any) => r.s)).toEqual([
            {
                kind: "node",
                label: "DsInfo_P",
                mode: "statement",
                capabilities: {
                    version: 1,
                    lookup: true,
                    streaming: true,
                    cacheable: true,
                    writes: true,
                },
            },
            {
                kind: "relationship",
                type: "DsInfo_K",
                from_label: "DsInfo_P",
                to_label: "DsInfo_P",
                mode: "statement",
                capabilities: {
                    version: 1,
                    expand: { left: true, right: true },
                    streaming: true,
                    cacheable: true,
                    writes: true,
                },
            },
        ]);
    });
});
