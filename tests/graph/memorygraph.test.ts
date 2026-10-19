import Runner from "../../src/compute/runner";
import Database from "../../src/graph/database";
import { SourceError } from "../../src/graph/source_provider";
import AsyncFunction from "../../src/parsing/functions/async_function";
import { FunctionDef } from "../../src/parsing/functions/function_metadata";
import MemoryGraph from "../../src/parsing/functions/memorygraph";

@FunctionDef({
    description: "Waits for the test to open the gate (tests only)",
    category: "async",
    parameters: [],
    output: { description: "rows", type: "object" },
})
class MgGate extends AsyncFunction {
    static started: () => void = () => undefined;
    static release: Promise<void> = Promise.resolve();
    constructor() {
        super("mggate");
    }
    public async *generate(): AsyncGenerator<any> {
        MgGate.started();
        await MgGate.release;
        yield { x: 1 };
    }
}

async function run(statement: string, parameters?: Record<string, any>) {
    const runner = new Runner(statement, null, null, { parameters });
    await runner.run();
    return runner;
}

beforeEach(async () => {
    MemoryGraph.clear();
    await run("USE GRAPH memorygraph($request)");
});

afterEach(async () => {
    await run("DROP GRAPH");
    expect(Database.getInstance().defaultGraph).toBeNull();
});

test("works out of the box for the change-request queries", async () => {
    const created = await run(
        "CREATE (p:Person {name: 'Ada'}) CREATE (x:Project {name: 'Beacon'}) " +
            "CREATE (p)-[:WORKS_ON {role: 'lead'}]->(x) RETURN p.id AS person, x.id AS project"
    );
    expect(created.results).toEqual([{ person: 1, project: 2 }]);
    expect(created.writeResult!.stats).toMatchObject({
        nodesCreated: 2,
        relationshipsCreated: 1,
        propertiesSet: 3,
    });
    const read = await run(
        "MATCH (p:Person)-[w:WORKS_ON]->(x:Project) RETURN p.name AS person, x.name AS project, w.role AS role"
    );
    expect(read.results).toEqual([{ person: "Ada", project: "Beacon", role: "lead" }]);
    const merged = await run(
        "MERGE (p:Person {name: 'Ada'}) ON MATCH SET p.title = 'Lead' RETURN p.id AS id"
    );
    expect(merged.results).toEqual([{ id: 1 }]);
    const title = await run("MATCH (p:Person) RETURN p.title AS title");
    expect(title.results).toEqual([{ title: "Lead" }]);
});

test("MERGE of nodes and relationships is idempotent", async () => {
    const m =
        "MERGE (a:Team {name: 'core'}) ON CREATE SET a.n = 1 ON MATCH SET a.n = 2 RETURN a.id AS id";
    expect((await run(m)).results).toEqual([{ id: 1 }]);
    expect((await run(m)).results).toEqual([{ id: 1 }]);
    await run("CREATE (:Person {name: 'Ada'})");
    const r = "MATCH (p:Person), (t:Team) MERGE (p)-[m:MEMBER_OF]->(t) RETURN m.id AS id";
    const first = await run(r);
    expect((await run(r)).results).toEqual(first.results);
    const counts = await run(
        "MATCH (t:Team) OPTIONAL MATCH (p)-[m:MEMBER_OF]->(t) RETURN t.n AS n, count(m) AS members"
    );
    expect(counts.results).toEqual([{ n: 2, members: 1 }]);
    expect(MemoryGraph.store().nodeCount()).toBe(2);
    expect(MemoryGraph.store().relationshipCount()).toBe(1);
});

test("reads its own writes within a query", async () => {
    const r = await run("CREATE (n:V {k: 1}) WITH n MATCH (m:V) RETURN count(m) AS c");
    expect(r.results).toEqual([{ c: 1 }]);
});

test("a failing query leaves the store unchanged", async () => {
    await run("CREATE (:D {k: 1})-[:L]->(:D {k: 2})");
    await expect(run("MATCH (a:D {k: 1}) CREATE (:D {k: 3}) DELETE a")).rejects.toThrow(
        /still has relationships/
    );
    expect((await run("MATCH (n:D) RETURN n.k AS k ORDER BY k")).results).toEqual([
        { k: 1 },
        { k: 2 },
    ]);
    await run("MATCH (n) DETACH DELETE n");
    expect(MemoryGraph.store().nodeCount()).toBe(0);
    expect(MemoryGraph.store().relationshipCount()).toBe(0);
});

test("unlabelled and multi-label nodes, label and property updates", async () => {
    await run("CREATE (a {name: 'free'}), (b:Person:Employee {name: 'Bo'}), (a)-[:LINKS]->(b)");
    expect(
        (await run("MATCH (n) RETURN n.name AS name, labels(n) AS labels ORDER BY name")).results
    ).toEqual([
        { name: "Bo", labels: ["Person", "Employee"] },
        { name: "free", labels: [] },
    ]);
    await run("MATCH (n:Person:Employee) SET n:Manager, n.level = 3 REMOVE n:Employee");
    const after = await run(
        "MATCH (a)-[r]->(b:Manager) RETURN a.name AS a, type(r) AS t, labels(b) AS labels, properties(b) AS props"
    );
    expect(after.results).toEqual([
        { a: "free", t: "LINKS", labels: ["Person", "Manager"], props: { name: "Bo", level: 3 } },
    ]);
    await run("MATCH (n:Manager) SET n = {name: 'Bea'}");
    expect((await run("MATCH (n:Manager) RETURN properties(n) AS p")).results).toEqual([
        { p: { name: "Bea" } },
    ]);
});

test("parallel relationships keep their identity", async () => {
    await run("CREATE (a:P), (b:P), (a)-[:R {n: 1}]->(b), (a)-[:R {n: 2}]->(b)");
    await run("MATCH (:P)-[r:R {n: 1}]->(:P) DELETE r");
    expect((await run("MATCH (:P)-[r:R]->(:P) RETURN r.n AS n")).results).toEqual([{ n: 2 }]);
});

test("named stores are separate", async () => {
    await run("CREATE (:Item {name: 'default'})");
    await run("USE GRAPH memorygraph($request, 'scratch')");
    await run("CREATE (:Item {name: 'scratch'})");
    expect((await run("MATCH (n:Item) RETURN n.name AS name")).results).toEqual([
        { name: "scratch" },
    ]);
    expect(MemoryGraph.store("default").nodeCount()).toBe(1);
    expect(MemoryGraph.store("scratch").nodeCount()).toBe(1);
});

test("a commit after a concurrent commit to the same store fails", async () => {
    let open!: () => void;
    MgGate.release = new Promise<void>((resolve) => (open = resolve));
    const started = new Promise<void>((resolve) => (MgGate.started = resolve));
    const slow = run("CREATE (n:A) WITH n LOAD JSON FROM mggate() AS g RETURN n.id AS id");
    await started;
    await run("CREATE (:B)");
    open();
    await expect(slow).rejects.toThrow(SourceError);
    await expect(slow).rejects.toThrow(/was changed by another query/);
    expect((await run("MATCH (n) RETURN labels(n) AS l")).results).toEqual([{ l: ["B"] }]);
});

test("writes stay with the binding they were routed to", async () => {
    await expect(run("USE GRAPH memorygraph($request, 'b') CREATE (n:Foo)")).rejects.toThrow(
        "USE GRAPH and DROP GRAPH cannot be combined with write clauses in one statement"
    );
    await expect(
        run("CREATE (n:Foo); USE GRAPH memorygraph($request, 'd'); CREATE (m:Bar)")
    ).rejects.toThrow(
        `A query can only write through one backend function (default graph memorygraph and default graph memorygraph("d"))`
    );
    expect(MemoryGraph.store("default").nodeCount()).toBe(0);
    expect(MemoryGraph.store("d").nodeCount()).toBe(0);
    await run("USE GRAPH memorygraph($request, 'e'); CREATE (m:Bar)");
    expect(MemoryGraph.store("e").nodeCount()).toBe(1);
});

test("is only usable as the default graph", async () => {
    await run(
        "CREATE VIRTUAL (:MgDef) AS { LOAD JSON FROM memorygraph($request) AS n RETURN n.id AS id }"
    );
    try {
        await expect(run("MATCH (n:MgDef) RETURN n")).rejects.toThrow(
            /bind it with USE GRAPH memorygraph/
        );
    } finally {
        await run("DELETE VIRTUAL (:MgDef)");
    }
});
