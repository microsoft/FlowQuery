import Runner from "../../src/compute/runner";
import { QueryCancelledError } from "../../src/graph/source_provider";
import AsyncFunction from "../../src/parsing/functions/async_function";
import { FunctionDef } from "../../src/parsing/functions/function_metadata";
import { mock } from "./mock_backend";

@FunctionDef({
    description: "Blocks until the query signal aborts (tests only)",
    category: "async",
    parameters: [],
    output: { description: "rows", type: "object" },
})
class WtBlock extends AsyncFunction {
    static started: () => void = () => undefined;
    constructor() {
        super("wtblock");
    }
    public async *generate(): AsyncGenerator<any> {
        const signal = this.context!.signal;
        WtBlock.started();
        await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve()));
        yield { x: 1 };
    }
}

async function run(statement: string, parameters?: Record<string, any>) {
    const runner = new Runner(statement, null, null, { parameters });
    await runner.run();
    return runner;
}

const PEOPLE = [
    { id: 1, name: "Ada" },
    { id: 2, name: "Ben" },
    { id: 13, name: "Cy" },
];
const COMPANIES = [{ id: 42, name: "Acme" }];

function seed(): void {
    mock.clear();
    mock.reset();
    mock.addNodes("WP", PEOPLE);
    mock.addNodes("WC", COMPANIES);
    mock.addRelationships("KNOWS", [{ id: 99, left_id: 1, right_id: 2, since: 2010 }]);
    mock.addRelationships("WORKS_AT", [{ id: 98, left_id: 13, right_id: 42 }]);
    mock.addNodes("TP", PEOPLE);
}

beforeAll(async () => {
    seed();
    await run(
        "CREATE VIRTUAL (:WP) AS { LOAD JSON FROM mockbackend($request) AS n RETURN n.id AS id, n.name AS name, n.title AS title, n.team AS team, n.seen AS seen }"
    );
    await run(
        "CREATE VIRTUAL (:WC) AS { LOAD JSON FROM mockbackend($request) AS n RETURN n.id AS id, n.name AS name }"
    );
    await run(
        "CREATE VIRTUAL (:WP)-[:KNOWS]-(:WP) AS { LOAD JSON FROM mockbackend($request) AS r RETURN r.id AS id, r.left_id AS left_id, r.right_id AS right_id, r.since AS since, r.new AS new }"
    );
    await run(
        "CREATE VIRTUAL (:WP)-[:WORKS_AT]-(:WC) AS { LOAD JSON FROM mockbackend($request) AS r RETURN r.id AS id, r.left_id AS left_id, r.right_id AS right_id }"
    );
    await run(
        "CREATE VIRTUAL (:WRO) WITH CAPABILITIES {writes: false} AS { LOAD JSON FROM mockbackend($request) AS n RETURN n.id AS id }"
    );
    await run("CREATE VIRTUAL (:WEager) AS { UNWIND [{id: 1}] AS r RETURN r.id AS id }");
    await run(
        "CREATE VIRTUAL (:TP) AS { LOAD JSON FROM mocktxbackend($request) AS n RETURN n.id AS id, n.name AS name, n.title AS title }"
    );
});

beforeEach(() => seed());

describe("change sets", () => {
    test("CREATE nodes and relationships with temporary ids", async () => {
        const runner = await run(
            "MATCH (b:WP {name: 'Ben'}) CREATE (n:WP {name: 'Dee'})-[:KNOWS {since: 2020}]->(b) RETURN n.id AS id, n.name AS name"
        );
        expect(mock.changeSets).toEqual([
            [
                { op: "createNode", ref: "$1", labels: ["WP"], properties: { name: "Dee" } },
                {
                    op: "createRelationship",
                    ref: "$2",
                    type: "KNOWS",
                    start: "$1",
                    end: 2,
                    properties: { since: 2020 },
                },
            ],
        ]);
        const id = runner.writeResult!.ids["$1"];
        expect(typeof id).toBe("number");
        expect(runner.results).toEqual([{ id, name: "Dee" }]);
        expect(runner.writeResult!.stats).toMatchObject({
            nodesCreated: 1,
            relationshipsCreated: 1,
        });
        const back = await run(
            "MATCH (a:WP {name: 'Dee'})-[:KNOWS]->(b:WP) RETURN a.id AS a, b.name AS b"
        );
        expect(back.results).toEqual([{ a: id, b: "Ben" }]);
    });

    test("one CREATE per row; refs are unique across rows", async () => {
        await run("UNWIND ['E', 'F'] AS name CREATE (n:WP {name: name})");
        expect(mock.changeSets[0]).toEqual([
            { op: "createNode", ref: "$1", labels: ["WP"], properties: { name: "E" } },
            { op: "createNode", ref: "$2", labels: ["WP"], properties: { name: "F" } },
        ]);
    });

    test("aggregated RETURN after CREATE gets the final ids", async () => {
        const runner = await run(
            "UNWIND ['E', 'F'] AS name CREATE (n:WP {name: name}) RETURN collect(n.id) AS ids"
        );
        const { ids } = runner.writeResult!;
        expect(runner.results).toEqual([{ ids: [ids["$1"], ids["$2"]] }]);
        expect(runner.results[0].ids.every((id: any) => typeof id === "number")).toBe(true);
    });

    test("SET, REMOVE and labels produce entries in order", async () => {
        const runner = await run(
            "MATCH (p:WP {id: 13}) SET p.title = 'CTO', p += {team: 'Core'} SET p:Manager REMOVE p.team, p:Intern RETURN p.title AS title, p.team AS team"
        );
        expect(mock.changeSets[0]).toEqual([
            { op: "setProperties", target: 13, label: "WP", properties: { title: "CTO" } },
            { op: "setProperties", target: 13, label: "WP", properties: { team: "Core" } },
            { op: "addLabels", target: 13, label: "WP", labels: ["Manager"] },
            { op: "setProperties", target: 13, label: "WP", properties: { team: null } },
            { op: "removeLabels", target: 13, label: "WP", labels: ["Intern"] },
        ]);
        expect(runner.results[0].title).toBe("CTO");
        expect(runner.results[0].team ?? null).toBeNull();
        expect(mock.node(13, "WP")!.properties).toEqual({ name: "Cy", title: "CTO" });
        expect(mock.node(13, "Manager")).toBeDefined();
    });

    test("parameters work in write clauses", async () => {
        await run("MATCH (p:WP {id: $id}) SET p.title = $title", { id: 1, title: "CEO" });
        expect(mock.changeSets[0]).toEqual([
            { op: "setProperties", target: 1, label: "WP", properties: { title: "CEO" } },
        ]);
    });

    test("SET on a relationship and DELETE of a relationship", async () => {
        await run("MATCH (a:WP {id: 1})-[r:KNOWS]->(b:WP) SET r.since = 2011");
        expect(mock.changeSets[0]).toEqual([
            { op: "setProperties", target: 99, type: "KNOWS", properties: { since: 2011 } },
        ]);
        await run("MATCH (a:WP {id: 1})-[r:KNOWS]->(b:WP) DELETE r");
        expect(mock.changeSets[1]).toEqual([
            { op: "deleteRelationship", target: 99, type: "KNOWS" },
        ]);
        const back = await run("MATCH (a:WP {id: 1})-[:KNOWS]->(b:WP) RETURN b.id AS b");
        expect(back.results).toEqual([]);
    });

    test("SET after CREATE targets the temporary id", async () => {
        await run("CREATE (n:WP {name: 'G'}) SET n.title = 'New'");
        expect(mock.changeSets[0]).toEqual([
            { op: "createNode", ref: "$1", labels: ["WP"], properties: { name: "G" } },
            { op: "setProperties", target: "$1", label: "WP", properties: { title: "New" } },
        ]);
        const back = await run("MATCH (n:WP {name: 'G'}) RETURN n.title AS title");
        expect(back.results).toEqual([{ title: "New" }]);
    });
});

describe("MERGE", () => {
    const merge =
        "MERGE (p:WP {name: 'Zed'}) ON CREATE SET p.team = 'Core' ON MATCH SET p.seen = true RETURN p.id AS id, p.name AS name";

    test("running the same MERGE twice creates once, then applies onMatch", async () => {
        const first = await run(merge);
        expect(mock.changeSets[0]).toEqual([
            {
                op: "mergeNode",
                ref: "$1",
                label: "WP",
                key: { name: "Zed" },
                onCreate: { team: "Core" },
                onMatch: { seen: true },
            },
        ]);
        const second = await run(merge);
        expect(second.results).toEqual(first.results);
        const zed = await run("MATCH (p:WP {name: 'Zed'}) RETURN p.team AS team, p.seen AS seen");
        expect(zed.results).toEqual([{ team: "Core", seen: true }]);
    });

    test("relationship MERGE between bound nodes", async () => {
        const statement =
            "MATCH (a:WP {id: 1}), (b:WP {id: 13}) MERGE (a)-[r:KNOWS {since: 2024}]->(b) ON CREATE SET r.new = true";
        await run(statement);
        expect(mock.changeSets[0]).toEqual([
            {
                op: "mergeRelationship",
                ref: "$1",
                type: "KNOWS",
                start: 1,
                end: 13,
                key: { since: 2024 },
                onCreate: { new: true },
                onMatch: {},
            },
        ]);
        await run(statement);
        const back = await run(
            "MATCH (a:WP {id: 1})-[r:KNOWS]->(b:WP {id: 13}) RETURN r.since AS since, r.new AS new"
        );
        expect(back.results).toEqual([{ since: 2024, new: true }]);
    });
});

describe("DELETE", () => {
    test("DETACH DELETE removes a node and its relationships", async () => {
        await run("MATCH (c:WP {id: 13}) DETACH DELETE c");
        expect(mock.changeSets[0]).toEqual([
            { op: "deleteNode", target: 13, label: "WP", detach: true },
        ]);
        expect(mock.node(13, "WP")).toBeUndefined();
        expect(mock.relationshipRows("WORKS_AT")).toEqual([]);
    });

    test("plain DELETE of a connected node fails and nothing is applied", async () => {
        await expect(run("MATCH (c:WP {id: 13}) SET c.title = 'X' DELETE c")).rejects.toThrow(
            /still has relationships/
        );
        expect(mock.node(13, "WP")!.properties).toEqual({ name: "Cy" });
    });
});

describe("atomicity and failures", () => {
    test("a failing query sends nothing", async () => {
        mock.failOn = "lookup";
        await expect(
            run(
                "MATCH (p:WP {id: 1}) SET p.title = 'X' WITH p MATCH (q:WP {id: 2}) RETURN q.id AS q"
            )
        ).rejects.toThrow(/backend failure/);
        expect(mock.changeSets).toEqual([]);
        expect(mock.node(1, "WP")!.properties.title).toBeUndefined();
    });

    test("a cancelled query sends nothing", async () => {
        const runner = new Runner("MATCH (p:WP {id: 1}) SET p.title = 'X'");
        runner.cancel();
        await expect(runner.run()).rejects.toBeInstanceOf(QueryCancelledError);
        expect(mock.changeSets).toEqual([]);
    });

    test("a failing backend write fails the query and nothing is applied", async () => {
        mock.failOn = "write";
        await expect(run("CREATE (n:WP {name: 'H'})")).rejects.toThrow(
            /Write through mockbackend failed: backend failure/
        );
        expect(mock.nodeRows("WP").some((r) => r.name === "H")).toBe(false);
    });

    test("later statements of the same query do not see the changes", async () => {
        const runner = await run(
            "CREATE (n:WP {name: 'S1'}); MATCH (n:WP {name: 'S1'}) RETURN n.id AS id"
        );
        expect(runner.results).toEqual([]);
        const back = await run("MATCH (n:WP {name: 'S1'}) RETURN n.name AS name");
        expect(back.results).toEqual([{ name: "S1" }]);
    });

    test("MATCH sees the store as it was when the query started", async () => {
        const runner = await run(
            "CREATE (n:WP {name: 'S2'}) WITH n MATCH (m:WP {name: 'S2'}) RETURN m.id AS id"
        );
        expect(runner.results).toEqual([]);
    });
});

describe("validation", () => {
    test("writes to a definition without writes: true are rejected before the query runs", async () => {
        await expect(run("MATCH (n:WRO) SET n.x = 1")).rejects.toThrow(
            /\(:WRO\): its definition does not declare the writes capability/
        );
        expect(mock.log).toEqual([]);
    });

    test("eager definitions and undefined labels cannot be written", async () => {
        await expect(run("CREATE (n:WEager {id: 2})")).rejects.toThrow(
            /does not declare the writes capability/
        );
        await expect(run("CREATE (n:Nope {id: 2})")).rejects.toThrow(
            /\(:Nope\): it has no CREATE VIRTUAL definition/
        );
    });

    test("write clauses are not allowed inside definitions", () => {
        expect(
            () => new Runner("CREATE VIRTUAL (:WX) AS { CREATE (n:WP {name: 'x'}) RETURN 1 AS id }")
        ).toThrow(/CREATE is not allowed inside virtual/);
    });

    test("SET targets must be bound graph elements", () => {
        expect(() => new Runner("WITH 1 AS x SET x.y = 2")).toThrow(
            /SET target x must be a node or relationship/
        );
        expect(() => new Runner("MERGE (n:WP {name: 'x'}) ON CREATE SET n = {a: 1}")).toThrow(
            /ON CREATE \/ ON MATCH SET only supports property updates/
        );
    });

    test("transactions requires writes", async () => {
        await expect(
            run(
                "CREATE VIRTUAL (:TBad) WITH CAPABILITIES {writes: false, transactions: true} AS { LOAD JSON FROM mockbackend($request) AS n RETURN n.id AS id }"
            )
        ).rejects.toThrow(/transactions requires writes: true/);
    });
});

describe("SET x = {...} replaces all properties", () => {
    test("on a node", async () => {
        const runner = await run(
            "MATCH (p:WP {id: 13}) SET p = {title: 'CTO'} RETURN p.name AS name, p.title AS title"
        );
        expect(mock.changeSets[0]).toEqual([
            { op: "replaceProperties", target: 13, label: "WP", properties: { title: "CTO" } },
        ]);
        expect(runner.results[0].title).toBe("CTO");
        expect(runner.results[0].name ?? null).toBeNull();
        expect(mock.node(13, "WP")!.properties).toEqual({ title: "CTO" });
    });

    test("on a relationship, with a parameter", async () => {
        await run("MATCH (a:WP {id: 1})-[r:KNOWS]->(b:WP) SET r = $props", {
            props: { note: "x" },
        });
        expect(mock.changeSets[0]).toEqual([
            { op: "replaceProperties", target: 99, type: "KNOWS", properties: { note: "x" } },
        ]);
        expect(mock.relationshipRows("KNOWS")).toEqual([
            { id: 99, left_id: 1, right_id: 2, note: "x" },
        ]);
    });
});

describe("transactions (read-your-writes)", () => {
    const operations = () => mock.requests.map((r) => r?.operation);

    test("a later clause reads the query's own writes, with final ids", async () => {
        const runner = await run(
            "CREATE (n:TP {name: 'S2'}) WITH n MATCH (m:TP {name: 'S2'}) RETURN n.id AS n, m.id AS m"
        );
        expect(runner.results.length).toBe(1);
        expect(typeof runner.results[0].n).toBe("number");
        expect(runner.results[0].m).toBe(runner.results[0].n);
        expect(mock.commits).toBe(1);
        expect(mock.nodeRows("TP").some((r) => r.name === "S2")).toBe(true);
    });

    test("later statements read earlier statements' writes", async () => {
        const runner = await run(
            "CREATE (n:TP {name: 'S1'}); MATCH (n:TP {name: 'S1'}) RETURN n.name AS name"
        );
        expect(runner.results).toEqual([{ name: "S1" }]);
    });

    test("without later reads, changes are sent once and committed", async () => {
        await run("UNWIND ['a', 'b', 'c'] AS x CREATE (:TP {name: x})");
        expect(mock.changeSets.length).toBe(1);
        expect(mock.changeSets[0].length).toBe(3);
        expect(operations().filter((o) => o === "write" || o === "commit")).toEqual([
            "write",
            "commit",
        ]);
    });

    test("with later reads, each row's writes are sent before the next read", async () => {
        const runner = await run(
            "UNWIND ['p', 'q'] AS x CREATE (:TP {name: x}) WITH x MATCH (t:TP) WHERE t.name IN ['p', 'q'] RETURN x, count(t) AS c"
        );
        expect(mock.changeSets.length).toBe(2);
        expect(runner.results).toEqual([
            { x: "p", c: 1 },
            { x: "q", c: 2 },
        ]);
    });

    test("an aggregation makes every row's writes visible first", async () => {
        const runner = await run(
            "UNWIND ['r', 's'] AS x CREATE (:TP {name: x}) WITH collect(x) AS xs MATCH (t:TP) WHERE t.name IN xs RETURN count(t) AS c"
        );
        expect(runner.results).toEqual([{ c: 2 }]);
    });

    test("cached reads are dropped after a write", async () => {
        const runner = await run(
            "MATCH (a:TP {id: 1}) SET a.title = 'New' WITH a MATCH (b:TP {id: 1}) RETURN b.title AS title"
        );
        expect(runner.results).toEqual([{ title: "New" }]);
    });

    test("MERGE binds the final id before later reads", async () => {
        const runner = await run(
            "MERGE (p:TP {name: 'Zed'}) WITH p MATCH (q:TP {name: 'Zed'}) RETURN p.id AS p, q.id AS q"
        );
        expect(typeof runner.results[0].p).toBe("number");
        expect(runner.results).toEqual([{ p: runner.results[0].p, q: runner.results[0].p }]);
    });

    test("a failing query rolls back what was sent", async () => {
        mock.failOn = "scan";
        await expect(
            run("CREATE (n:TP {name: 'F'}) WITH n MATCH (m:TP {name: 'F'}) RETURN m.id AS id")
        ).rejects.toThrow(/backend failure/);
        expect(mock.changeSets.length).toBe(1);
        expect(mock.rollbacks).toBe(1);
        expect(mock.commits).toBe(0);
        expect(mock.nodeRows("TP").some((r) => r.name === "F")).toBe(false);
    });

    test("a cancelled query rolls back what was sent", async () => {
        const started = new Promise<void>((resolve) => (WtBlock.started = resolve));
        const runner = new Runner(
            "CREATE (n:TP {name: 'C'}) WITH n LOAD JSON FROM wtblock() AS x RETURN x"
        );
        const done = runner.run();
        await started;
        runner.cancel();
        await expect(done).rejects.toBeInstanceOf(QueryCancelledError);
        expect(mock.changeSets.length).toBe(1);
        expect(mock.rollbacks).toBe(1);
        expect(mock.nodeRows("TP").some((r) => r.name === "C")).toBe(false);
    });

    test("a failing commit fails the query and rolls back", async () => {
        mock.failOn = "commit";
        await expect(run("CREATE (n:TP {name: 'K'})")).rejects.toThrow(
            /Commit through mocktxbackend failed: backend failure/
        );
        expect(mock.rollbacks).toBe(1);
        expect(mock.nodeRows("TP").some((r) => r.name === "K")).toBe(false);
    });
});
