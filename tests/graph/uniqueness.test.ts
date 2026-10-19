import Runner from "../../src/compute/runner";
import Database from "../../src/graph/database";
import { inMemoryNodeSource, inMemoryRelationshipSource } from "../../src/graph/testing";
import { mock } from "./mock_backend";

const db = Database.getInstance();

async function query(statement: string): Promise<any[]> {
    const runner = new Runner(statement);
    await runner.run();
    return runner.results;
}

const sorted = (rows: any[]) => rows.map((r) => JSON.stringify(r)).sort();

const P = [
    { id: 1, name: "Ben" },
    { id: 2, name: "Ana" },
];
const X = [{ id: 10, name: "Atlas" }];
const W = [
    { left_id: 1, right_id: 10 },
    { left_id: 2, right_id: 10 },
];

const literal = (rows: any[]) => JSON.stringify(rows).replace(/"(\w+)":/g, "$1:");

/** Define (:pP), (:pX) and (:pP)-[:pW]-(:pX) in one of the supported ways. */
async function define(prefix: string, kind: string, w: any[] = W): Promise<void> {
    const [p, x, t] = [`${prefix}P`, `${prefix}X`, `${prefix}W`];
    if (kind === "inMemory") {
        db.registerNodeSource(p, inMemoryNodeSource(P));
        db.registerNodeSource(x, inMemoryNodeSource(X));
        db.registerRelationshipSource(t, p, x, inMemoryRelationshipSource(w));
        return;
    }
    if (kind === "mockbackend") {
        mock.addNodes(p, P);
        mock.addNodes(x, X);
        mock.addRelationships(t, w);
        await query(
            `CREATE VIRTUAL (:${p}) AS { LOAD JSON FROM mockbackend($request) AS r RETURN r.id AS id, r.name AS name }`
        );
        await query(
            `CREATE VIRTUAL (:${x}) AS { LOAD JSON FROM mockbackend($request) AS r RETURN r.id AS id, r.name AS name }`
        );
        await query(
            `CREATE VIRTUAL (:${p})-[:${t}]-(:${x}) AS { LOAD JSON FROM mockbackend($request) AS e RETURN e.id AS id, e.left_id AS left_id, e.right_id AS right_id }`
        );
        return;
    }
    const caps =
        kind === "capabilities"
            ? "WITH CAPABILITIES {lookup: true, expand: true, predicates: true}"
            : "";
    const relCaps =
        kind === "capabilities" ? "WITH CAPABILITIES {expand: true, predicates: true}" : "";
    await query(
        `CREATE VIRTUAL (:${p}) ${caps} AS { UNWIND ${literal(P)} AS r RETURN r.id AS id, r.name AS name }`
    );
    await query(
        `CREATE VIRTUAL (:${x}) ${caps} AS { UNWIND ${literal(X)} AS r RETURN r.id AS id, r.name AS name }`
    );
    await query(
        `CREATE VIRTUAL (:${p})-[:${t}]-(:${x}) ${relCaps} AS { UNWIND ${literal(w)} AS e RETURN e.id AS id, e.left_id AS left_id, e.right_id AS right_id }`
    );
}

describe.each(["eager", "capabilities", "inMemory", "mockbackend"])(
    "relationship uniqueness (%s definitions)",
    (kind) => {
        const prefix = `U${kind}`;
        const parallel = `${prefix}Par`;

        beforeAll(async () => {
            await define(prefix, kind);
            await define(parallel, kind, [
                { id: 101, left_id: 1, right_id: 10 },
                { id: 102, left_id: 1, right_id: 10 },
                { id: 103, left_id: 2, right_id: 10 },
            ]);
        });

        test("a pattern cannot walk back over the same relationship", async () => {
            const rows = await query(
                `MATCH (b:${prefix}P {name: 'Ben'})-[:${prefix}W]->(x:${prefix}X)<-[:${prefix}W]-(c:${prefix}P) RETURN c.name AS c`
            );
            expect(rows).toEqual([{ c: "Ana" }]);
        });

        test("relationship variables do not change the rule", async () => {
            const rows = await query(
                `MATCH (b:${prefix}P {name: 'Ben'})-[r1:${prefix}W]->(x:${prefix}X)<-[r2:${prefix}W]-(c:${prefix}P) RETURN c.name AS c`
            );
            expect(rows).toEqual([{ c: "Ana" }]);
        });

        test("comma-separated patterns of one MATCH share the rule", async () => {
            const rows = await query(
                `MATCH (b:${prefix}P {name: 'Ben'})-[:${prefix}W]->(x:${prefix}X), (c:${prefix}P)-[:${prefix}W]->(x) RETURN c.name AS c`
            );
            expect(rows).toEqual([{ c: "Ana" }]);
        });

        test("separate MATCH clauses stay independent", async () => {
            const rows = await query(
                `MATCH (b:${prefix}P {name: 'Ben'})-[:${prefix}W]->(x:${prefix}X) MATCH (x)<-[:${prefix}W]-(c:${prefix}P) RETURN c.name AS c`
            );
            expect(sorted(rows)).toEqual(sorted([{ c: "Ben" }, { c: "Ana" }]));
        });

        test("distinct parallel relationships still match, one per ordered pair", async () => {
            const rows = await query(
                `MATCH (a:${parallel}P)-[:${parallel}W]->(x:${parallel}X)<-[:${parallel}W]-(b:${parallel}P) RETURN a.name AS a, b.name AS b`
            );
            expect(sorted(rows)).toEqual(
                sorted([
                    { a: "Ben", b: "Ben" },
                    { a: "Ben", b: "Ben" },
                    { a: "Ben", b: "Ana" },
                    { a: "Ben", b: "Ana" },
                    { a: "Ana", b: "Ben" },
                    { a: "Ana", b: "Ben" },
                ])
            );
        });
    }
);

describe("relationship uniqueness with self-loops and variable length", () => {
    beforeAll(async () => {
        await query(
            "CREATE VIRTUAL (:ULoop) AS { UNWIND [{id: 1}, {id: 2}] AS r RETURN r.id AS id }"
        );
        await query(
            "CREATE VIRTUAL (:ULoop)-[:ULOOP_K]-(:ULoop) AS { UNWIND [{l: 1, r: 1}, {l: 1, r: 2}] AS e RETURN e.l AS left_id, e.r AS right_id }"
        );
    });

    test("an undirected chain cannot reuse a self-loop", async () => {
        const rows = await query(
            "MATCH (a:ULoop)-[:ULOOP_K]-(b:ULoop)-[:ULOOP_K]-(c:ULoop) RETURN a.id AS a, b.id AS b, c.id AS c"
        );
        expect(rows).toEqual([{ a: 1, b: 1, c: 2 }]);
    });

    test("a single relationship pattern still matches a self-loop", async () => {
        const rows = await query("MATCH (a:ULoop)-[:ULOOP_K]->(a) RETURN a.id AS a");
        expect(rows).toEqual([{ a: 1 }]);
    });
});
