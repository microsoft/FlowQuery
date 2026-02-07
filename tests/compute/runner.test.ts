import Runner from "../../src/compute/runner";
import Database from "../../src/graph/database";
import Node from "../../src/graph/node";
import AsyncFunction from "../../src/parsing/functions/async_function";
import { FunctionDef } from "../../src/parsing/functions/function_metadata";

// Test classes for CALL operation tests - defined at module level for Prettier compatibility
@FunctionDef({
    description: "Asynchronous function for testing CALL operation",
    category: "async",
    parameters: [],
    output: { description: "Yields test values", type: "any" },
})
class CallTestFunction extends AsyncFunction {
    constructor() {
        super();
        this._expectedParameterCount = 0;
    }
    public async *generate(): AsyncGenerator<any> {
        yield { result: 1, dummy: "a" };
        yield { result: 2, dummy: "b" };
        yield { result: 3, dummy: "c" };
    }
}

@FunctionDef({
    description: "Asynchronous function for testing CALL operation with no yielded expressions",
    category: "async",
    parameters: [],
    output: { description: "Yields test values", type: "any" },
})
class CallTestFunctionNoObject extends AsyncFunction {
    constructor() {
        super();
        this._expectedParameterCount = 0;
    }
    public async *generate(): AsyncGenerator<any> {
        yield 1;
        yield 2;
        yield 3;
    }
}

test("Test return", async () => {
    const runner = new Runner("return 1 + 2 as sum");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ sum: 3 });
});

test("Test return with multiple expressions", async () => {
    const runner = new Runner("return 1 + 2 as sum, 3 + 4 as sum2");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ sum: 3, sum2: 7 });
});

test("Test unwind and return", async () => {
    const runner = new Runner("unwind [1, 2, 3] as num return num");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ num: 1 });
    expect(results[1]).toEqual({ num: 2 });
    expect(results[2]).toEqual({ num: 3 });
});

test("Test load and return", async () => {
    const runner = new Runner(
        'load json from "https://jsonplaceholder.typicode.com/todos" as todo return todo'
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBeGreaterThan(0);
});

test("Test load with post and return", async () => {
    const runner = new Runner(
        'load json from "https://jsonplaceholder.typicode.com/posts" post {userId: 1} as data return data'
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
});

test("Test aggregated return", async () => {
    const runner = new Runner(
        "unwind [1, 1, 2, 2] as i unwind [1, 2, 3, 4] as j return i, sum(j) as sum"
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ i: 1, sum: 20 });
    expect(results[1]).toEqual({ i: 2, sum: 20 });
});

test("Test aggregated return with string", async () => {
    const runner = new Runner(
        'unwind [1, 1, 2, 2] as i unwind ["a", "b", "c", "d"] as j return i, sum(j) as sum'
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ i: 1, sum: "abcdabcd" });
    expect(results[1]).toEqual({ i: 2, sum: "abcdabcd" });
});

test("Test aggregated return with object", async () => {
    const runner = new Runner(
        "unwind [1, 1, 2, 2] as i unwind [1, 2, 3 4] as j return i, {sum: sum(j)} as sum"
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ i: 1, sum: { sum: 20 } });
    expect(results[1]).toEqual({ i: 2, sum: { sum: 20 } });
});

test("Test aggregated return with array", async () => {
    const runner = new Runner(
        "unwind [1, 1, 2, 2] as i unwind [1, 2, 3 4] as j return i, [sum(j)] as sum"
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ i: 1, sum: [20] });
    expect(results[1]).toEqual({ i: 2, sum: [20] });
});

test("Test aggregated return with multiple aggregates", async () => {
    const runner = new Runner(
        "unwind [1, 1, 2, 2] as i unwind [1, 2, 3, 4] as j return i, sum(j) as sum, avg(j) as avg"
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ i: 1, sum: 20, avg: 2.5 });
    expect(results[1]).toEqual({ i: 2, sum: 20, avg: 2.5 });
});

test("Test avg with null", async () => {
    const runner = new Runner("return avg(null) as avg");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ avg: null });
});

test("Test sum with null", async () => {
    const runner = new Runner("return sum(null) as sum");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ sum: null });
});

test("Test avg with one value", async () => {
    const runner = new Runner("return avg(1) as avg");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ avg: 1 });
});

test("Test with and return", async () => {
    const runner = new Runner("with 1 as a return a");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ a: 1 });
});

test("Test nested aggregate functions", async () => {
    expect(() => {
        new Runner("unwind [1, 2, 3, 4] as i return sum(sum(i)) as sum");
    }).toThrow("Aggregate functions cannot be nested");
});

test("Test with and return with unwind", async () => {
    const runner = new Runner("with [1, 2, 3] as a unwind a as b return b as renamed");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ renamed: 1 });
    expect(results[1]).toEqual({ renamed: 2 });
    expect(results[2]).toEqual({ renamed: 3 });
});

test("Test predicate function", async () => {
    const runner = new Runner("RETURN sum(n in [1, 2, 3] | n where n > 1) as sum");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ sum: 5 });
});

test("Test predicate without where", async () => {
    const runner = new Runner("RETURN sum(n in [1, 2, 3] | n) as sum");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ sum: 6 });
});

test("Test predicate with return expression", async () => {
    const runner = new Runner("RETURN sum(n in [1+2+3, 2, 3] | n^2) as sum");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ sum: 49 });
});

test("Test range function", async () => {
    const runner = new Runner("RETURN range(1, 3) as range");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ range: [1, 2, 3] });
});

test("Test range function with unwind and case", async () => {
    const runner = new Runner(
        "unwind range(1, 3) as num return case when num > 1 then num else null end as ret"
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ ret: null });
    expect(results[1]).toEqual({ ret: 2 });
    expect(results[2]).toEqual({ ret: 3 });
});

test("Test size function", async () => {
    const runner = new Runner("RETURN size([1, 2, 3]) as size");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ size: 3 });
});

test("Test rand and round functions", async () => {
    const runner = new Runner("RETURN round(rand() * 10) as rand");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0].rand).toBeLessThanOrEqual(10);
});

test("Test split function", async () => {
    const runner = new Runner('RETURN split("a,b,c", ",") as split');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ split: ["a", "b", "c"] });
});

test("Test f-string", async () => {
    const runner = new Runner(
        'with range(1,3) as numbers RETURN f"hello {sum(n in numbers | n)}" as f'
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ f: "hello 6" });
});

test("Test aggregated with and return", async () => {
    const runner = new Runner(
        `
        unwind [1, 1, 2, 2] as i
        unwind range(1, 3) as j
        with i, sum(j) as sum
        return i, sum
        `
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ i: 1, sum: 12 });
    expect(results[1]).toEqual({ i: 2, sum: 12 });
});

test("Test aggregated with using collect and return", async () => {
    const runner = new Runner(
        `
        unwind [1, 1, 2, 2] as i
        unwind range(1, 3) as j
        with i, collect(j) as collected
        return i, collected
        `
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ i: 1, collected: [1, 2, 3, 1, 2, 3] });
    expect(results[1]).toEqual({ i: 2, collected: [1, 2, 3, 1, 2, 3] });
});

test("Test collect distinct", async () => {
    const runner = new Runner(
        `
        unwind [1, 1, 2, 2] as i
        unwind range(1, 3) as j
        with i, collect(distinct j) as collected
        return i, collected
        `
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ i: 1, collected: [1, 2, 3] });
    expect(results[1]).toEqual({ i: 2, collected: [1, 2, 3] });
});

test("Test collect distinct with associative array", async () => {
    const runner = new Runner(
        `
        unwind [1, 1, 2, 2] as i
        unwind range(1, 3) as j
        with i, collect(distinct {j: j}) as collected
        return i, collected
        `
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ i: 1, collected: [{ j: 1 }, { j: 2 }, { j: 3 }] });
    expect(results[1]).toEqual({ i: 2, collected: [{ j: 1 }, { j: 2 }, { j: 3 }] });
});

test("Test join function", async () => {
    const runner = new Runner('RETURN join(["a", "b", "c"], ",") as join');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ join: "a,b,c" });
});

test("Test join function with empty array", async () => {
    const runner = new Runner('RETURN join([], ",") as join');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ join: "" });
});

test("Test tojson function", async () => {
    const runner = new Runner('RETURN tojson(\'{"a": 1, "b": 2}\') as tojson');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ tojson: { a: 1, b: 2 } });
});

test("Test tojson function with lookup", async () => {
    const runner = new Runner('RETURN tojson(\'{"a": 1, "b": 2}\').a as tojson');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ tojson: 1 });
});

test("Test replace function", async () => {
    const runner = new Runner('RETURN replace("hello", "l", "x") as replace');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ replace: "hexxo" });
});

test("Test f-string with escaped braces", async () => {
    const runner = new Runner(
        'with range(1,3) as numbers RETURN f"hello {{sum(n in numbers | n)}}" as f'
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ f: "hello {sum(n in numbers | n)}" });
});

test("Test predicate function with collection from lookup", async () => {
    const runner = new Runner("RETURN sum(n in tojson('{\"a\": [1, 2, 3]}').a | n) as sum");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ sum: 6 });
});

test("Test stringify function", async () => {
    const runner = new Runner("RETURN stringify({a: 1, b: 2}) as stringify");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({
        stringify: '{\n   "a": 1,\n   "b": 2\n}',
    });
});

test("Test associative array with key which is keyword", async () => {
    const runner = new Runner("RETURN {return: 1} as aa");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ aa: { return: 1 } });
});

test("Test lookup which is keyword", async () => {
    const runner = new Runner("RETURN {return: 1}.return as aa");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ aa: 1 });
});

test("Test lookup which is keyword with bracket notation", async () => {
    const runner = new Runner('RETURN {return: 1}["return"] as aa');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ aa: 1 });
});

test("Test return with expression alias which starts with keyword", async () => {
    const runner = new Runner('RETURN 1 as return1, ["hello", "world"] as notes');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ return1: 1, notes: ["hello", "world"] });
});

test("Test load which should throw error", async () => {
    const runner = new Runner('load json from "http://non_existing" as data return data');
    runner
        .run()
        .then()
        .catch((e) => {
            expect(e.message).toBe(
                "Failed to load data from http://non_existing. Error: TypeError: fetch failed"
            );
        });
});

test("Test return with where clause", async () => {
    const runner = new Runner("unwind range(1,100) as n with n return n where n >= 20 and n <= 30");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(11);
    expect(results[0]).toEqual({ n: 20 });
    expect(results[10]).toEqual({ n: 30 });
});

test("Test return with where clause and expression alias", async () => {
    const runner = new Runner(
        "unwind range(1,100) as n with n return n as number where n >= 20 and n <= 30"
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(11);
    expect(results[0]).toEqual({ number: 20 });
    expect(results[10]).toEqual({ number: 30 });
});

test("Test aggregated return with where clause", async () => {
    const runner = new Runner(
        "unwind range(1,100) as n with n where n >= 20 and n <= 30 return sum(n) as sum"
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ sum: 275 });
});

test("Test chained aggregated return with where clause", async () => {
    const runner = new Runner(
        `
        unwind [1, 1, 2, 2] as i
        unwind range(1, 4) as j
        return i, sum(j) as sum
        where i = 1
        `
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ i: 1, sum: 20 });
});

test("Test predicate function with collection from function", async () => {
    const runner = new Runner(
        `
        unwind range(1, 10) as i
        unwind range(1, 10) as j
        return i, sum(j), avg(j), sum(n in collect(j) | n) as sum
        `
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(10);
    expect(results[0]).toEqual({ i: 1, expr1: 55, expr2: 5.5, sum: 55 });
});

test("Test limit", async () => {
    const runner = new Runner(
        `
        unwind range(1, 10) as i
        unwind range(1, 10) as j
        limit 5
        return j
        `
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(50);
});

test("Test range lookup", async () => {
    const runner = new Runner(
        `
        with range(1, 10) as numbers
        return
            numbers[:] as subset1,
            numbers[0:3] as subset2,
            numbers[:-2] as subset3
        `
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({
        subset1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        subset2: [1, 2, 3],
        subset3: [1, 2, 3, 4, 5, 6, 7, 8],
    });
});

test("Test return -1", async () => {
    const runner = new Runner("return -1 as num");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ num: -1 });
});

test("Unwind range lookup", async () => {
    const runner = new Runner(`
        with range(1,10) as arr
        unwind arr[2:-2] as a
        return a
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(6);
    expect(results[0]).toEqual({ a: 3 });
    expect(results[5]).toEqual({ a: 8 });
});

test("Test range with size", async () => {
    const runner = new Runner(`
        with range(1,10) as data
        return range(0, size(data)-1) as indices
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ indices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] });
});

test("Test keys function", async () => {
    const runner = new Runner('RETURN keys({name: "Alice", age: 30}) as keys');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ keys: ["name", "age"] });
});

test("Test type function", async () => {
    const runner = new Runner(`
        RETURN type(123) as type1,
               type("hello") as type2,
               type([1, 2, 3]) as type3,
                type({a: 1, b: 2}) as type4,
                type(null) as type5
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({
        type1: "number",
        type2: "string",
        type3: "array",
        type4: "object",
        type5: "null",
    });
});

test("Test call operation with async function", async () => {
    const runner = new Runner("CALL calltestfunction() YIELD result RETURN result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ result: 1 });
    expect(results[1]).toEqual({ result: 2 });
    expect(results[2]).toEqual({ result: 3 });
});

test("Test call operation with aggregation", async () => {
    const runner = new Runner("CALL calltestfunction() YIELD result RETURN sum(result) as total");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ total: 6 });
});

test("Test call operation as last operation", async () => {
    const runner = new Runner("CALL calltestfunction()");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ result: 1, dummy: "a" });
    expect(results[1]).toEqual({ result: 2, dummy: "b" });
    expect(results[2]).toEqual({ result: 3, dummy: "c" });
});

test("Test call operation as last operation with yield", async () => {
    const runner = new Runner("CALL calltestfunction() YIELD result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ result: 1 });
    expect(results[1]).toEqual({ result: 2 });
    expect(results[2]).toEqual({ result: 3 });
});

test("Test call operation with no yielded expressions", async () => {
    expect(() => {
        const runner = new Runner("CALL calltestfunctionnoobject() RETURN 1");
    }).toThrow("CALL operations must have a YIELD clause unless they are the last operation");
});

test("Test create node operation", async () => {
    const db = Database.getInstance();
    const runner = new Runner(`
        CREATE VIRTUAL (:Person) AS {
            with 1 as x
            RETURN x
        }    
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(0);
    expect(db.getNode(new Node(null, "Person"))).not.toBeNull();
});

test("Test create node and match operations", async () => {
    const create = new Runner(`
        CREATE VIRTUAL (:Person) AS {
            unwind [
                {id: 1, name: 'Person 1'},
                {id: 2, name: 'Person 2'}
            ] as record
            RETURN record.id as id, record.name as name
        }    
    `);
    await create.run();
    const match = new Runner("MATCH (n:Person) RETURN n");
    await match.run();
    const results = match.results;
    expect(results.length).toBe(2);
    expect(results[0].n).toBeDefined();
    expect(results[0].n.id).toBe(1);
    expect(results[0].n.name).toBe("Person 1");
    expect(results[1].n).toBeDefined();
    expect(results[1].n.id).toBe(2);
    expect(results[1].n.name).toBe("Person 2");
});

test("Test complex match operation", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Person) AS {
            unwind [
                {id: 1, name: 'Person 1', age: 30},
                {id: 2, name: 'Person 2', age: 25},
                {id: 3, name: 'Person 3', age: 35}
            ] as record
            RETURN record.id as id, record.name as name, record.age as age
        }    
    `).run();
    const match = new Runner(`
        MATCH (n:Person)
        WHERE n.age > 29
        RETURN n.name AS name, n.age AS age
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ name: "Person 1", age: 30 });
    expect(results[1]).toEqual({ name: "Person 3", age: 35 });
});

test("Test match", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Person) AS {
            unwind [
                {id: 1, name: 'Person 1'},
                {id: 2, name: 'Person 2'}
            ] as record
            RETURN record.id as id, record.name as name
        }    
    `).run();
    const match = new Runner(`
        MATCH (n:Person)
        RETURN n.name AS name
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ name: "Person 1" });
    expect(results[1]).toEqual({ name: "Person 2" });
});

test("Test match with nested join", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Person) AS {
            unwind [
                {id: 1, name: 'Person 1'},
                {id: 2, name: 'Person 2'}
            ] as record
            RETURN record.id as id, record.name as name
        }    
    `).run();
    const match = new Runner(`
        MATCH (a:Person), (b:Person)
        WHERE a.id <> b.id
        RETURN a.name AS name1, b.name AS name2
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ name1: "Person 1", name2: "Person 2" });
    expect(results[1]).toEqual({ name1: "Person 2", name2: "Person 1" });
});

test("Test match with graph pattern", async () => {
    await new Runner(`
        CREATE VIRTUAL (:User) AS {
            UNWIND [
                {id: 1, name: 'User 1', manager_id: null},
                {id: 2, name: 'User 2', manager_id: 1},
                {id: 3, name: 'User 3', manager_id: 1},
                {id: 4, name: 'User 4', manager_id: 2}
            ] AS record
            RETURN record.id AS id, record.name AS name, record.manager_id AS manager_id
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:User)-[:MANAGED_BY]-(:User) AS {
            UNWIND [
                {id: 1, manager_id: null},
                {id: 2, manager_id: 1},
                {id: 3, manager_id: 1},
                {id: 4, manager_id: 2}
            ] AS record
            RETURN record.id AS left_id, record.manager_id AS right_id
        }    
    `).run();
    const match = new Runner(`
        MATCH (user:User)-[r:MANAGED_BY]-(manager:User)
        RETURN user.name AS user, manager.name AS manager
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ user: "User 2", manager: "User 1" });
    expect(results[1]).toEqual({ user: "User 3", manager: "User 1" });
    expect(results[2]).toEqual({ user: "User 4", manager: "User 2" });
});

test("Test match with multiple hop graph pattern", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Person) AS {
            unwind [
                {id: 1, name: 'Person 1'},
                {id: 2, name: 'Person 2'},
                {id: 3, name: 'Person 3'},
                {id: 4, name: 'Person 4'}
            ] as record
            RETURN record.id as id, record.name as name
        }    
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Person)-[:KNOWS]-(:Person) AS {
            unwind [
                {left_id: 1, right_id: 2},
                {left_id: 2, right_id: 3}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }    
    `).run();
    const match = new Runner(`
        MATCH (a:Person)-[:KNOWS*]-(c:Person)
        RETURN a.name AS name1, c.name AS name2
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(7);
    // Results are interleaved: each person's zero-hop comes before their multi-hop matches
    // Person 1: zero-hop, then 1-hop to P2, then 2-hop to P3
    expect(results[0]).toEqual({ name1: "Person 1", name2: "Person 1" });
    expect(results[1]).toEqual({ name1: "Person 1", name2: "Person 2" });
    expect(results[2]).toEqual({ name1: "Person 1", name2: "Person 3" });
    // Person 2: zero-hop, then 1-hop to P3
    expect(results[3]).toEqual({ name1: "Person 2", name2: "Person 2" });
    expect(results[4]).toEqual({ name1: "Person 2", name2: "Person 3" });
    // Person 3 and 4: only zero-hop matches
    expect(results[5]).toEqual({ name1: "Person 3", name2: "Person 3" });
    expect(results[6]).toEqual({ name1: "Person 4", name2: "Person 4" });
});

test("Test match with double graph pattern", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Person) AS {
            unwind [
                {id: 1, name: 'Person 1'},
                {id: 2, name: 'Person 2'},
                {id: 3, name: 'Person 3'},
                {id: 4, name: 'Person 4'}
            ] as record
            RETURN record.id as id, record.name as name
        }    
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Person)-[:KNOWS]-(:Person) AS {
            unwind [
                {left_id: 1, right_id: 2},
                {left_id: 2, right_id: 3},
                {left_id: 3, right_id: 4}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }    
    `).run();
    const match = new Runner(`
        MATCH (a:Person)-[:KNOWS]-(b:Person)-[:KNOWS]-(c:Person)
        RETURN a.name AS name1, b.name AS name2, c.name AS name3
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ name1: "Person 1", name2: "Person 2", name3: "Person 3" });
    expect(results[1]).toEqual({ name1: "Person 2", name2: "Person 3", name3: "Person 4" });
});

test("Test match with referenced to previous variable", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Person) AS {
            unwind [
                {id: 1, name: 'Person 1'},
                {id: 2, name: 'Person 2'},
                {id: 3, name: 'Person 3'},
                {id: 4, name: 'Person 4'}
            ] as record
            RETURN record.id as id, record.name as name
        }    
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Person)-[:KNOWS]-(:Person) AS {
            unwind [
                {left_id: 1, right_id: 2},
                {left_id: 2, right_id: 3},
                {left_id: 3, right_id: 4}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }    
    `).run();
    const match = new Runner(`
        MATCH (a:Person)-[:KNOWS]-(b:Person)
        MATCH (b)-[:KNOWS]-(c:Person)
        RETURN a.name AS name1, b.name AS name2, c.name AS name3
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ name1: "Person 1", name2: "Person 2", name3: "Person 3" });
    expect(results[1]).toEqual({ name1: "Person 2", name2: "Person 3", name3: "Person 4" });
});

test("Test match and return full node", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Person) AS {
            unwind [
                {id: 1, name: 'Person 1'},
                {id: 2, name: 'Person 2'}
            ] as record
            RETURN record.id as id, record.name as name
        }    
    `).run();
    const match = new Runner(`
        MATCH (n:Person)
        RETURN n
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(2);
    expect(results[0].n).toBeDefined();
    expect(results[0].n.id).toBe(1);
    expect(results[0].n.name).toBe("Person 1");
    expect(results[1].n).toBeDefined();
    expect(results[1].n.id).toBe(2);
    expect(results[1].n.name).toBe("Person 2");
});

test("Test return graph pattern", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Person) AS {
            unwind [
                {id: 1, name: 'Person 1'},
                {id: 2, name: 'Person 2'}
            ] as record
            RETURN record.id as id, record.name as name
        }    
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Person)-[:KNOWS]-(:Person) AS {
            unwind [
                {left_id: 1, since: "2020-01-01", right_id: 2}
            ] as record
            RETURN record.left_id as left_id, record.since as since, record.right_id as right_id
        }    
    `).run();
    const match = new Runner(`
        MATCH p=(:Person)-[:KNOWS]-(:Person)
        RETURN p AS pattern
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(1);
    expect(results[0].pattern).toBeDefined();
    expect(results[0].pattern.length).toBe(3);
    expect(results[0].pattern[0].id).toBe(1);
    expect(results[0].pattern[1].properties.since).toBe("2020-01-01");
    expect(results[0].pattern[2].id).toBe(2);
});

test("Test circular graph pattern", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Person) AS {
            unwind [
                {id: 1, name: 'Person 1'},
                {id: 2, name: 'Person 2'}
            ] as record
            RETURN record.id as id, record.name as name
        }    
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Person)-[:KNOWS]-(:Person) AS {
            unwind [
                {left_id: 1, right_id: 2},
                {left_id: 2, right_id: 1}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }    
    `).run();
    const match = new Runner(`
        MATCH p=(:Person)-[:KNOWS]-(:Person)-[:KNOWS]-(:Person)
        RETURN p AS pattern
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(2);
    expect(results[0].pattern).toBeDefined();
    expect(results[0].pattern.length).toBe(5);
    expect(results[0].pattern[0].id).toBe(1);
    expect(results[0].pattern[1].id).toBeUndefined();
    expect(results[0].pattern[2].id).toBe(2);
    expect(results[0].pattern[3].id).toBeUndefined();
    expect(results[0].pattern[4].id).toBe(1);
});

test("Test circular graph pattern with variable length should throw error", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Person) AS {
            unwind [
                {id: 1, name: 'Person 1'},
                {id: 2, name: 'Person 2'}
            ] as record
            RETURN record.id as id, record.name as name
        }    
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Person)-[:KNOWS]-(:Person) AS {
            unwind [
                {left_id: 1, right_id: 2},
                {left_id: 2, right_id: 1}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }    
    `).run();
    const match = new Runner(`
        MATCH p=(:Person)-[:KNOWS*]-(:Person)
        RETURN p AS pattern
    `);
    await expect(async () => {
        await match.run();
    }).rejects.toThrow("Circular relationship detected");
});

test("Test multi-hop match with min hops constraint *1..", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Person) AS {
            unwind [
                {id: 1, name: 'Person 1'},
                {id: 2, name: 'Person 2'},
                {id: 3, name: 'Person 3'},
                {id: 4, name: 'Person 4'}
            ] as record
            RETURN record.id as id, record.name as name
        }    
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Person)-[:KNOWS]-(:Person) AS {
            unwind [
                {left_id: 1, right_id: 2},
                {left_id: 2, right_id: 3},
                {left_id: 3, right_id: 4}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }    
    `).run();
    const match = new Runner(`
        MATCH (a:Person)-[:KNOWS*1..]->(b:Person)
        RETURN a.name AS name1, b.name AS name2
    `);
    await match.run();
    const results = match.results;
    // *1.. means at least 1 hop, so no zero-hop (self) matches
    // Person 1: 1-hop to P2, 2-hop to P3, 3-hop to P4
    // Person 2: 1-hop to P3, 2-hop to P4
    // Person 3: 1-hop to P4
    // Person 4: no outgoing edges
    expect(results.length).toBe(6);
    expect(results[0]).toEqual({ name1: "Person 1", name2: "Person 2" });
    expect(results[1]).toEqual({ name1: "Person 1", name2: "Person 3" });
    expect(results[2]).toEqual({ name1: "Person 1", name2: "Person 4" });
    expect(results[3]).toEqual({ name1: "Person 2", name2: "Person 3" });
    expect(results[4]).toEqual({ name1: "Person 2", name2: "Person 4" });
    expect(results[5]).toEqual({ name1: "Person 3", name2: "Person 4" });
});

test("Test multi-hop match with min hops constraint *2..", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Person) AS {
            unwind [
                {id: 1, name: 'Person 1'},
                {id: 2, name: 'Person 2'},
                {id: 3, name: 'Person 3'},
                {id: 4, name: 'Person 4'}
            ] as record
            RETURN record.id as id, record.name as name
        }    
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Person)-[:KNOWS]-(:Person) AS {
            unwind [
                {left_id: 1, right_id: 2},
                {left_id: 2, right_id: 3},
                {left_id: 3, right_id: 4}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }    
    `).run();
    const match = new Runner(`
        MATCH (a:Person)-[:KNOWS*2..]->(b:Person)
        RETURN a.name AS name1, b.name AS name2
    `);
    await match.run();
    const results = match.results;
    // *2.. means at least 2 hops
    // Person 1: 2-hop to P3, 3-hop to P4
    // Person 2: 2-hop to P4
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ name1: "Person 1", name2: "Person 3" });
    expect(results[1]).toEqual({ name1: "Person 1", name2: "Person 4" });
    expect(results[2]).toEqual({ name1: "Person 2", name2: "Person 4" });
});

test("Test multi-hop match with variable length relationships", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Person) AS {
            unwind [
                {id: 1, name: 'Person 1'},
                {id: 2, name: 'Person 2'},
                {id: 3, name: 'Person 3'},
                {id: 4, name: 'Person 4'}
            ] as record
            RETURN record.id as id, record.name as name
        }    
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Person)-[:KNOWS]-(:Person) AS {
            unwind [
                {left_id: 1, right_id: 2},
                {left_id: 2, right_id: 3},
                {left_id: 3, right_id: 4}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }    
    `).run();
    const match = new Runner(`
        MATCH (a:Person)-[r:KNOWS*0..3]->(b:Person)
        RETURN a, r, b
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(10);

    // Results are interleaved: each person's zero-hop comes before their multi-hop matches
    // Note: first zero-hop has r=null, subsequent zero-hops may have r=[] or stale value

    // Person 1's results: zero-hop, 1-hop to P2, 2-hop to P3, 3-hop to P4
    expect(results[0].a.id).toBe(1);
    expect(results[0].b.id).toBe(1);
    // First zero-hop has r=null
    expect(results[0].r).toBe(null);

    expect(results[1].a.id).toBe(1);
    expect(results[1].b.id).toBe(2);
    expect(results[2].a.id).toBe(1);
    expect(results[2].b.id).toBe(3);
    expect(results[3].a.id).toBe(1);
    expect(results[3].b.id).toBe(4);

    // Person 2's results: zero-hop, 1-hop to P3, 2-hop to P4
    expect(results[4].a.id).toBe(2);
    expect(results[4].b.id).toBe(2);
    expect(results[5].a.id).toBe(2);
    expect(results[5].b.id).toBe(3);
    expect(results[6].a.id).toBe(2);
    expect(results[6].b.id).toBe(4);

    // Person 3's results: zero-hop, 1-hop to P4
    expect(results[7].a.id).toBe(3);
    expect(results[7].b.id).toBe(3);
    expect(results[8].a.id).toBe(3);
    expect(results[8].b.id).toBe(4);

    // Person 4's result: zero-hop only
    expect(results[9].a.id).toBe(4);
    expect(results[9].b.id).toBe(4);
});

test("Test return match pattern with variable length relationships", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Person) AS {
            unwind [
                {id: 1, name: 'Person 1'},
                {id: 2, name: 'Person 2'},
                {id: 3, name: 'Person 3'},
                {id: 4, name: 'Person 4'}
            ] as record
            RETURN record.id as id, record.name as name
        }    
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Person)-[:KNOWS]-(:Person) AS {
            unwind [
                {left_id: 1, right_id: 2},
                {left_id: 2, right_id: 3},
                {left_id: 3, right_id: 4}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }    
    `).run();
    const match = new Runner(`
        MATCH p=(a:Person)-[:KNOWS*0..3]->(b:Person)
        RETURN p AS pattern
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(10);

    // Index 0: Person 1 zero-hop - pattern = [node1] (single node, no duplicate)
    expect(results[0].pattern.length).toBe(1);
    expect(results[0].pattern[0].id).toBe(1);

    // Index 1: Person 1 -> Person 2 (1-hop): pattern = [node1, rel, node2]
    expect(results[1].pattern.length).toBe(3);
    expect(results[1].pattern[0].id).toBe(1);
    expect(results[1].pattern[1].startNode.id).toBe(1);
    expect(results[1].pattern[1].endNode.id).toBe(2);
    expect(results[1].pattern[2].id).toBe(2);

    // Index 2: Person 1 -> Person 3 (2-hop): pattern length = 5
    expect(results[2].pattern.length).toBe(5);
    expect(results[2].pattern[0].id).toBe(1);

    // Index 3: Person 1 -> Person 4 (3-hop): pattern length = 7
    expect(results[3].pattern.length).toBe(7);
    expect(results[3].pattern[0].id).toBe(1);
    expect(results[3].pattern[6].id).toBe(4);

    // Index 4: Person 2 zero-hop - pattern = [node2] (single node)
    expect(results[4].pattern.length).toBe(1);
    expect(results[4].pattern[0].id).toBe(2);

    // Index 5: Person 2 -> Person 3 (1-hop)
    expect(results[5].pattern.length).toBe(3);

    // Index 6: Person 2 -> Person 4 (2-hop)
    expect(results[6].pattern.length).toBe(5);

    // Index 7: Person 3 zero-hop - pattern = [node3] (single node)
    expect(results[7].pattern.length).toBe(1);
    expect(results[7].pattern[0].id).toBe(3);

    // Index 8: Person 3 -> Person 4 (1-hop)
    expect(results[8].pattern.length).toBe(3);

    // Index 9: Person 4 zero-hop - pattern = [node4] (single node)
    expect(results[9].pattern.length).toBe(1);
    expect(results[9].pattern[0].id).toBe(4);
});

test("Test statement with graph pattern in where clause", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Person) AS {
            unwind [
                {id: 1, name: 'Person 1'},
                {id: 2, name: 'Person 2'},
                {id: 3, name: 'Person 3'},
                {id: 4, name: 'Person 4'}
            ] as record
            RETURN record.id as id, record.name as name
        }    
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Person)-[:KNOWS]-(:Person) AS {
            unwind [
                {left_id: 1, right_id: 2},
                {left_id: 2, right_id: 3},
                {left_id: 3, right_id: 4}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }    
    `).run();
    // Test positive match
    const match = new Runner(`
        MATCH (a:Person), (b:Person)
        WHERE (a)-[:KNOWS]->(b)
        RETURN a.name AS name1, b.name AS name2
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ name1: "Person 1", name2: "Person 2" });
    expect(results[1]).toEqual({ name1: "Person 2", name2: "Person 3" });
    expect(results[2]).toEqual({ name1: "Person 3", name2: "Person 4" });

    // Test negative match
    const nomatch = new Runner(`
        MATCH (a:Person), (b:Person)
        WHERE (a)-[:KNOWS]->(b) <> true
        RETURN a.name AS name1, b.name AS name2
    `);
    await nomatch.run();
    const noresults = nomatch.results;
    expect(noresults.length).toBe(13);
    expect(noresults[0]).toEqual({ name1: "Person 1", name2: "Person 1" });
    expect(noresults[1]).toEqual({ name1: "Person 1", name2: "Person 3" });
    expect(noresults[2]).toEqual({ name1: "Person 1", name2: "Person 4" });
    expect(noresults[3]).toEqual({ name1: "Person 2", name2: "Person 1" });
    expect(noresults[4]).toEqual({ name1: "Person 2", name2: "Person 2" });
    expect(noresults[5]).toEqual({ name1: "Person 2", name2: "Person 4" });
    expect(noresults[6]).toEqual({ name1: "Person 3", name2: "Person 1" });
    expect(noresults[7]).toEqual({ name1: "Person 3", name2: "Person 2" });
    expect(noresults[8]).toEqual({ name1: "Person 3", name2: "Person 3" });
    expect(noresults[9]).toEqual({ name1: "Person 4", name2: "Person 1" });
    expect(noresults[10]).toEqual({ name1: "Person 4", name2: "Person 2" });
    expect(noresults[11]).toEqual({ name1: "Person 4", name2: "Person 3" });
    expect(noresults[12]).toEqual({ name1: "Person 4", name2: "Person 4" });
});

test("Test person who does not know anyone", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Person) AS {
            unwind [
                {id: 1, name: 'Person 1'},
                {id: 2, name: 'Person 2'},
                {id: 3, name: 'Person 3'}
            ] as record
            RETURN record.id as id, record.name as name
        }    
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Person)-[:KNOWS]-(:Person) AS {
            unwind [
                {left_id: 1, right_id: 2},
                {left_id: 2, right_id: 1}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }    
    `).run();
    const match = new Runner(`
        MATCH (a:Person)
        WHERE NOT (a)-[:KNOWS]->(:Person)
        RETURN a.name AS name
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ name: "Person 3" });
});

test("Test manager chain", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Employee) AS {
            unwind [
                {id: 1, name: 'Employee 1'},
                {id: 2, name: 'Employee 2'},
                {id: 3, name: 'Employee 3'},
                {id: 4, name: 'Employee 4'}
            ] as record
            RETURN record.id as id, record.name as name
        }    
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Employee)-[:MANAGED_BY]-(:Employee) AS {
            unwind [
                {left_id: 2, right_id: 1},
                {left_id: 3, right_id: 2},
                {left_id: 4, right_id: 2}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }    
    `).run();
    const match = new Runner(`
        MATCH p=(e:Employee)-[:MANAGED_BY*]->(m:Employee)
        WHERE NOT (m)-[:MANAGED_BY]->(:Employee)
        RETURN p
    `);
    await match.run();
    const results = match.results;
    // 4 results: includes CEO (Employee 1) with zero-hop match (empty management chain)
    expect(results.length).toBe(4);
});

test("Test equality comparison", async () => {
    const runner = new Runner(`
        unwind range(1,10) as i
        return i=5 as \`isEqual\`, i<>5 as \`isNotEqual\`
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(10);
    for (let index = 0; index < results.length; index++) {
        const result = results[index];
        if (index + 1 === 5) {
            expect(result).toEqual({ isEqual: 1, isNotEqual: 0 });
        } else {
            expect(result).toEqual({ isEqual: 0, isNotEqual: 1 });
        }
    }
});

test("Test match with constraints", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Employee) AS {
            unwind [
                {id: 1, name: 'Employee 1'},
                {id: 2, name: 'Employee 2'},
                {id: 3, name: 'Employee 3'},
                {id: 4, name: 'Employee 4'}
            ] as record
            RETURN record.id as id, record.name as name
        }
    `).run();
    const match = new Runner(`
        match (e:Employee{name:'Employee 1'})
        return e.name as name
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(1);
    expect(results[0].name).toBe("Employee 1");
});

test("Test match with leftward relationship direction", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Person) AS {
            unwind [
                {id: 1, name: 'Person 1'},
                {id: 2, name: 'Person 2'},
                {id: 3, name: 'Person 3'}
            ] as record
            RETURN record.id as id, record.name as name
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Person)-[:REPORTS_TO]-(:Person) AS {
            unwind [
                {left_id: 2, right_id: 1},
                {left_id: 3, right_id: 1}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }
    `).run();
    // Rightward: left_id -> right_id (2->1, 3->1)
    const rightMatch = new Runner(`
        MATCH (a:Person)-[:REPORTS_TO]->(b:Person)
        RETURN a.name AS employee, b.name AS manager
    `);
    await rightMatch.run();
    const rightResults = rightMatch.results;
    expect(rightResults.length).toBe(2);
    expect(rightResults[0]).toEqual({ employee: "Person 2", manager: "Person 1" });
    expect(rightResults[1]).toEqual({ employee: "Person 3", manager: "Person 1" });

    // Leftward: right_id -> left_id (1->2, 1->3) — reverse traversal
    const leftMatch = new Runner(`
        MATCH (m:Person)<-[:REPORTS_TO]-(e:Person)
        RETURN m.name AS manager, e.name AS employee
    `);
    await leftMatch.run();
    const leftResults = leftMatch.results;
    expect(leftResults.length).toBe(2);
    expect(leftResults[0]).toEqual({ manager: "Person 1", employee: "Person 2" });
    expect(leftResults[1]).toEqual({ manager: "Person 1", employee: "Person 3" });
});

test("Test match with leftward direction produces same results as rightward with swapped data", async () => {
    await new Runner(`
        CREATE VIRTUAL (:City) AS {
            unwind [
                {id: 1, name: 'New York'},
                {id: 2, name: 'Boston'},
                {id: 3, name: 'Chicago'}
            ] as record
            RETURN record.id as id, record.name as name
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:City)-[:ROUTE]-(:City) AS {
            unwind [
                {left_id: 1, right_id: 2},
                {left_id: 1, right_id: 3}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }
    `).run();
    // Leftward from destination: find where right_id matches, follow left_id
    const match = new Runner(`
        MATCH (dest:City)<-[:ROUTE]-(origin:City)
        RETURN dest.name AS destination, origin.name AS origin
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ destination: "Boston", origin: "New York" });
    expect(results[1]).toEqual({ destination: "Chicago", origin: "New York" });
});

test("Test match with leftward variable-length relationships", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Person) AS {
            unwind [
                {id: 1, name: 'Person 1'},
                {id: 2, name: 'Person 2'},
                {id: 3, name: 'Person 3'}
            ] as record
            RETURN record.id as id, record.name as name
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Person)-[:MANAGES]-(:Person) AS {
            unwind [
                {left_id: 1, right_id: 2},
                {left_id: 2, right_id: 3}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }
    `).run();
    // Leftward variable-length: traverse from right_id to left_id
    // Person 3 can reach Person 2 (1 hop) and Person 1 (2 hops)
    const match = new Runner(`
        MATCH (a:Person)<-[:MANAGES*]-(b:Person)
        RETURN a.name AS name1, b.name AS name2
    `);
    await match.run();
    const results = match.results;
    // Zero-hop results for all 3 persons + multi-hop results
    // Leftward indexes on right_id. find(id) looks up right_id=id, follows left_id.
    // right_id=1: no records → Person 1 zero-hop only
    // right_id=2: record {left_id:1, right_id:2} → Person 2 → Person 1, then recurse find(1) → no more
    // right_id=3: record {left_id:2, right_id:3} → Person 3 → Person 2, then recurse find(2) → Person 1
    expect(results.length).toBe(6);
    // Person 1: zero-hop
    expect(results[0]).toEqual({ name1: "Person 1", name2: "Person 1" });
    // Person 2: zero-hop, then reaches Person 1
    expect(results[1]).toEqual({ name1: "Person 2", name2: "Person 2" });
    expect(results[2]).toEqual({ name1: "Person 2", name2: "Person 1" });
    // Person 3: zero-hop, then reaches Person 2, then Person 1
    expect(results[3]).toEqual({ name1: "Person 3", name2: "Person 3" });
    expect(results[4]).toEqual({ name1: "Person 3", name2: "Person 2" });
    expect(results[5]).toEqual({ name1: "Person 3", name2: "Person 1" });
});

test("Test match with leftward double graph pattern", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Person) AS {
            unwind [
                {id: 1, name: 'Person 1'},
                {id: 2, name: 'Person 2'},
                {id: 3, name: 'Person 3'},
                {id: 4, name: 'Person 4'}
            ] as record
            RETURN record.id as id, record.name as name
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Person)-[:KNOWS]-(:Person) AS {
            unwind [
                {left_id: 1, right_id: 2},
                {left_id: 2, right_id: 3},
                {left_id: 3, right_id: 4}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }
    `).run();
    // Leftward chain: (c)<-[:KNOWS]-(b)<-[:KNOWS]-(a)
    // First rel: find right_id=c, follow left_id to b
    // Second rel: find right_id=b, follow left_id to a
    const match = new Runner(`
        MATCH (c:Person)<-[:KNOWS]-(b:Person)<-[:KNOWS]-(a:Person)
        RETURN a.name AS name1, b.name AS name2, c.name AS name3
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ name1: "Person 1", name2: "Person 2", name3: "Person 3" });
    expect(results[1]).toEqual({ name1: "Person 2", name2: "Person 3", name3: "Person 4" });
});

test("Test schema() returns nodes and relationships with sample data", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Animal) AS {
            UNWIND [
                {id: 1, species: 'Cat', legs: 4},
                {id: 2, species: 'Dog', legs: 4}
            ] AS record
            RETURN record.id AS id, record.species AS species, record.legs AS legs
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Animal)-[:CHASES]-(:Animal) AS {
            UNWIND [
                {left_id: 2, right_id: 1, speed: 'fast'}
            ] AS record
            RETURN record.left_id AS left_id, record.right_id AS right_id, record.speed AS speed
        }
    `).run();

    const runner = new Runner(
        "CALL schema() YIELD kind, label, type, sample RETURN kind, label, type, sample"
    );
    await runner.run();
    const results = runner.results;

    const animal = results.find((r: any) => r.kind === "node" && r.label === "Animal");
    expect(animal).toBeDefined();
    expect(animal.sample).toBeDefined();
    expect(animal.sample).not.toHaveProperty("id");
    expect(animal.sample).toHaveProperty("species");
    expect(animal.sample).toHaveProperty("legs");

    const chases = results.find((r: any) => r.kind === "relationship" && r.type === "CHASES");
    expect(chases).toBeDefined();
    expect(chases.sample).toBeDefined();
    expect(chases.sample).not.toHaveProperty("left_id");
    expect(chases.sample).not.toHaveProperty("right_id");
    expect(chases.sample).toHaveProperty("speed");
});

test("Test reserved keywords as identifiers", async () => {
    const runner = new Runner(`
        WITH 1 AS return
        RETURN return
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0].return).toBe(1);
});

test("Test reserved keywords as parts of identifiers", async () => {
    const runner = new Runner(`
        unwind [
            {from: "Alice", to: "Bob", organizer: "Charlie"},
            {from: "Bob", to: "Charlie", organizer: "Alice"},
            {from: "Charlie", to: "Alice", organizer: "Bob"}
        ] as data
        return data.from as from, data.to as to, data.organizer as organizer
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ from: "Alice", to: "Bob", organizer: "Charlie" });
    expect(results[1]).toEqual({ from: "Bob", to: "Charlie", organizer: "Alice" });
    expect(results[2]).toEqual({ from: "Charlie", to: "Alice", organizer: "Bob" });
});

test("Test reserved keywords as relationship types and labels", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Return) AS {
            unwind [
                {id: 1, name: 'Node 1'},
                {id: 2, name: 'Node 2'}
            ] as record
            RETURN record.id as id, record.name as name
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Return)-[:With]-(:Return) AS {
            unwind [
                {left_id: 1, right_id: 2}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }
    `).run();
    const match = new Runner(`
        MATCH (a:Return)-[:With]->(b:Return)
        RETURN a.name AS name1, b.name AS name2
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ name1: "Node 1", name2: "Node 2" });
});

test("Test match with node reference passed through WITH", async () => {
    await new Runner(`
        CREATE VIRTUAL (:User) AS {
            UNWIND [
                {id: 1, name: 'Alice', mail: 'alice@test.com', jobTitle: 'CEO'},
                {id: 2, name: 'Bob', mail: 'bob@test.com', jobTitle: 'VP'},
                {id: 3, name: 'Carol', mail: 'carol@test.com', jobTitle: 'VP'},
                {id: 4, name: 'Dave', mail: 'dave@test.com', jobTitle: 'Engineer'}
            ] AS record
            RETURN record.id AS id, record.name AS name, record.mail AS mail, record.jobTitle AS jobTitle
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:User)-[:MANAGES]-(:User) AS {
            UNWIND [
                {left_id: 1, right_id: 2},
                {left_id: 1, right_id: 3},
                {left_id: 2, right_id: 4}
            ] AS record
            RETURN record.left_id AS left_id, record.right_id AS right_id
        }
    `).run();
    // Equivalent to:
    //   MATCH (ceo:User)-[:MANAGES]->(dr1:User)
    //   WHERE ceo.jobTitle = 'CEO'
    //   WITH ceo, dr1
    //   MATCH (ceo)-[:MANAGES]->(dr2:User)
    //   WHERE dr1.mail <> dr2.mail
    //   RETURN ceo, dr1, dr2
    const match = new Runner(`
        MATCH (ceo:User)-[:MANAGES]->(dr1:User)
        WHERE ceo.jobTitle = 'CEO'
        WITH ceo, dr1
        MATCH (ceo)-[:MANAGES]->(dr2:User)
        WHERE dr1.mail <> dr2.mail
        RETURN ceo.name AS ceo, dr1.name AS dr1, dr2.name AS dr2
    `);
    await match.run();
    const results = match.results;
    // CEO (Alice) manages Bob and Carol. All distinct pairs:
    // (Alice, Bob, Carol) and (Alice, Carol, Bob)
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ ceo: "Alice", dr1: "Bob", dr2: "Carol" });
    expect(results[1]).toEqual({ ceo: "Alice", dr1: "Carol", dr2: "Bob" });
});

test("Test match with node reference reuse with label", async () => {
    await new Runner(`
        CREATE VIRTUAL (:RefLabelUser) AS {
            UNWIND [
                {id: 1, name: 'Alice', jobTitle: 'CEO'},
                {id: 2, name: 'Bob', jobTitle: 'VP'},
                {id: 3, name: 'Carol', jobTitle: 'VP'},
                {id: 4, name: 'Dave', jobTitle: 'Engineer'}
            ] AS record
            RETURN record.id AS id, record.name AS name, record.jobTitle AS jobTitle
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:RefLabelUser)-[:MANAGES]-(:RefLabelUser) AS {
            UNWIND [
                {left_id: 1, right_id: 2},
                {left_id: 1, right_id: 3},
                {left_id: 2, right_id: 4}
            ] AS record
            RETURN record.left_id AS left_id, record.right_id AS right_id
        }
    `).run();
    // Uses (ceo:RefLabelUser) with label in both MATCH clauses.
    // Previously this would create a new node instead of a NodeReference.
    const match = new Runner(`
        MATCH (ceo:RefLabelUser)-[:MANAGES]->(dr1:RefLabelUser)
        WHERE ceo.jobTitle = 'CEO'
        WITH ceo, dr1
        MATCH (ceo:RefLabelUser)-[:MANAGES]->(dr2:RefLabelUser)
        WHERE dr1.name <> dr2.name
        RETURN ceo.name AS ceo, dr1.name AS dr1, dr2.name AS dr2
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ ceo: "Alice", dr1: "Bob", dr2: "Carol" });
    expect(results[1]).toEqual({ ceo: "Alice", dr1: "Carol", dr2: "Bob" });
});

test("Test WHERE with IS NULL", async () => {
    const runner = new Runner(`
        unwind [{name: 'Alice', age: 30}, {name: 'Bob'}] as person
        with person.name as name, person.age as age
        where age IS NULL
        return name
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ name: "Bob" });
});

test("Test WHERE with IS NOT NULL", async () => {
    const runner = new Runner(`
        unwind [{name: 'Alice', age: 30}, {name: 'Bob'}] as person
        with person.name as name, person.age as age
        where age IS NOT NULL
        return name, age
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ name: "Alice", age: 30 });
});

test("Test WHERE with IS NOT NULL filters multiple results", async () => {
    const runner = new Runner(`
        unwind [{name: 'Alice', age: 30}, {name: 'Bob'}, {name: 'Carol', age: 25}] as person
        with person.name as name, person.age as age
        where age IS NOT NULL
        return name, age
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ name: "Alice", age: 30 });
    expect(results[1]).toEqual({ name: "Carol", age: 25 });
});

test("Test WHERE with IN list check", async () => {
    const runner = new Runner(`
        unwind range(1, 10) as n
        with n
        where n IN [2, 4, 6, 8]
        return n
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(4);
    expect(results.map((r: any) => r.n)).toEqual([2, 4, 6, 8]);
});

test("Test WHERE with NOT IN list check", async () => {
    const runner = new Runner(`
        unwind range(1, 5) as n
        with n
        where n NOT IN [2, 4]
        return n
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results.map((r: any) => r.n)).toEqual([1, 3, 5]);
});

test("Test WHERE with IN string list", async () => {
    const runner = new Runner(`
        unwind ['apple', 'banana', 'cherry', 'date'] as fruit
        with fruit
        where fruit IN ['banana', 'date']
        return fruit
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results.map((r: any) => r.fruit)).toEqual(["banana", "date"]);
});

test("Test WHERE with IN combined with AND", async () => {
    const runner = new Runner(`
        unwind range(1, 20) as n
        with n
        where n IN [1, 5, 10, 15, 20] AND n > 5
        return n
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results.map((r: any) => r.n)).toEqual([10, 15, 20]);
});

test("Test WHERE with CONTAINS", async () => {
    const runner = new Runner(`
        unwind ['apple', 'banana', 'grape', 'pineapple'] as fruit
        with fruit
        where fruit CONTAINS 'apple'
        return fruit
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results.map((r: any) => r.fruit)).toEqual(["apple", "pineapple"]);
});

test("Test WHERE with NOT CONTAINS", async () => {
    const runner = new Runner(`
        unwind ['apple', 'banana', 'grape', 'pineapple'] as fruit
        with fruit
        where fruit NOT CONTAINS 'apple'
        return fruit
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results.map((r: any) => r.fruit)).toEqual(["banana", "grape"]);
});

test("Test WHERE with STARTS WITH", async () => {
    const runner = new Runner(`
        unwind ['apple', 'apricot', 'banana', 'avocado'] as fruit
        with fruit
        where fruit STARTS WITH 'ap'
        return fruit
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results.map((r: any) => r.fruit)).toEqual(["apple", "apricot"]);
});

test("Test WHERE with NOT STARTS WITH", async () => {
    const runner = new Runner(`
        unwind ['apple', 'apricot', 'banana', 'avocado'] as fruit
        with fruit
        where fruit NOT STARTS WITH 'ap'
        return fruit
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results.map((r: any) => r.fruit)).toEqual(["banana", "avocado"]);
});

test("Test WHERE with ENDS WITH", async () => {
    const runner = new Runner(`
        unwind ['apple', 'pineapple', 'banana', 'grape'] as fruit
        with fruit
        where fruit ENDS WITH 'ple'
        return fruit
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results.map((r: any) => r.fruit)).toEqual(["apple", "pineapple"]);
});

test("Test WHERE with NOT ENDS WITH", async () => {
    const runner = new Runner(`
        unwind ['apple', 'pineapple', 'banana', 'grape'] as fruit
        with fruit
        where fruit NOT ENDS WITH 'ple'
        return fruit
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results.map((r: any) => r.fruit)).toEqual(["banana", "grape"]);
});

test("Test WHERE with CONTAINS combined with AND", async () => {
    const runner = new Runner(`
        unwind ['apple', 'pineapple', 'applesauce', 'banana'] as fruit
        with fruit
        where fruit CONTAINS 'apple' AND fruit STARTS WITH 'pine'
        return fruit
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0].fruit).toBe("pineapple");
});
