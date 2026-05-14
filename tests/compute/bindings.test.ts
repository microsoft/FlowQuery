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

    test("MERGE on missing binding throws (use LET to create)", async () => {
        const runner = new Runner(`
            UPDATE fresh MERGE ON id = [{id: 1, v: "x"}, {id: 2, v: "y"}];
            LOAD JSON FROM fresh AS f
            RETURN f.id AS id, f.v AS v
        `);
        await expect(runner.run()).rejects.toThrow(
            /Binding 'fresh' is not defined; use LET to create it/
        );
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

describe("UPDATE … MERGE ON — composite keys", () => {
    test("matches rows on multiple keys", async () => {
        const runner = new Runner(`
            LET rows = [
                {tenant: "a", id: 1, v: "old-a1"},
                {tenant: "a", id: 2, v: "old-a2"},
                {tenant: "b", id: 1, v: "old-b1"}
            ];
            UPDATE rows MERGE ON (tenant, id) = [
                {tenant: "a", id: 2, v: "new-a2"},
                {tenant: "b", id: 1, v: "new-b1"},
                {tenant: "c", id: 1, v: "new-c1"}
            ];
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

    test("composite key with single element behaves like the simple form", async () => {
        const runner = new Runner(`
            LET data = [{id: 1, v: "a"}, {id: 2, v: "b"}];
            UPDATE data MERGE ON (id) = [{id: 2, v: "B"}, {id: 3, v: "c"}];
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

describe("UPDATE … MERGE ON … SET — partial field merge", () => {
    test("only listed fields overwrite existing rows", async () => {
        const runner = new Runner(`
            LET users = [
                {id: 1, name: "Alice", email: "a@x", age: 30},
                {id: 2, name: "Bob",   email: "b@x", age: 40}
            ];
            UPDATE users MERGE ON id SET .name, .email = [
                {id: 1, name: "Alicia", email: "alicia@x", age: 999},
                {id: 3, name: "Carol",  email: "c@x"}
            ];
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
            UPDATE users MERGE ON id SET .name, .email = [
                {id: 1, name: "Alicia"}
            ];
            LOAD JSON FROM users AS u
            RETURN u.id AS id, u.name AS name, u.email AS email
        `);
        await runner.run();
        expect(runner.results).toEqual([{ id: 1, name: "Alicia", email: "a@x" }]);
    });
});

describe("UPDATE … MERGE ON … WHEN [NOT] MATCHED", () => {
    test("WHEN MATCHED only updates existing rows; new rows are ignored", async () => {
        const runner = new Runner(`
            LET data = [{id: 1, v: "a"}, {id: 2, v: "b"}];
            UPDATE data MERGE ON id WHEN MATCHED = [
                {id: 1, v: "A"},
                {id: 3, v: "C"}
            ];
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

    test("WHEN NOT MATCHED only inserts; existing rows are untouched", async () => {
        const runner = new Runner(`
            LET data = [{id: 1, v: "a"}, {id: 2, v: "b"}];
            UPDATE data MERGE ON id WHEN NOT MATCHED = [
                {id: 1, v: "A"},
                {id: 3, v: "C"}
            ];
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

    test("WHEN MATCHED composes with SET", async () => {
        const runner = new Runner(`
            LET users = [{id: 1, name: "Alice", age: 30}];
            UPDATE users MERGE ON id SET .name WHEN MATCHED = [
                {id: 1, name: "Alicia", age: 999},
                {id: 2, name: "ignored", age: 1}
            ];
            LOAD JSON FROM users AS u
            RETURN u.id AS id, u.name AS name, u.age AS age
        `);
        await runner.run();
        expect(runner.results).toEqual([{ id: 1, name: "Alicia", age: 30 }]);
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
