import Runner from "../../src/compute/runner";
import { QueryCancelledError } from "../../src/graph/source_provider";
import { mock } from "./mock_backend";

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
        expect(() => new Runner("MATCH (n:WP) SET n = {a: 1}")).toThrow(/use SET n \+= \{\.\.\.\}/);
    });
});
