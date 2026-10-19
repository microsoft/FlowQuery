import Runner from "../../src/compute/runner";
import Database from "../../src/graph/database";
import { matchesPredicate } from "../../src/graph/source_provider";

const db = Database.getInstance();

async function run(statement: string, parameters?: Record<string, any>, options: any = {}) {
    const runner = new Runner(statement, null, null, { ...options, parameters });
    await runner.run();
    return runner;
}

const PEOPLE = [
    { id: 1, name: "Ada", age: 36 },
    { id: 2, name: "Ben", age: 25 },
    { id: 3, name: "Cy", age: 51 },
];

describe("top-level $parameters", () => {
    const requests: any[] = [];

    beforeAll(async () => {
        db.registerNodeSource("ParamPerson", {
            capabilities: {
                version: 1,
                lookup: true,
                predicates: { operators: ["eq", "in", "gt", "gte", "lt", "lte"] },
            },
            scan: (request: any) => {
                requests.push(request);
                return PEOPLE.filter((r) => matchesPredicate(request.predicate, r));
            },
            lookup: (request: any) => {
                requests.push(request);
                return PEOPLE.filter((r) => request.ids.includes(r.id));
            },
        });
    });

    beforeEach(() => {
        requests.length = 0;
    });

    test("RETURN $x", async () => {
        const runner = await run("RETURN $x AS v", { x: 1 });
        expect(runner.results).toEqual([{ v: 1 }]);
    });

    test("a parsed query can be re-run with different parameter maps", async () => {
        expect((await run("RETURN $x + 1 AS v", { x: 1 })).results).toEqual([{ v: 2 }]);
        expect((await run("RETURN $x + 1 AS v", { x: 41 })).results).toEqual([{ v: 42 }]);
    });

    test("pattern property parameters are pushed like literals", async () => {
        const runner = await run("MATCH (p:ParamPerson {name: $name}) RETURN p.name AS name", {
            name: "Ada",
        });
        expect(runner.results).toEqual([{ name: "Ada" }]);
        expect(requests[0].predicate).toEqual({ op: "eq", property: "name", value: "Ada" });
        requests.length = 0;
        await run("MATCH (p:ParamPerson {name: 'Ada'}) RETURN p.name AS name");
        expect(requests[0].predicate).toEqual({ op: "eq", property: "name", value: "Ada" });
    });

    test("WHERE comparisons with parameters are pushed like literals", async () => {
        const runner = await run(
            "MATCH (p:ParamPerson) WHERE p.age >= $min RETURN p.name AS name",
            { min: 36 }
        );
        expect(runner.results.map((r: any) => r.name).sort()).toEqual(["Ada", "Cy"]);
        expect(requests[0].predicate).toEqual({ op: "gte", property: "age", value: 36 });
    });

    test("UNWIND list parameters", async () => {
        const runner = await run("UNWIND $ids AS id RETURN id", { ids: [1, 2, 3] });
        expect(runner.results).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    test("parameters are visible in sub-queries", async () => {
        const runner = await run(
            "MATCH (p:ParamPerson) WHERE EXISTS { MATCH (q:ParamPerson) WHERE q.id = p.id AND q.age > $min } RETURN p.name AS name",
            { min: 40 }
        );
        expect(runner.results).toEqual([{ name: "Cy" }]);
    });

    test("a missing parameter names it", async () => {
        await expect(run("RETURN $missing AS v", { other: 1 })).rejects.toThrow(
            "Missing value for parameter $missing"
        );
    });

    test("$args and $request are reserved outside virtual definitions", async () => {
        await expect(run("RETURN $args AS v")).rejects.toThrow(
            /\$args is only available inside virtual/
        );
        await expect(run("RETURN $request AS v")).rejects.toThrow(
            /\$request is only available inside virtual/
        );
        expect((await run("RETURN $args AS v", { args: 7 })).results).toEqual([{ v: 7 }]);
    });

    test("definition bodies keep $args and see query parameters", async () => {
        await run(`CREATE VIRTUAL (:ParamList) AS {
            UNWIND $people AS p RETURN p.id AS id, p.name AS name, $args AS args
        }`);
        const runner = await run("MATCH (n:ParamList) RETURN n.name AS name, n.args AS args", {
            people: PEOPLE,
        });
        expect(runner.results.map((r: any) => r.name)).toEqual(["Ada", "Ben", "Cy"]);
        expect(runner.results[0].args).toEqual({});
        db.nodes.delete("ParamList");
    });
});

describe("doubled-backtick escapes", () => {
    test("labels with an escaped backtick", async () => {
        await run("CREATE VIRTUAL (:`a``b`) AS { RETURN 1 AS id }");
        const runner = await run("MATCH (n:`a``b`) RETURN n.id AS id");
        expect(runner.results).toEqual([{ id: 1 }]);
        expect(db.nodes.has("a`b")).toBe(true);
        db.nodes.delete("a`b");
    });

    test("map keys with an escaped backtick", async () => {
        const runner = await run("WITH {`a``b`: 1} AS m RETURN m");
        expect(runner.results).toEqual([{ m: { "a`b": 1 } }]);
    });

    test("backslash escape still works", async () => {
        const runner = await run("WITH {`a\\`b`: 1} AS m RETURN m");
        expect(runner.results).toEqual([{ m: { "a`b": 1 } }]);
    });

    test("quoted strings are unchanged", async () => {
        const runner = await run("RETURN 'a``b' AS s");
        expect(runner.results).toEqual([{ s: "a``b" }]);
    });
});
