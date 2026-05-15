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

    test("tolerates absent whitespace immediately after sub-query braces", async () => {
        const runner = new Runner(`
            LET users = [{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}];
            CREATE VIRTUAL (:UserNoWs) AS {LOAD JSON FROM users AS u RETURN u.id AS id, u.name AS name};
            MATCH (u:UserNoWs)
            RETURN u.id AS id, u.name AS name
            ORDER BY id
        `);
        await runner.run();
        expect(runner.results).toEqual([
            { id: 1, name: "Alice" },
            { id: 2, name: "Bob" },
        ]);
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

describe("MERGE INTO … USING — upsert", () => {
    test("replaces matching rows and appends new ones", async () => {
        const runner = new Runner(`
            LET data = [
                {id: 1, name: "Alice"},
                {id: 2, name: "Bob"}
            ];
            MERGE INTO data
                USING [
                    {id: 2, name: "Bobby"},
                    {id: 3, name: "Charlie"}
                ]
                ON id
                WHEN MATCHED THEN UPDATE SET .id, .name
                WHEN NOT MATCHED THEN INSERT;
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

    test("MERGE INTO on missing binding throws (use LET to create)", async () => {
        const runner = new Runner(`
            MERGE INTO fresh
                USING [{id: 1, v: "x"}, {id: 2, v: "y"}]
                ON id
                WHEN NOT MATCHED THEN INSERT;
            LOAD JSON FROM fresh AS f
            RETURN f.id AS id, f.v AS v
        `);
        await expect(runner.run()).rejects.toThrow(
            /Binding 'fresh' is not defined; use LET to create it/
        );
    });

    test("supports a sub-query as the USING source", async () => {
        const runner = new Runner(`
            LET data = [{id: 1, n: 10}];
            MERGE INTO data
                USING
                    UNWIND [{id: 1, n: 99}, {id: 2, n: 20}] AS r
                    RETURN r.id AS id, r.n AS n
                ON id
                WHEN MATCHED THEN UPDATE SET .id, .n
                WHEN NOT MATCHED THEN INSERT;
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

    test("MERGE INTO requires at least one WHEN clause", () => {
        expect(() => new Runner("LET d = [1]; MERGE INTO d USING [1] ON id; RETURN 1")).toThrow(
            /MERGE INTO requires at least one WHEN clause/
        );
    });

    test("plain UPDATE on missing binding throws", async () => {
        const runner = new Runner(`
            UPDATE missing = [1, 2];
            RETURN 1 AS ok
        `);
        await expect(runner.run()).rejects.toThrow(
            /Binding 'missing' is not defined; use LET to create it/
        );
    });
});

describe("MERGE INTO — composite keys", () => {
    test("matches rows on multiple keys", async () => {
        const runner = new Runner(`
            LET rows = [
                {tenant: "a", id: 1, v: "old-a1"},
                {tenant: "a", id: 2, v: "old-a2"},
                {tenant: "b", id: 1, v: "old-b1"}
            ];
            MERGE INTO rows
                USING [
                    {tenant: "a", id: 2, v: "new-a2"},
                    {tenant: "b", id: 1, v: "new-b1"},
                    {tenant: "c", id: 1, v: "new-c1"}
                ]
                ON (tenant, id)
                WHEN MATCHED THEN UPDATE SET .tenant, .id, .v
                WHEN NOT MATCHED THEN INSERT;
            LOAD JSON FROM rows AS r
            RETURN r.tenant AS tenant, r.id AS id, r.v AS v
            ORDER BY tenant, id
        `);
        await runner.run();
        expect(runner.results).toEqual([
            { tenant: "a", id: 1, v: "old-a1" },
            { tenant: "a", id: 2, v: "new-a2" },
            { tenant: "b", id: 1, v: "new-b1" },
            { tenant: "c", id: 1, v: "new-c1" },
        ]);
    });

    test("ON with single parenthesised key behaves like the bare form", async () => {
        const runner = new Runner(`
            LET data = [{id: 1, v: "a"}, {id: 2, v: "b"}];
            MERGE INTO data
                USING [{id: 2, v: "B"}, {id: 3, v: "c"}]
                ON (id)
                WHEN MATCHED THEN UPDATE SET .id, .v
                WHEN NOT MATCHED THEN INSERT;
            LOAD JSON FROM data AS d
            RETURN d.id AS id, d.v AS v
            ORDER BY id
        `);
        await runner.run();
        expect(runner.results).toEqual([
            { id: 1, v: "a" },
            { id: 2, v: "B" },
            { id: 3, v: "c" },
        ]);
    });
});

describe("MERGE INTO … WHEN MATCHED THEN UPDATE SET — partial field merge", () => {
    test("only listed fields overwrite existing rows", async () => {
        const runner = new Runner(`
            LET users = [
                {id: 1, name: "Alice", email: "a@x", age: 30},
                {id: 2, name: "Bob",   email: "b@x", age: 40}
            ];
            MERGE INTO users
                USING [
                    {id: 1, name: "Alicia", email: "alicia@x", age: 999},
                    {id: 3, name: "Carol",  email: "c@x"}
                ]
                ON id
                WHEN MATCHED THEN UPDATE SET .name, .email
                WHEN NOT MATCHED THEN INSERT;
            LOAD JSON FROM users AS u
            RETURN u.id AS id, u.name AS name, u.email AS email, u.age AS age
            ORDER BY id
        `);
        await runner.run();
        expect(runner.results).toEqual([
            { id: 1, name: "Alicia", email: "alicia@x", age: 30 },
            { id: 2, name: "Bob", email: "b@x", age: 40 },
            { id: 3, name: "Carol", email: "c@x", age: undefined },
        ]);
    });

    test("missing SET fields on incoming row leave existing fields untouched", async () => {
        const runner = new Runner(`
            LET users = [{id: 1, name: "Alice", email: "a@x"}];
            MERGE INTO users
                USING [{id: 1, name: "Alicia"}]
                ON id
                WHEN MATCHED THEN UPDATE SET .name, .email
                WHEN NOT MATCHED THEN INSERT;
            LOAD JSON FROM users AS u
            RETURN u.id AS id, u.name AS name, u.email AS email
        `);
        await runner.run();
        expect(runner.results).toEqual([{ id: 1, name: "Alicia", email: "a@x" }]);
    });
});

describe("MERGE INTO — selective branches", () => {
    test("matched-only: omitting NOT MATCHED ignores new rows", async () => {
        const runner = new Runner(`
            LET data = [{id: 1, v: "a"}, {id: 2, v: "b"}];
            MERGE INTO data
                USING [{id: 1, v: "A"}, {id: 3, v: "C"}]
                ON id
                WHEN MATCHED THEN UPDATE SET .id, .v;
            LOAD JSON FROM data AS d
            RETURN d.id AS id, d.v AS v
            ORDER BY id
        `);
        await runner.run();
        expect(runner.results).toEqual([
            { id: 1, v: "A" },
            { id: 2, v: "b" },
        ]);
    });

    test("not-matched-only: omitting MATCHED leaves existing rows untouched", async () => {
        const runner = new Runner(`
            LET data = [{id: 1, v: "a"}, {id: 2, v: "b"}];
            MERGE INTO data
                USING [{id: 1, v: "A"}, {id: 3, v: "C"}]
                ON id
                WHEN NOT MATCHED THEN INSERT;
            LOAD JSON FROM data AS d
            RETURN d.id AS id, d.v AS v
            ORDER BY id
        `);
        await runner.run();
        expect(runner.results).toEqual([
            { id: 1, v: "a" },
            { id: 2, v: "b" },
            { id: 3, v: "C" },
        ]);
    });

    test("WHEN MATCHED THEN DELETE removes matched target rows", async () => {
        const runner = new Runner(`
            LET users = [
                {id: 1, name: "Alice"},
                {id: 2, name: "Bob"},
                {id: 3, name: "Carol"}
            ];
            MERGE INTO users
                USING [{id: 2}, {id: 3}]
                ON id
                WHEN MATCHED THEN DELETE;
            LOAD JSON FROM users AS u
            RETURN u.id AS id, u.name AS name
            ORDER BY id
        `);
        await runner.run();
        expect(runner.results).toEqual([{ id: 1, name: "Alice" }]);
    });
});

describe("MERGE INTO — per-row expressions across aliases", () => {
    test("SET expression references both target and source aliases", async () => {
        const runner = new Runner(`
            LET users = [
                {id: 1, name: "Alice"},
                {id: 2, name: "Bob"}
            ];
            MERGE INTO users AS u
                USING [
                    {id: 1, name: "Smith"},
                    {id: 2, name: "Jones"}
                ] AS s
                ON id
                WHEN MATCHED THEN UPDATE SET .name = s.name + " " + u.name;
            LOAD JSON FROM users AS u
            RETURN u.id AS id, u.name AS name
            ORDER BY id
        `);
        await runner.run();
        expect(runner.results).toEqual([
            { id: 1, name: "Smith Alice" },
            { id: 2, name: "Jones Bob" },
        ]);
    });

    test("ON predicate evaluates per (target, source) pair", async () => {
        const runner = new Runner(`
            LET users = [
                {tenant: "a", email: "x@a", v: 1},
                {tenant: "b", email: "x@b", v: 2}
            ];
            MERGE INTO users AS u
                USING [
                    {tenant: "a", email: "x@a", v: 99},
                    {tenant: "b", email: "y@b", v: 100}
                ] AS s
                ON u.tenant = s.tenant AND u.email = s.email
                WHEN MATCHED THEN UPDATE SET .v = s.v
                WHEN NOT MATCHED THEN INSERT;
            LOAD JSON FROM users AS u
            RETURN u.tenant AS tenant, u.email AS email, u.v AS v
            ORDER BY tenant, email
        `);
        await runner.run();
        expect(runner.results).toEqual([
            { tenant: "a", email: "x@a", v: 99 },
            { tenant: "b", email: "x@b", v: 2 },
            { tenant: "b", email: "y@b", v: 100 },
        ]);
    });

    test("WHEN NOT MATCHED THEN INSERT with explicit row expression", async () => {
        const runner = new Runner(`
            LET users = [{id: 1, name: "Alice"}];
            MERGE INTO users AS u
                USING [{id: 2, name: "Bob"}] AS s
                ON id
                WHEN NOT MATCHED THEN INSERT {id: s.id, name: "New: " + s.name};
            LOAD JSON FROM users AS u
            RETURN u.id AS id, u.name AS name
            ORDER BY id
        `);
        await runner.run();
        expect(runner.results).toEqual([
            { id: 1, name: "Alice" },
            { id: 2, name: "New: Bob" },
        ]);
    });

    test("bare-binding source via USING <name> AS <alias>", async () => {
        const runner = new Runner(`
            LET users = [{id: 1, v: "a"}];
            LET incoming = [{id: 1, v: "A"}, {id: 2, v: "B"}];
            MERGE INTO users
                USING incoming AS s
                ON id
                WHEN MATCHED THEN UPDATE SET .v = s.v
                WHEN NOT MATCHED THEN INSERT;
            LOAD JSON FROM users AS u
            RETURN u.id AS id, u.v AS v
            ORDER BY id
        `);
        await runner.run();
        expect(runner.results).toEqual([
            { id: 1, v: "A" },
            { id: 2, v: "B" },
        ]);
    });
});

describe("UPDATE … AS u DELETE WHERE — row filtering", () => {
    test("removes rows matching the predicate", async () => {
        const runner = new Runner(`
            LET users = [
                {id: 1, name: "Alice", archived: false},
                {id: 2, name: "Bob",   archived: true},
                {id: 3, name: "Carol", archived: true},
                {id: 4, name: "Dan",   archived: false}
            ];
            UPDATE users AS u DELETE WHERE u.archived = true;
            LOAD JSON FROM users AS u
            RETURN u.id AS id, u.name AS name
            ORDER BY id
        `);
        await runner.run();
        expect(runner.results).toEqual([
            { id: 1, name: "Alice" },
            { id: 4, name: "Dan" },
        ]);
    });

    test("works on scalar list with bare alias predicate", async () => {
        const runner = new Runner(`
            LET nums = [1, 5, 10, 50, 100, 500];
            UPDATE nums AS n DELETE WHERE n > 50;
            LOAD JSON FROM nums AS n
            RETURN n
        `);
        await runner.run();
        expect(runner.results).toEqual([{ n: 1 }, { n: 5 }, { n: 10 }, { n: 50 }]);
    });

    test("can reference other bindings in the predicate", async () => {
        const runner = new Runner(`
            LET banned = [3, 7, 9];
            LET users = [
                {id: 1, name: "Alice"},
                {id: 3, name: "Bob"},
                {id: 7, name: "Carol"},
                {id: 4, name: "Dan"}
            ];
            UPDATE users AS u DELETE WHERE u.id IN banned;
            LOAD JSON FROM users AS u
            RETURN u.id AS id, u.name AS name
            ORDER BY id
        `);
        await runner.run();
        expect(runner.results).toEqual([
            { id: 1, name: "Alice" },
            { id: 4, name: "Dan" },
        ]);
    });

    test("preserves relative order of remaining rows", async () => {
        const runner = new Runner(`
            LET xs = [{id: 5}, {id: 2}, {id: 8}, {id: 1}, {id: 4}];
            UPDATE xs AS x DELETE WHERE x.id > 4;
            LOAD JSON FROM xs AS x
            RETURN x.id AS id
        `);
        await runner.run();
        expect(runner.results).toEqual([{ id: 2 }, { id: 1 }, { id: 4 }]);
    });

    test("throws when binding is missing", async () => {
        const runner = new Runner(`
            UPDATE nope AS n DELETE WHERE n > 0;
            RETURN 1 AS ok
        `);
        await expect(runner.run()).rejects.toThrow(/Binding 'nope' is not defined/);
    });

    test("throws when binding is not a list", async () => {
        const runner = new Runner(`
            LET x = {id: 1};
            UPDATE x AS r DELETE WHERE r.id = 1;
            RETURN 1 AS ok
        `);
        await expect(runner.run()).rejects.toThrow(/requires 'x' to be a list/);
    });
});
