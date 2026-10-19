import Runner from "../../src/compute/runner";
import Database from "../../src/graph/database";
import { QueryCancelledError, SourceError } from "../../src/graph/source_provider";
import AsyncFunction from "../../src/parsing/functions/async_function";
import { FunctionDef } from "../../src/parsing/functions/function_metadata";
import { MockBackend, mock } from "./mock_backend";

@FunctionDef({
    description: "Read-only mock graph backend (tests only)",
    category: "async",
    parameters: [],
    output: { description: "rows", type: "object" },
})
class MockReadOnlyBackend extends MockBackend {
    static capabilities: any = { lookup: true, expand: true, predicates: true };
    constructor() {
        super("mockreadonlybackend");
    }
}

@FunctionDef({
    description: "Mock graph backend that only scans (tests only)",
    category: "async",
    parameters: [],
    output: { description: "rows", type: "object" },
})
class MockScanBackend extends MockBackend {
    static capabilities: any = { writes: true };
    constructor() {
        super("mockscanbackend");
    }
}

@FunctionDef({
    description: "Waits for the test to open the gate (tests only)",
    category: "async",
    parameters: [],
    output: { description: "rows", type: "object" },
})
class DgGate extends AsyncFunction {
    static started: () => void = () => undefined;
    static release: Promise<void> = Promise.resolve();
    constructor() {
        super("dggate");
    }
    public async *generate(): AsyncGenerator<any> {
        DgGate.started();
        await DgGate.release;
        yield { x: 1 };
    }
}

@FunctionDef({
    description: "Blocks until the query signal aborts (tests only)",
    category: "async",
    parameters: [],
    output: { description: "rows", type: "object" },
})
class DgBlock extends AsyncFunction {
    static started: () => void = () => undefined;
    constructor() {
        super("dgblock");
    }
    public async *generate(): AsyncGenerator<any> {
        const signal = this.context!.signal;
        DgBlock.started();
        await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve()));
        yield { x: 1 };
    }
}

async function run(statement: string, parameters?: Record<string, any>, sources?: any) {
    const runner = new Runner(statement, null, null, { parameters, sources });
    await runner.run();
    return runner;
}

const BIND = "USE GRAPH mockbackend($request)";

const last = <T>(items: T[]): T => items[items.length - 1];

beforeEach(async () => {
    mock.clear();
    mock.reset();
    await run("DROP GRAPH");
});

afterEach(async () => {
    await run("DROP GRAPH");
    expect(Database.getInstance().defaultGraph).toBeNull();
});

describe("1. binding an empty backend", () => {
    test("CREATE and MATCH never-seen labels and types without definitions", async () => {
        await run(BIND);
        expect(mock.log).toEqual([]);
        const created = await run(
            "CREATE (p:Person {name: 'Ada'}) CREATE (x:Project {name: 'Beacon'}) " +
                "CREATE (p)-[:WORKS_ON {role: 'lead'}]->(x) RETURN p.id AS person, x.id AS project"
        );
        const { person, project } = created.results[0];
        expect(typeof person).toBe("number");
        expect(typeof project).toBe("number");
        expect(mock.requests.map((r) => [r.operation, r.graph])).toEqual([["write", true]]);
        expect(mock.changeSets).toEqual([
            [
                { op: "createNode", ref: "$1", labels: ["Person"], properties: { name: "Ada" } },
                {
                    op: "createNode",
                    ref: "$2",
                    labels: ["Project"],
                    properties: { name: "Beacon" },
                },
                {
                    op: "createRelationship",
                    ref: "$3",
                    type: "WORKS_ON",
                    start: "$1",
                    end: "$2",
                    properties: { role: "lead" },
                },
            ],
        ]);
        const read = await run(
            "MATCH (p:Person)-[w:WORKS_ON]->(x:Project) RETURN p.name AS person, x.name AS project, w.role AS role, p.id AS pid"
        );
        expect(read.results).toEqual([
            { person: "Ada", project: "Beacon", role: "lead", pid: person },
        ]);
        const other = await run("MATCH (n:Nobody) RETURN n");
        expect(other.results).toEqual([]);
        const noType = await run("MATCH ()-[r:NOPE]->() RETURN r");
        expect(noType.results).toEqual([]);
    });

    test("a multi-statement query can bind and then write", async () => {
        await run(`${BIND}; CREATE (n:Q {k: 1})`);
        expect(mock.graphNodes()).toEqual([{ id: 1000, labels: ["Q"], properties: { k: 1 } }]);
    });

    test("returned entities carry no internal keys", async () => {
        await run(BIND);
        await run("CREATE (a:A {name: 'a'})-[:R {w: 1}]->(b:B {name: 'b'})");
        const r = await run("MATCH (a:A)-[r:R]->(b) RETURN a, r, b, collect(a) AS all");
        const row = r.results[0];
        expect(row.a).toEqual({ name: "a", id: 1000 });
        expect(row.b).toEqual({ name: "b", id: 1001 });
        expect(row.r).toEqual({
            w: 1,
            id: 1002,
            type: "R",
            startNode: { name: "a", id: 1000 },
            endNode: { name: "b", id: 1001 },
            properties: { w: 1 },
        });
        expect(row.all).toEqual([{ name: "a", id: 1000 }]);
    });
});

describe("2. MERGE", () => {
    const merge =
        "MERGE (p:Person {name: 'Ada'}) ON CREATE SET p.created = true ON MATCH SET p.title = 'Lead' RETURN p.id AS id";

    test("repeated MERGE keeps one node with stable identity", async () => {
        await run(BIND);
        const first = await run(merge);
        const second = await run(merge);
        expect(second.results).toEqual(first.results);
        expect(mock.changeSets[0]).toEqual([
            {
                op: "mergeNode",
                ref: "$1",
                label: "Person",
                labels: ["Person"],
                key: { name: "Ada" },
                onCreate: { created: true },
                onMatch: { title: "Lead" },
            },
        ]);
        expect(mock.graphNodes()).toEqual([
            {
                id: first.results[0].id,
                labels: ["Person"],
                properties: { name: "Ada", created: true, title: "Lead" },
            },
        ]);
    });

    test("multi-label MERGE matches on every label", async () => {
        await run(BIND);
        await run("MERGE (p:Person:Admin {name: 'Ada'})");
        await run("MERGE (p:Person {name: 'Ada'})");
        await run("MERGE (p:Admin:Person {name: 'Ada'})");
        expect(mock.graphNodes().map((n) => n.labels)).toEqual([["Person", "Admin"]]);
        await expect(run("MERGE (p {name: 'Ada'})")).rejects.toThrow(
            "MERGE of a node requires at least one label"
        );
    });

    test("repeated relationship MERGE keeps one edge", async () => {
        await run(BIND);
        await run("CREATE (:Person {name: 'Ada'}), (:Project {name: 'Beacon'})");
        const m =
            "MATCH (a:Person {name: 'Ada'}), (b:Project {name: 'Beacon'}) MERGE (a)-[r:WORKS_ON]->(b) ON MATCH SET r.again = true RETURN r.id AS id";
        const first = await run(m);
        const second = await run(m);
        expect(second.results).toEqual(first.results);
        expect(mock.graphRelationships()).toEqual([
            {
                id: first.results[0].id,
                type: "WORKS_ON",
                left_id: 1000,
                right_id: 1001,
                properties: { again: true },
            },
        ]);
    });

    test("a failing change set is rolled back as a whole", async () => {
        await run(BIND);
        await run("CREATE (:Person {name: 'Ada'})-[:WORKS_ON]->(:Project {name: 'Beacon'})");
        await expect(
            run("MERGE (z:Person {name: 'Zed'}) WITH z MATCH (a:Person {name: 'Ada'}) DELETE a")
        ).rejects.toThrow(/still has relationships/);
        const names = await run("MATCH (p:Person) RETURN p.name AS name");
        expect(names.results).toEqual([{ name: "Ada" }]);
    });
});

describe("3. schema-free properties", () => {
    test("new and reserved-looking properties are queryable immediately", async () => {
        await run(BIND);
        await run("CREATE (:Thing {name: 'a'}), (:Thing {name: 'b'})");
        await run(
            "MATCH (n:Thing {name: 'a'}) SET n.`odd key` = $v, n.labels = 'L', n.type = 'T', n.left_id = 7, n.right_id = 8, n.id = 'user-id'",
            { v: 42 }
        );
        const r = await run(
            "MATCH (n:Thing) WHERE n.`odd key` = $v RETURN n.name AS name, n.`odd key` AS odd, n.labels AS labels, n.type AS type, n.left_id AS l, n.id AS id, properties(n) AS props, labels(n) AS lbls",
            { v: 42 }
        );
        expect(r.results).toEqual([
            {
                name: "a",
                odd: 42,
                labels: "L",
                type: "T",
                l: 7,
                id: 1000,
                props: {
                    name: "a",
                    "odd key": 42,
                    labels: "L",
                    type: "T",
                    left_id: 7,
                    right_id: 8,
                    id: "user-id",
                },
                lbls: ["Thing"],
            },
        ]);
        expect(last(mock.requests).predicate).toEqual({
            op: "eq",
            property: "odd key",
            value: 42,
        });
        const missing = await run(
            "MATCH (n:Thing) RETURN n.name AS name, n.`odd key` AS odd ORDER BY name"
        );
        expect(missing.results).toEqual([
            { name: "a", odd: 42 },
            { name: "b", odd: null },
        ]);
    });

    test("relationship metadata and user properties stay apart", async () => {
        await run(BIND);
        await run("CREATE (a:A)-[r:REL {type: 'x', left_id: 5, id: 'u', w: 1}]->(b:B)");
        const r = await run(
            "MATCH (:A)-[r:REL]->(:B) RETURN type(r) AS t, r.type AS rt, r.w AS w, r.left_id AS l, properties(r) AS p"
        );
        expect(r.results).toEqual([
            { t: "REL", rt: "REL", w: 1, l: 5, p: { type: "x", left_id: 5, id: "u", w: 1 } },
        ]);
        const missing = await run("MATCH (:A)-[r:REL {nope: 1}]->(:B) RETURN r");
        expect(missing.results).toEqual([]);
        const absent = await run("MATCH (:A)-[r:REL]->(:B) RETURN r.nope AS nope");
        expect(absent.results).toEqual([{ nope: null }]);
    });
});

describe("4. unlabelled and multi-label nodes", () => {
    test("create and read them, and match without label or type", async () => {
        await run(BIND);
        await run("CREATE (a {name: 'free'}), (b:Person:Employee {name: 'Bo'}), (a)-[:LINKS]->(b)");
        expect(mock.changeSets[0][0]).toEqual({
            op: "createNode",
            ref: "$1",
            labels: [],
            properties: { name: "free" },
        });
        expect(mock.changeSets[0][1].labels).toEqual(["Person", "Employee"]);
        const all = await run("MATCH (n) RETURN n.name AS name, labels(n) AS labels ORDER BY name");
        expect(all.results).toEqual([
            { name: "Bo", labels: ["Person", "Employee"] },
            { name: "free", labels: [] },
        ]);
        for (const pattern of ["(n:Person:Employee)", "(n:Employee:Person)", "(n:Employee)"]) {
            const r = await run(`MATCH ${pattern} RETURN n.name AS name`);
            expect(r.results).toEqual([{ name: "Bo" }]);
        }
        expect((await run("MATCH (n:Person:Manager) RETURN n")).results).toEqual([]);
        expect((await run("MATCH (n:Manager|Employee) RETURN n.name AS name")).results).toEqual([
            { name: "Bo" },
        ]);
        const untyped = await run(
            "MATCH (a)-[r]->(b) RETURN a.name AS a, type(r) AS t, b.name AS b, labels(b) AS lb"
        );
        expect(untyped.results).toEqual([
            { a: "free", t: "LINKS", b: "Bo", lb: ["Person", "Employee"] },
        ]);
    });

    test("multi-label patterns without a default graph are rejected", async () => {
        await expect(run("MATCH (n:Person:Employee) RETURN n")).rejects.toThrow(
            /requires every label/
        );
        await expect(run("CREATE (n:Person:Employee)")).rejects.toThrow(
            "CREATE requires exactly one label for each new node"
        );
    });
});

describe("5. parallel relationships", () => {
    test("mutate and delete one of several parallel edges by id", async () => {
        await run(BIND);
        await run(
            "CREATE (a:P {name: 'a'}), (b:P {name: 'b'}), (a)-[:R {n: 1}]->(b), (a)-[:R {n: 2}]->(b)"
        );
        const read = await run(
            "MATCH (a:P {name: 'a'})-[r:R]->(b:P) RETURN r.n AS n, a.name AS a, b.name AS b ORDER BY n"
        );
        expect(read.results).toEqual([
            { n: 1, a: "a", b: "b" },
            { n: 2, a: "a", b: "b" },
        ]);
        const pairs = await run(
            "MATCH (a:P)-[r1:R]->(b:P), (a)-[r2:R]->(b) RETURN r1.n AS x, r2.n AS y ORDER BY x"
        );
        expect(pairs.results).toEqual([
            { x: 1, y: 2 },
            { x: 2, y: 1 },
        ]);
        const [one, two] = mock.graphRelationships();
        await run("MATCH (:P)-[r:R {n: 1}]->(:P) SET r.n = 10");
        expect(last(mock.changeSets)).toEqual([
            { op: "setProperties", target: one.id, type: "R", properties: { n: 10 } },
        ]);
        await run("MATCH ()-[r {n: 2}]->() DELETE r");
        expect(last(mock.changeSets)).toEqual([
            { op: "deleteRelationship", target: two.id, type: "R" },
        ]);
        const after = await run("MATCH (:P)-[r:R]->(:P) RETURN r.n AS n");
        expect(after.results).toEqual([{ n: 10 }]);
    });
});

describe("6. updates and deletes", () => {
    test("SET / REMOVE properties and labels, replace properties", async () => {
        await run(BIND);
        await run("CREATE (:Item {name: 'x', a: 1, b: 2})");
        const set = await run(
            "MATCH (n:Item) SET n:Tagged, n.c = 3 REMOVE n.a RETURN labels(n) AS labels, properties(n) AS props"
        );
        expect(set.results).toEqual([
            { labels: ["Item", "Tagged"], props: { name: "x", b: 2, c: 3 } },
        ]);
        const removed = await run("MATCH (n:Item:Tagged) REMOVE n:Item RETURN labels(n) AS labels");
        expect(removed.results).toEqual([{ labels: ["Tagged"] }]);
        const replaced = await run(
            "MATCH (n:Tagged) SET n = {name: 'y'} RETURN properties(n) AS props, n.b AS b"
        );
        expect(replaced.results).toEqual([{ props: { name: "y" }, b: null }]);
        expect(mock.graphNodes()).toEqual([
            { id: 1000, labels: ["Tagged"], properties: { name: "y" } },
        ]);
    });

    test("DELETE of a connected node rolls back; DETACH DELETE succeeds; repeats are sent once", async () => {
        await run(BIND);
        await run("CREATE (a:D {k: 1})-[:L]->(b:D {k: 2})");
        await expect(run("MATCH (a:D {k: 1}) CREATE (c:D {k: 3}) DELETE a")).rejects.toThrow(
            SourceError
        );
        expect(mock.graphNodes().map((n) => n.properties.k)).toEqual([1, 2]);
        const detached = await run("MATCH (a:D {k: 1}) UNWIND [1, 2] AS i DETACH DELETE a");
        expect(last(mock.changeSets)).toEqual([
            { op: "deleteNode", target: 1000, label: "D", detach: true },
        ]);
        expect(detached.writeResult!.stats).toMatchObject({
            nodesDeleted: 1,
            relationshipsDeleted: 1,
        });
        expect(mock.graphNodes().map((n) => n.properties.k)).toEqual([2]);
        expect(mock.graphRelationships()).toEqual([]);
    });
});

describe("7. definitions take precedence", () => {
    afterEach(async () => {
        for (const label of ["Curated", "Locked", "Filtered"]) {
            await run(`DELETE VIRTUAL (:${label})`);
        }
    });

    test("projections, filters and read-only status are not bypassed", async () => {
        mock.addNodes("Curated", [{ id: 1, name: "c1", secret: "s" }]);
        mock.addNodes("Locked", [{ id: 2, name: "l1" }]);
        mock.addNodes("Filtered", [
            { id: 3, name: "shown", visible: true },
            { id: 4, name: "hidden", visible: false },
        ]);
        await run(
            "CREATE VIRTUAL (:Curated) AS { LOAD JSON FROM mockbackend($request) AS n RETURN n.id AS id, n.name AS name }"
        );
        await run(
            "CREATE VIRTUAL (:Locked) WITH CAPABILITIES {writes: false} AS { LOAD JSON FROM mockbackend($request) AS n RETURN n.id AS id, n.name AS name }"
        );
        await run(
            "CREATE VIRTUAL (:Filtered) AS { LOAD JSON FROM mockbackend($request) AS n WITH n WHERE n.visible = true RETURN n.id AS id, n.name AS name }"
        );
        await run(BIND);
        await run("CREATE (:Free {name: 'f', secret: 'mine'})");

        expect((await run("MATCH (n:Curated) RETURN n")).results).toEqual([
            { n: { id: 1, name: "c1" } },
        ]);
        const all = await run(
            "MATCH (n) RETURN n.name AS name, coalesce(n.secret, '-') AS secret ORDER BY name"
        );
        expect(all.results).toEqual([
            { name: "c1", secret: "-" },
            { name: "f", secret: "mine" },
            { name: "l1", secret: "-" },
            { name: "shown", secret: "-" },
        ]);
        expect((await run("MATCH (n:Filtered) RETURN n.name AS name")).results).toEqual([
            { name: "shown" },
        ]);
        expect(
            (await run("MATCH (n) WHERE n.name = 'hidden' RETURN n.name AS name")).results
        ).toEqual([]);

        mock.reset();
        await expect(run("MATCH (n:Locked) SET n.x = 1")).rejects.toThrow(
            "Cannot write to (:Locked): its definition does not declare the writes capability"
        );
        await expect(run("CREATE (n:Locked {x: 1})")).rejects.toThrow(
            "Cannot write to (:Locked): its definition does not declare the writes capability"
        );
        await expect(run("CREATE (n:Locked:Extra {x: 1})")).rejects.toThrow(
            /cannot be combined with other labels/
        );
        await expect(run("MATCH (n:Free) SET n:Locked")).rejects.toThrow(
            /Cannot add label :Locked to a default-graph node/
        );
        await expect(
            run("MATCH (n:Free) SET n.x = 1 WITH n MATCH (c:Curated) SET c.x = 1")
        ).rejects.toThrow(
            /only write through one backend function \(default graph mockbackend and mockbackend\)/
        );
        await expect(run("MATCH (c:Curated), (f:Free) CREATE (c)-[:OWNS]->(f)")).rejects.toThrow(
            /an endpoint is not a default-graph node/
        );
        expect(mock.changeSets).toEqual([]);
    });
});

describe("7b. ids never join across graphs", () => {
    afterEach(async () => {
        await run("DELETE VIRTUAL (:Eager)-[:EREL]-(:Eager)");
        await run("DELETE VIRTUAL (:Eager)");
    });

    test("eager definitions and the default graph share coincidental ids safely", async () => {
        await run(
            "CREATE VIRTUAL (:Eager) AS { UNWIND [{id: 1000, name: 'imposter'}] AS r RETURN r.id AS id, r.name AS name }"
        );
        await run(
            "CREATE VIRTUAL (:Eager)-[:EREL]-(:Eager) AS { UNWIND [{left_id: 1000, right_id: 1000}] AS r RETURN r.left_id AS left_id, r.right_id AS right_id }"
        );
        await run(BIND);
        await run("CREATE (a:Src {name: 'a'})-[:LINK]->(b:Dst {name: 'b'})");
        expect(mock.graphNodes().map((n) => n.id)).toEqual([1000, 1001]);

        const all = await run("MATCH (n) RETURN n.name AS name ORDER BY name");
        expect(all.results).toEqual([{ name: "a" }, { name: "b" }, { name: "imposter" }]);
        const viaDefault = await run("MATCH (x)-[:LINK]->(y) RETURN x.name AS x, y.name AS y");
        expect(viaDefault.results).toEqual([{ x: "a", y: "b" }]);
        const viaDefinition = await run("MATCH (x)-[:EREL]->(y) RETURN x.name AS x, y.name AS y");
        expect(viaDefinition.results).toEqual([{ x: "imposter", y: "imposter" }]);
        const untyped = await run("MATCH (x)-[r]->(y) RETURN x.name AS x, y.name AS y ORDER BY x");
        expect(untyped.results).toEqual([
            { x: "a", y: "b" },
            { x: "imposter", y: "imposter" },
        ]);
        const traced = new Runner("MATCH (x:Src)-[:LINK]->(y) RETURN y.name AS y", null, null, {
            provenance: true,
        });
        await traced.run();
        expect(traced.results).toEqual([{ y: "b" }]);
    });
});

test("a reused default-graph relationship variable keeps its graph", async () => {
    await run(
        "CREATE VIRTUAL (:Twin) AS { UNWIND [{id: 1001, name: 'twin'}] AS r RETURN r.id AS id, r.name AS name }"
    );
    try {
        await run(BIND);
        await run("CREATE (a:G {name: 'g1'})-[:R]->(b:G {name: 'g2'})");
        const r = await run(
            "MATCH (a:G)-[r:R]->(b) MATCH (x)-[r]->(y) RETURN DISTINCT y.name AS y"
        );
        expect(r.results).toEqual([{ y: "g2" }]);
    } finally {
        await run("DELETE VIRTUAL (:Twin)");
    }
});

describe("8. unbound and read-only behavior", () => {
    test("without a binding the v1.0.90 errors are unchanged", async () => {
        await expect(
            run("CREATE (n:UndeclaredProbe {name: 'Ada'}) RETURN n.id AS id")
        ).rejects.toThrow(
            "Cannot write to (:UndeclaredProbe): it has no CREATE VIRTUAL definition"
        );
        await expect(
            run("MERGE (n:UndeclaredProbe {name: 'Ada'}) RETURN n.id AS id")
        ).rejects.toThrow(
            "Cannot write to (:UndeclaredProbe): it has no CREATE VIRTUAL definition"
        );
        await expect(run("CREATE ()-[:UNDECLARED_PROBE]->()")).rejects.toThrow(
            "CREATE requires exactly one label for each new node"
        );
        await expect(run("MATCH (n:UndeclaredProbe) RETURN n")).rejects.toThrow(
            "Physical node not found for label UndeclaredProbe"
        );
        expect(mock.log).toEqual([]);
    });

    test("deletes of different definition entities sharing an id are all sent", async () => {
        mock.addNodes("DelA", [{ id: 1, name: "a" }]);
        mock.addNodes("DelB", [{ id: 1, name: "b" }]);
        await run(
            "CREATE VIRTUAL (:DelA) AS { LOAD JSON FROM mockbackend($request) AS n RETURN n.id AS id, n.name AS name }"
        );
        await run(
            "CREATE VIRTUAL (:DelB) AS { LOAD JSON FROM mockbackend($request) AS n RETURN n.id AS id, n.name AS name }"
        );
        try {
            await run("MATCH (a:DelA), (b:DelB) DELETE a, b");
            expect(mock.changeSets).toEqual([
                [
                    { op: "deleteNode", target: 1, label: "DelA", detach: false },
                    { op: "deleteNode", target: 1, label: "DelB", detach: false },
                ],
            ]);
        } finally {
            await run("DELETE VIRTUAL (:DelA)");
            await run("DELETE VIRTUAL (:DelB)");
        }
    });

    test("a read-only backend is readable but rejects writes", async () => {
        mock.store.place({ id: 5, labels: new Set(), properties: { name: "r" } }, "Seen");
        await run("USE GRAPH mockreadonlybackend($request)");
        expect((await run("MATCH (n:Seen) RETURN n.name AS name")).results).toEqual([
            { name: "r" },
        ]);
        await expect(run("CREATE (n:X {name: 'x'})")).rejects.toThrow(
            "Cannot write to (:X): the default graph backend mockreadonlybackend does not declare the writes capability"
        );
        await expect(run("MATCH (n) SET n.x = 1")).rejects.toThrow(
            /does not declare the writes capability/
        );
        expect(mock.changeSets).toEqual([]);
    });

    test("writes to two backends fail before any backend applies changes", async () => {
        await run(
            "CREATE VIRTUAL (:TxDef) AS { LOAD JSON FROM mocktxbackend($request) AS n RETURN n.id AS id, n.name AS name }"
        );
        try {
            await run(BIND);
            await expect(
                run("CREATE (a:TxDef {name: 'd'}) CREATE (b:Free {name: 'f'})")
            ).rejects.toThrow(
                "A query can only write through one backend function (mocktxbackend and default graph mockbackend)"
            );
            expect(mock.log).toEqual([]);
            mock.addNodes("TxDef", [{ id: 1, name: "d" }]);
            await run("CREATE (:Free {name: 'f'})");
            mock.reset();
            // Unlabelled targets are routed per row: rejected when a row
            // comes from the other backend, before anything is sent.
            await expect(run("MATCH (n) SET n.touched = true")).rejects.toThrow(
                /only write through one backend function/
            );
            expect(mock.changeSets).toEqual([]);
            expect(mock.commits + mock.rollbacks).toBe(0);
        } finally {
            await run("DELETE VIRTUAL (:TxDef)");
        }
    });
});

describe("9. query lifecycle", () => {
    test("one query context and one atomic write per query", async () => {
        await run(BIND);
        await run("CREATE (:Person {name: 'Ada'})");
        mock.reset();
        await run(
            "MATCH (p:Person) UNWIND range(1, 3) AS i CREATE (q:Person {name: p.name + i})-[:CHILD]->(p)"
        );
        expect(mock.opened).toBe(1);
        expect(mock.closed).toBe(1);
        expect(new Set(mock.log.map((e) => e.snapshot)).size).toBe(1);
        expect(new Set(mock.log.map((e) => e.signal)).size).toBe(1);
        expect(mock.changeSets.length).toBe(1);
        expect(mock.changeSets[0].length).toBe(6);
        expect(mock.commits).toBe(0);
    });

    test("writes become visible when the query ends", async () => {
        await run(BIND);
        const r = await run("CREATE (n:V {k: 1}) WITH n MATCH (m:V) RETURN count(m) AS c");
        expect(r.results).toEqual([{ c: 0 }]);
        expect((await run("MATCH (m:V) RETURN count(m) AS c")).results).toEqual([{ c: 1 }]);
    });

    test("a failed or cancelled query applies nothing and closes its context", async () => {
        await run(BIND);
        mock.failOn = "scan";
        await expect(run("CREATE (n:F {k: 1}) WITH n MATCH (m:F) RETURN m")).rejects.toThrow(
            SourceError
        );
        mock.failOn = null;
        expect(mock.changeSets).toEqual([]);

        const started = new Promise<void>((resolve) => (DgBlock.started = resolve));
        const runner = new Runner(
            "CREATE (n:F {k: 2}) WITH n LOAD JSON FROM dgblock() AS x RETURN x"
        );
        const done = runner.run();
        await started;
        runner.cancel();
        await expect(done).rejects.toThrow(QueryCancelledError);
        expect(mock.changeSets).toEqual([]);
        expect(mock.closed).toBe(mock.opened);
        expect(mock.graphNodes()).toEqual([]);
    });

    test("transactions: true reads its own writes and commits or rolls back", async () => {
        await run("USE GRAPH mocktxbackend($request)");
        const r = await run(
            "CREATE (n:T {k: 1}) WITH n MATCH (m:T) RETURN count(m) AS c, n.id AS id"
        );
        expect(r.results).toEqual([{ c: 1, id: 1000 }]);
        expect(mock.commits).toBe(1);
        expect(mock.requests.find((q) => q.operation === "commit")).toEqual({
            version: 1,
            graph: true,
            operation: "commit",
        });
        mock.reset();
        mock.failOn = "commit";
        await expect(run("CREATE (n:T {k: 2})")).rejects.toThrow(SourceError);
        expect(mock.rollbacks).toBe(1);
        expect(mock.graphNodes().map((n) => n.properties.k)).toEqual([1]);
    });
});

describe("10. optimizations and fallbacks", () => {
    async function seedPeople(): Promise<void> {
        await run("UNWIND range(1, 30) AS i CREATE (:Person {name: 'p' + i, age: i})");
        await run(
            "MATCH (a:Person {name: 'p1'}), (b:Person) WHERE b.age <= 3 AND b.age > 1 CREATE (a)-[:KNOWS]->(b)"
        );
        mock.reset();
    }

    test("lookup, expand, predicate and LIMIT push-down when declared", async () => {
        await run(BIND);
        await seedPeople();
        const r = await run(
            "MATCH (a:Person {name: 'p1'})-[:KNOWS]->(b:Person) RETURN b.name AS name ORDER BY name"
        );
        expect(r.results).toEqual([{ name: "p2" }, { name: "p3" }]);
        expect(r.sourceStats.calls.expand).toBeGreaterThan(0);
        expect(r.sourceStats.calls.lookup).toBeGreaterThan(0);
        expect(mock.requests[0]).toMatchObject({
            operation: "scan",
            graph: true,
            label: "Person",
            predicate: { op: "eq", property: "name", value: "p1" },
        });
        mock.reset();
        const ranged = await run(
            "MATCH (n:Person) WHERE n.age > 28 RETURN n.name AS name ORDER BY name"
        );
        expect(ranged.results).toEqual([{ name: "p29" }, { name: "p30" }]);
        expect(mock.requests[0].predicate).toEqual({ op: "gt", property: "age", value: 28 });
        mock.reset();
        const strings = await run("MATCH (n:Person) WHERE n.name > 'p8' RETURN n.name AS name");
        expect(strings.results).toEqual([{ name: "p9" }]);
        expect(mock.requests[0].predicate).toBeNull();
        mock.reset();
        const limited = await run("MATCH (n:Person) RETURN n.name AS name LIMIT 2", undefined, {
            pageSize: 5,
        });
        expect(limited.results.length).toBe(2);
        expect(mock.yielded).toBeLessThan(30);
    });

    test("scan-only backends fall back to scans and stay correct", async () => {
        await run("USE GRAPH mockscanbackend($request)");
        await seedPeople();
        const r = await run(
            "MATCH (a:Person {name: 'p1'})-[:KNOWS]->(b:Person) RETURN b.name AS name ORDER BY name"
        );
        expect(r.results).toEqual([{ name: "p2" }, { name: "p3" }]);
        expect(new Set(mock.requests.map((q) => q.operation))).toEqual(new Set(["scan"]));
        expect(mock.requests.every((q) => q.predicate === null)).toBe(true);
        expect(r.sourceStats.fallbacks).toBeGreaterThan(0);
    });

    test("no schema enumeration or refresh requests", async () => {
        await run(BIND);
        await seedPeople();
        await run("MATCH (n)-[r]->(m) RETURN count(r) AS c");
        const operations = new Set(mock.requests.map((q) => q.operation));
        for (const op of operations) expect(["scan", "lookup", "expand"]).toContain(op);
        expect(mock.requests.every((q) => q.graph === true)).toBe(true);
    });

    test("source_capabilities() lists the binding", async () => {
        await run(BIND);
        const r = await run(
            "LOAD JSON FROM source_capabilities() AS s WITH s WHERE s.kind = 'graph' RETURN s.function AS f, s.capabilities.writes AS w, s.capabilities.expand AS e"
        );
        expect(r.results).toEqual([{ f: "mockbackend", w: true, e: { left: true, right: true } }]);
    });
});

describe("11. replacing and clearing the binding", () => {
    test("subsequent queries see the change", async () => {
        await run("USE GRAPH mockreadonlybackend($request)");
        await expect(run("CREATE (n:X)")).rejects.toThrow(/does not declare the writes capability/);
        await run(BIND);
        await run("CREATE (n:X)");
        await run("DROP GRAPH");
        await expect(run("MATCH (n:X) RETURN n")).rejects.toThrow(
            "Physical node not found for label X"
        );
        await run("DROP GRAPH");
    });

    test("a running query keeps the binding it started with", async () => {
        await run(BIND);
        await run("CREATE (:Pin {name: 'kept'})");
        let open!: () => void;
        DgGate.release = new Promise<void>((resolve) => (open = resolve));
        const started = new Promise<void>((resolve) => (DgGate.started = resolve));
        const pending = run("LOAD JSON FROM dggate() AS x MATCH (n:Pin) RETURN n.name AS name");
        await started;
        await run("DROP GRAPH");
        open();
        expect((await pending).results).toEqual([{ name: "kept" }]);
        await expect(run("MATCH (n:Pin) RETURN n")).rejects.toThrow(
            "Physical node not found for label Pin"
        );
    });

    test("USE GRAPH requires $request and an async function", async () => {
        await expect(run("USE GRAPH mockbackend()")).rejects.toThrow(/must pass \$request/);
        expect(() => new Runner("USE GRAPH nosuchfn($request)")).toThrow(
            /Expected a registered async function after USE GRAPH/
        );
        expect(Database.getInstance().defaultGraph).toBeNull();
    });

    test("use and graph remain usable as identifiers", async () => {
        const r = await run("WITH 1 AS use, 2 AS graph RETURN use + graph AS s");
        expect(r.results).toEqual([{ s: 3 }]);
    });
});
