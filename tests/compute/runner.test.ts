import Runner from "../../src/compute/runner";
import Database from "../../src/graph/database";
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

test("Test lookup which is keyword", async () => {
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
    expect(db.getNode("Person")).not.toBeNull();
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
