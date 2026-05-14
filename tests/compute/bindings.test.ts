import Runner from "../../src/compute/runner";
import Bindings from "../../src/graph/bindings";

beforeEach(() => {
    Bindings.getInstance().clear();
});

describe("LET — literal bindings", () => {
    test("binds a literal list and surfaces it via LOAD JSON FROM", async () => {
        const runner = new Runner(`
            LET nums = [10, 20, 30];
            LOAD JSON FROM nums AS n
            RETURN n
        `);
        await runner.run();
        expect(runner.results).toEqual([{ n: 10 }, { n: 20 }, { n: 30 }]);
    });

    test("binds a map literal and surfaces it via LOAD JSON FROM", async () => {
        const runner = new Runner(`
            LET user = {id: 1, name: "Alice"};
            LOAD JSON FROM user AS u
            RETURN u.id AS id, u.name AS name
        `);
        await runner.run();
        expect(runner.results).toEqual([{ id: 1, name: "Alice" }]);
    });

    test("binds a list of objects used as a virtual node source", async () => {
        const runner = new Runner(`
            LET users = [
                {id: 1, name: "User 1", manager_id: 2},
                {id: 2, name: "User 2", manager_id: null}
            ];
            CREATE VIRTUAL (:LetUser) AS {
                LOAD JSON FROM users AS u
                RETURN u.id AS id, u.name AS name
            };
            CREATE VIRTUAL (:LetUser)-[:LET_REPORTS_TO]-(:LetUser) AS {
                LOAD JSON FROM users AS u
                RETURN u.id AS left_id, u.manager_id AS right_id
            };
            MATCH (e:LetUser)
            OPTIONAL MATCH (e)-[:LET_REPORTS_TO]->(m:LetUser)
            RETURN e.name AS name, m.name AS manager
            ORDER BY name
        `);
        await runner.run();
        expect(runner.results).toEqual([
            { name: "User 1", manager: "User 2" },
            { name: "User 2", manager: null },
        ]);
    });

    test("binds a scalar value", async () => {
        const runner = new Runner(`
            LET answer = 42;
            LOAD JSON FROM answer AS a
            RETURN a
        `);
        await runner.run();
        expect(runner.results).toEqual([{ a: 42 }]);
    });
});

describe("LET — query bindings", () => {
    test("binds the rows produced by an inline sub-query", async () => {
        const runner = new Runner(`
            LET evens = UNWIND [1, 2, 3, 4] AS n WITH n WHERE n % 2 = 0 RETURN n AS value;
            LOAD JSON FROM evens AS e
            RETURN e.value AS v
        `);
        await runner.run();
        expect(runner.results).toEqual([{ v: 2 }, { v: 4 }]);
    });

    test("binds the rows produced by a brace-wrapped sub-query", async () => {
        const runner = new Runner(`
            LET items = { UNWIND [1, 2] AS n RETURN n AS v };
            LOAD JSON FROM items AS i
            RETURN i.v AS v
        `);
        await runner.run();
        expect(runner.results).toEqual([{ v: 1 }, { v: 2 }]);
    });
});

describe("UPDATE — full replace", () => {
    test("replaces a binding with a new value", async () => {
        const runner = new Runner(`
            LET data = [{id: 1, v: "a"}];
            UPDATE data = [{id: 2, v: "b"}, {id: 3, v: "c"}];
            LOAD JSON FROM data AS d
            RETURN d.id AS id, d.v AS v
        `);
        await runner.run();
        expect(runner.results).toEqual([
            { id: 2, v: "b" },
            { id: 3, v: "c" },
        ]);
    });

    test("replace works with a query RHS", async () => {
        const runner = new Runner(`
            LET data = [1, 2];
            UPDATE data = UNWIND [10, 20, 30] AS x RETURN x AS x;
            LOAD JSON FROM data AS d
            RETURN d.x AS x
        `);
        await runner.run();
        expect(runner.results).toEqual([{ x: 10 }, { x: 20 }, { x: 30 }]);
    });
});

describe("UPDATE … MERGE ON — upsert", () => {
    test("replaces matching rows and appends new ones", async () => {
        const runner = new Runner(`
            LET data = [
                {id: 1, name: "Alice"},
                {id: 2, name: "Bob"}
            ];
            UPDATE data MERGE ON id = [
                {id: 2, name: "Bobby"},
                {id: 3, name: "Charlie"}
            ];
            LOAD JSON FROM data AS d
            RETURN d.id AS id, d.name AS name
            ORDER BY id
        `);
        await runner.run();
        expect(runner.results).toEqual([
            { id: 1, name: "Alice" },
            { id: 2, name: "Bobby" },
            { id: 3, name: "Charlie" },
        ]);
    });

    test("MERGE on missing binding behaves like an insert", async () => {
        const runner = new Runner(`
            UPDATE fresh MERGE ON id = [{id: 1, v: "x"}, {id: 2, v: "y"}];
            LOAD JSON FROM fresh AS f
            RETURN f.id AS id, f.v AS v
            ORDER BY id
        `);
        await runner.run();
        expect(runner.results).toEqual([
            { id: 1, v: "x" },
            { id: 2, v: "y" },
        ]);
    });

    test("MERGE supports query RHS", async () => {
        const runner = new Runner(`
            LET data = [{id: 1, n: 10}];
            UPDATE data MERGE ON id =
                UNWIND [{id: 1, n: 99}, {id: 2, n: 20}] AS r
                RETURN r.id AS id, r.n AS n;
            LOAD JSON FROM data AS d
            RETURN d.id AS id, d.n AS n
            ORDER BY id
        `);
        await runner.run();
        expect(runner.results).toEqual([
            { id: 1, n: 99 },
            { id: 2, n: 20 },
        ]);
    });
});

describe("Error cases", () => {
    test("LOAD JSON FROM <unbound> throws at runtime", async () => {
        const runner = new Runner(`
            LOAD JSON FROM definitely_not_bound AS x
            RETURN x
        `);
        await expect(runner.run()).rejects.toThrow(/definitely_not_bound/);
    });

    test("LET requires '=' after the name", () => {
        expect(() => new Runner("LET foo 1; RETURN 1")).toThrow(/Expected '='/);
    });

    test("UPDATE MERGE requires ON <key>", () => {
        expect(() => new Runner("UPDATE foo MERGE = [1]; RETURN 1")).toThrow(/Expected ON/);
    });
});
