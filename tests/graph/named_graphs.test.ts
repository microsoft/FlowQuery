import Runner from "../../src/compute/runner";
import Database from "../../src/graph/database";
import MemoryGraph from "../../src/parsing/functions/memorygraph";
import { mock } from "./mock_backend";

async function run(statement: string, parameters?: Record<string, any>) {
    const runner = new Runner(statement, null, null, { parameters });
    await runner.run();
    return runner;
}

const definitions: string[] = [];
async function define(statement: string, drop: string): Promise<void> {
    await run(statement);
    definitions.push(drop);
}

beforeEach(async () => {
    MemoryGraph.clear();
    mock.clear();
    mock.reset();
});

afterEach(async () => {
    for (const drop of definitions.splice(0).reverse()) await run(drop);
    await run("DROP GRAPH; DROP GRAPH hr; DROP GRAPH crm");
    expect(Database.getInstance().graphs.size).toBe(0);
});

describe("named graphs", () => {
    test("bind, write, read and drop a named graph", async () => {
        await run("USE GRAPH memorygraph($request); USE GRAPH hr = memorygraph($request, 'hr')");
        await expect(
            run("CREATE (:hr.Person {name: 'Ada'}), (:Person {name: 'Default'})")
        ).rejects.toThrow(
            `A query can only write through one backend function (graph hr (memorygraph("hr")) and default graph memorygraph)`
        );
        await run("CREATE (:hr.Person {name: 'Ada'})");
        await run("CREATE (:Person {name: 'Default'})");
        expect(
            (await run("MATCH (p:hr.Person) RETURN p.name AS name, labels(p) AS labels")).results
        ).toEqual([{ name: "Ada", labels: ["Person"] }]);
        expect((await run("MATCH (p:Person) RETURN p.name AS name")).results).toEqual([
            { name: "Default" },
        ]);
        expect(MemoryGraph.store("hr").nodeCount()).toBe(1);
        expect(MemoryGraph.store("default").nodeCount()).toBe(1);
        const all = await run("MATCH (n) RETURN n.name AS name ORDER BY name");
        expect(all.results).toEqual([{ name: "Ada" }, { name: "Default" }]);

        await run("DROP GRAPH hr");
        await expect(run("MATCH (p:hr.Person) RETURN p")).rejects.toThrow(
            "Graph hr is not bound; bind it with USE GRAPH hr = fn($request)"
        );
        await expect(run("CREATE (:hr.Person)")).rejects.toThrow("Graph hr is not bound");
    });

    test("requests and changes of a named graph carry graphName", async () => {
        await run("USE GRAPH hr = mockbackend($request)");
        await run("CREATE (:hr.Person {name: 'Ada'})");
        expect(mock.changeSets).toEqual([
            [
                {
                    op: "createNode",
                    ref: "$1",
                    labels: ["Person"],
                    properties: { name: "Ada" },
                    graphName: "hr",
                },
            ],
        ]);
        mock.reset();
        await run("MATCH (p:hr.Person) RETURN p");
        expect(mock.requests[0]).toMatchObject({ graph: true, graphName: "hr", label: "Person" });
    });

    test("multi-label, ORed and typed patterns in a named graph", async () => {
        await run("USE GRAPH hr = memorygraph($request)");
        await run(
            "CREATE (a:hr.Person:Manager {name: 'Ada'})-[:hr.MANAGES]->(b:hr.Person {name: 'Bo'})"
        );
        expect((await run("MATCH (m:hr.Manager:Person) RETURN m.name AS n")).results).toEqual([
            { n: "Ada" },
        ]);
        expect((await run("MATCH (m:hr.Nobody|Manager) RETURN m.name AS n")).results).toEqual([
            { n: "Ada" },
        ]);
        const r = await run(
            "MATCH (a:hr.Person)-[r:hr.MANAGES|LIKES]->(b) RETURN a.name AS a, type(r) AS t, b.name AS b"
        );
        expect(r.results).toEqual([{ a: "Ada", t: "MANAGES", b: "Bo" }]);
        // Unqualified types read the default graph, which is not bound here.
        await expect(run("MATCH (a:hr.Person)-[:MANAGES]->(b) RETURN a")).rejects.toThrow(
            "No physical relationships found for type MANAGES"
        );
    });

    test("named graphs are not shadowed by definitions; the default graph is", async () => {
        await define(
            "CREATE VIRTUAL (:Curated) AS { UNWIND [{id: 1, name: 'def'}] AS r RETURN r.id AS id, r.name AS name }",
            "DELETE VIRTUAL (:Curated)"
        );
        await run("USE GRAPH memorygraph($request); USE GRAPH hr = memorygraph($request, 'hr')");
        await run("CREATE (:hr.Curated {name: 'hr'})");
        expect((await run("MATCH (n:hr.Curated) RETURN n.name AS n")).results).toEqual([
            { n: "hr" },
        ]);
        expect((await run("MATCH (n:Curated) RETURN n.name AS n")).results).toEqual([{ n: "def" }]);
        await expect(run("CREATE (:default.Curated)")).rejects.toThrow(
            "Cannot write to (:default.Curated): (:Curated) has a CREATE VIRTUAL definition, which takes precedence over the default graph"
        );
        await run("MATCH (n:hr.Curated) SET n:Tagged");
        expect((await run("MATCH (n:hr.Tagged) RETURN n.name AS n")).results).toEqual([
            { n: "hr" },
        ]);
    });

    test("source_capabilities() lists every graph", async () => {
        await run("USE GRAPH memorygraph($request); USE GRAPH hr = mockbackend($request)");
        const r = await run(
            "LOAD JSON FROM source_capabilities() AS s WITH s WHERE s.kind = 'graph' RETURN s.name AS name, s.function AS f ORDER BY name"
        );
        expect(r.results).toEqual([
            { name: "default", f: "memorygraph" },
            { name: "hr", f: "mockbackend" },
        ]);
    });

    test("syntax errors", async () => {
        expect(() => new Runner("USE GRAPH virtual = memorygraph($request)")).toThrow(
            "'virtual' is reserved for CREATE VIRTUAL definitions and cannot name a graph"
        );
        expect(() => new Runner("MATCH (n:hr.A:crm.B) RETURN n")).toThrow(
            "Only the first label of a node can be qualified with a graph name"
        );
        expect(() => new Runner("MATCH ()-[:hr.A|crm.B]->() RETURN 1")).toThrow(
            "Only the first relationship type can be qualified with a graph name"
        );
        expect(() => new Runner("CREATE VIRTUAL (:hr.Person) AS { RETURN 1 AS id }")).toThrow(
            "CREATE VIRTUAL defines a virtual node; (:hr.Person) belongs to graph hr"
        );
        await run("USE GRAPH default = memorygraph($request)");
        expect(Database.getInstance().defaultGraph?.name).toBe("memorygraph");
    });
});

describe("relationships across graphs of one backend", () => {
    beforeEach(async () => {
        // Both graphs live in the same memorygraph store: one backend.
        await run("USE GRAPH memorygraph($request); USE GRAPH hr = memorygraph($request)");
        await run("CREATE (:hr.Employee {name: 'Ada'}), (:Person {name: 'Ada L.'})");
    });

    test("create and traverse in both directions, atomically in one change set", async () => {
        const created = await run(
            "MATCH (e:hr.Employee), (p:Person) CREATE (e)-[:hr.SAME_AS]->(p) RETURN 1"
        );
        expect(created.writeResult!.stats.relationshipsCreated).toBe(1);
        const forward = await run(
            "MATCH (e:hr.Employee)-[:hr.SAME_AS]->(p:Person) RETURN e.name AS e, p.name AS p"
        );
        expect(forward.results).toEqual([{ e: "Ada", p: "Ada L." }]);
        const backward = await run(
            "MATCH (p:Person)<-[:hr.SAME_AS]-(e) RETURN e.name AS e, labels(e) AS l"
        );
        expect(backward.results).toEqual([{ e: "Ada", l: ["Employee"] }]);
        const untyped = await run("MATCH (p:Person)<-[r]-(e) RETURN type(r) AS t");
        expect(untyped.results).toEqual([{ t: "SAME_AS" }]);
        expect(MemoryGraph.store().relationshipCount("hr")).toBe(1);
    });

    test("writes to both graphs in one query are atomic", async () => {
        await run(
            "MATCH (e:hr.Employee), (p:Person) CREATE (e)-[:hr.SAME_AS]->(p) SET e.linked = true, p.linked = true"
        );
        expect(
            (await run("MATCH (e:hr.Employee), (p:Person) RETURN e.linked AS e, p.linked AS p"))
                .results
        ).toEqual([{ e: true, p: true }]);
        await expect(
            run("CREATE (:hr.Employee {name: 'Zed'}) WITH 1 AS x MATCH (p:Person) DELETE p")
        ).rejects.toThrow(/still has relationships/);
        expect(MemoryGraph.store().nodeCount("hr")).toBe(1);
    });

    test("batched traversal through anchors of several graphs", async () => {
        await run(
            "CREATE (:hr.P {name: 'h0'}), (:hr.P {name: 'h1'}), (:hr.X {name: 'h2'}), (:hr.X {name: 'h3'}), (:D {name: 'd1'})"
        );
        await run(
            "MATCH (a:hr.P {name: 'h1'}), (b:hr.X {name: 'h2'}), (d:D), (c:hr.X {name: 'h3'}) " +
                "CREATE (a)-[:hr.KNOWS]->(b), (a)-[:hr.KNOWS]->(d), (b)-[:hr.LIKES]->(c), (d)-[:hr.LIKES]->(c)"
        );
        const r = await run(
            "MATCH (a:hr.P)-[:hr.KNOWS]->(b)-[:hr.LIKES]->(c) RETURN a.name AS a, b.name AS b, c.name AS c ORDER BY b"
        );
        expect(r.results).toEqual([
            { a: "h1", b: "d1", c: "h3" },
            { a: "h1", b: "h2", c: "h3" },
        ]);
    });

    test("referential integrity across graphs", async () => {
        await run("MATCH (e:hr.Employee), (p:Person) CREATE (e)-[:hr.SAME_AS]->(p)");
        await expect(run("MATCH (p:Person) DELETE p")).rejects.toThrow(/still has relationships/);
        await run("MATCH (p:Person) DETACH DELETE p");
        expect(MemoryGraph.store().relationshipCount()).toBe(0);
        expect(MemoryGraph.store().nodeCount("hr")).toBe(1);
    });
});

describe("relationships across backends", () => {
    beforeEach(async () => {
        // Separate stores: two backends, ids collide (both start at 1).
        await run(
            "USE GRAPH memorygraph($request); USE GRAPH hr = memorygraph($request, 'hrstore')"
        );
        await run("CREATE (:Person {name: 'p1'}), (:Person {name: 'p2'})");
        await run("CREATE (:hr.Employee {name: 'e1'}), (:hr.Employee {name: 'e2'})");
    });

    test("ids never join across graphs", async () => {
        await run(
            "MATCH (e:hr.Employee {name: 'e1'}), (p:Person {name: 'p2'}) CREATE (e)-[:hr.SAME_AS]->(p)"
        );
        const r = await run(
            "MATCH (e:hr.Employee)-[:hr.SAME_AS]->(x) RETURN e.name AS e, x.name AS x, id(e) AS eid, id(x) AS xid"
        );
        expect(r.results).toEqual([{ e: "e1", x: "p2", eid: 1, xid: 2 }]);
        const back = await run("MATCH (p:Person {name: 'p2'})<-[r]-(x) RETURN x.name AS x");
        expect(back.results).toEqual([{ x: "e1" }]);
        expect(
            (await run("MATCH (p:Person {name: 'p1'})<-[r]-(x) RETURN x.name AS x")).results
        ).toEqual([]);
    });

    test("relationships with equal ids in different graphs are distinct", async () => {
        await run(
            "MATCH (a:Person {name: 'p1'}), (b:Person {name: 'p2'}) CREATE (a)-[:KNOWS]->(b)"
        );
        await run(
            "MATCH (a:hr.Employee {name: 'e1'}), (b:hr.Employee {name: 'e2'}) CREATE (a)-[:hr.KNOWS]->(b)"
        );
        const r = await run(
            "MATCH (a:Person)-[r1:KNOWS]->(b), (x:hr.Employee)-[r2:hr.KNOWS]->(y) RETURN id(r1) AS r1, id(r2) AS r2"
        );
        expect(r.results).toEqual([{ r1: 3, r2: 3 }]);
    });

    test("one backend per query; deleting a node referenced from another backend fails", async () => {
        await expect(run("CREATE (:hr.Employee) CREATE (:Person)")).rejects.toThrow(
            "A query can only write through one backend function"
        );
        await run(
            "MATCH (e:hr.Employee {name: 'e1'}), (p:Person {name: 'p1'}) CREATE (e)-[:hr.SAME_AS]->(p)"
        );
        await expect(run("MATCH (p:Person {name: 'p1'}) DETACH DELETE p")).rejects.toThrow(
            "Cannot delete node 1: relationships stored in graph hr (memorygraph) still reference it; delete them first in a separate query"
        );
        await run("MATCH (p:Person {name: 'p2'}) DETACH DELETE p");
        await run("MATCH (:hr.Employee)-[r:hr.SAME_AS]->() DELETE r");
        await run("MATCH (p:Person {name: 'p1'}) DETACH DELETE p");
        expect(MemoryGraph.store().nodeCount()).toBe(0);
    });
});

describe("definitions and graphs", () => {
    test("relationship definitions may end in a graph", async () => {
        await define(
            "CREATE VIRTUAL (:Badge) AS { UNWIND [{id: 1, code: 'B1'}, {id: 2, code: 'B2'}] AS r RETURN r.id AS id, r.code AS code }",
            "DELETE VIRTUAL (:Badge)"
        );
        await define(
            "CREATE VIRTUAL (:Badge)-[:ISSUED_TO]-(:Person) AS { UNWIND [{left_id: 1, right_id: 2}] AS r RETURN r.left_id AS left_id, r.right_id AS right_id }",
            "DELETE VIRTUAL (:Badge)-[:ISSUED_TO]-(:Person)"
        );
        await define(
            "CREATE VIRTUAL (:Badge)-[:HR_RECORD]-(:hr.Employee) AS { UNWIND [{left_id: 2, right_id: 1}] AS r RETURN r.left_id AS left_id, r.right_id AS right_id }",
            "DELETE VIRTUAL (:Badge)-[:HR_RECORD]-(:hr.Employee)"
        );
        await run(
            "USE GRAPH memorygraph($request); USE GRAPH hr = memorygraph($request, 'hrstore')"
        );
        await run("CREATE (:Person {name: 'p1'}), (:Person {name: 'p2'})");
        await run("CREATE (:hr.Employee {name: 'e1'})");
        const issued = await run(
            "MATCH (b:Badge)-[:ISSUED_TO]->(p:Person) RETURN b.code AS b, p.name AS p"
        );
        expect(issued.results).toEqual([{ b: "B1", p: "p2" }]);
        const reverse = await run(
            "MATCH (p:Person)<-[:ISSUED_TO]-(b) RETURN b.code AS b, p.name AS p"
        );
        expect(reverse.results).toEqual([{ b: "B1", p: "p2" }]);
        const hr = await run(
            "MATCH (b:Badge)-[:HR_RECORD]->(e:hr.Employee) RETURN b.code AS b, e.name AS e"
        );
        expect(hr.results).toEqual([{ b: "B2", e: "e1" }]);
        // Badge 1 and person 1 share an id but never join.
        expect(
            (await run("MATCH (b:Badge {id: 1})-[:ISSUED_TO]->(x) RETURN x.name AS x")).results
        ).toEqual([{ x: "p2" }]);
    });

    test("writable relationship definitions record graph endpoints", async () => {
        mock.addNodes("WEmployee", [{ id: 1, name: "emp" }]);
        await define(
            "CREATE VIRTUAL (:WEmployee) AS { LOAD JSON FROM mockbackend($request) AS n RETURN n.id AS id, n.name AS name }",
            "DELETE VIRTUAL (:WEmployee)"
        );
        await define(
            "CREATE VIRTUAL (:WEmployee)-[:IS_PERSON]-(:Person) AS { LOAD JSON FROM mockbackend($request) AS r RETURN r.id AS id, r.left_id AS left_id, r.right_id AS right_id }",
            "DELETE VIRTUAL (:WEmployee)-[:IS_PERSON]-(:Person)"
        );
        await run("USE GRAPH mockbackend($request)");
        await run("CREATE (:Person {name: 'Ada'})");
        mock.reset();
        await run("MATCH (e:WEmployee), (p:Person) CREATE (e)-[:IS_PERSON]->(p)");
        expect(mock.changeSets).toEqual([
            [
                {
                    op: "createRelationship",
                    ref: "$1",
                    type: "IS_PERSON",
                    start: 1,
                    end: 1000,
                    properties: {},
                    endGraph: "default",
                },
            ],
        ]);
        expect(
            (
                await run(
                    "MATCH (e:WEmployee)-[:IS_PERSON]->(p:Person) RETURN e.name AS e, p.name AS p"
                )
            ).results
        ).toEqual([{ e: "emp", p: "Ada" }]);
        await expect(
            run("MATCH (a:WEmployee), (b:WEmployee) CREATE (a)-[:IS_PERSON]->(b)")
        ).rejects.toThrow(
            "Cannot create [:IS_PERSON]: its CREATE VIRTUAL definition connects a definition node to a node of graph default, but an endpoint is a definition node"
        );
    });

    test("graph relationships to definition nodes", async () => {
        mock.addNodes("WEmp", [
            { id: 1, name: "emp1" },
            { id: 2, name: "emp2" },
        ]);
        await define(
            "CREATE VIRTUAL (:WEmp) AS { LOAD JSON FROM mockbackend($request) AS n RETURN n.id AS id, n.name AS name }",
            "DELETE VIRTUAL (:WEmp)"
        );
        await run("USE GRAPH memorygraph($request)");
        await run("CREATE (:Person {name: 'p1'})");
        const created = await run(
            "MATCH (p:Person), (e:WEmp {id: 2}) CREATE (p)-[:WORKS_AS]->(e) RETURN 1"
        );
        expect(created.writeResult!.changes).toEqual([
            {
                op: "createRelationship",
                ref: "$1",
                type: "WORKS_AS",
                start: 1,
                end: 2,
                properties: {},
                endGraph: "virtual",
                endLabel: "WEmp",
            },
        ]);
        expect((await run("MATCH (p:Person)-[:WORKS_AS]->(x) RETURN x.name AS x")).results).toEqual(
            [{ x: "emp2" }]
        );
        expect(
            (await run("MATCH (e:WEmp)<-[:WORKS_AS]-(p) RETURN e.name AS e, p.name AS p")).results
        ).toEqual([{ e: "emp2", p: "p1" }]);
        // Person 1 and WEmp 1 share an id but never join.
        expect((await run("MATCH (e:WEmp {id: 1})<-[r]-(p) RETURN p.name AS p")).results).toEqual(
            []
        );

        mock.reset();
        await expect(run("MATCH (e:WEmp {id: 2}) DETACH DELETE e")).rejects.toThrow(
            "Cannot delete node 2: relationships stored in default graph memorygraph still reference it; delete them first in a separate query"
        );
        expect(mock.changeSets).toEqual([]);
        await run("MATCH (e:WEmp {id: 1}) DETACH DELETE e");
        expect(mock.changeSets).toEqual([
            [{ op: "deleteNode", target: 1, label: "WEmp", detach: true }],
        ]);

        // A relationship whose definition node disappeared is hidden.
        mock.clear();
        expect((await run("MATCH (p:Person)-[:WORKS_AS]->(x) RETURN x.name AS x")).results).toEqual(
            []
        );
    });
});
