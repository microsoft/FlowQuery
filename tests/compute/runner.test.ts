import Runner from "../../src/compute/runner";
import Database from "../../src/graph/database";
import Node from "../../src/graph/node";
import Relationship from "../../src/graph/relationship";
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

test("Test count", async () => {
    const runner = new Runner(
        "unwind [1, 1, 2, 2] as i unwind [1, 2, 3, 4] as j return i, count(j) as cnt"
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ i: 1, cnt: 8 });
    expect(results[1]).toEqual({ i: 2, cnt: 8 });
});

test("Test count distinct", async () => {
    const runner = new Runner(
        `
        unwind [1, 1, 2, 2] as i
        unwind [1, 2, 1, 2] as j
        return i, count(distinct j) as cnt
        `
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ i: 1, cnt: 2 });
    expect(results[1]).toEqual({ i: 2, cnt: 2 });
});

test("Test count with strings", async () => {
    const runner = new Runner(
        `
        unwind ["a", "b", "a", "c"] as s
        return count(s) as cnt
        `
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ cnt: 4 });
});

test("Test count distinct with strings", async () => {
    const runner = new Runner(
        `
        unwind ["a", "b", "a", "c"] as s
        return count(distinct s) as cnt
        `
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ cnt: 3 });
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

test("Test min", async () => {
    const runner = new Runner("unwind [3, 1, 4, 1, 5, 9] as n return min(n) as minimum");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ minimum: 1 });
});

test("Test max", async () => {
    const runner = new Runner("unwind [3, 1, 4, 1, 5, 9] as n return max(n) as maximum");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ maximum: 9 });
});

test("Test min with grouped values", async () => {
    const runner = new Runner(
        "unwind [1, 1, 2, 2] as i unwind [10, 20, 30, 40] as j return i, min(j) as minimum"
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ i: 1, minimum: 10 });
    expect(results[1]).toEqual({ i: 2, minimum: 10 });
});

test("Test max with grouped values", async () => {
    const runner = new Runner(
        "unwind [1, 1, 2, 2] as i unwind [10, 20, 30, 40] as j return i, max(j) as maximum"
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ i: 1, maximum: 40 });
    expect(results[1]).toEqual({ i: 2, maximum: 40 });
});

test("Test min with null", async () => {
    const runner = new Runner("return min(null) as minimum");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ minimum: null });
});

test("Test max with null", async () => {
    const runner = new Runner("return max(null) as maximum");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ maximum: null });
});

test("Test min with strings", async () => {
    const runner = new Runner('unwind ["cherry", "apple", "banana"] as s return min(s) as minimum');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ minimum: "apple" });
});

test("Test max with strings", async () => {
    const runner = new Runner('unwind ["cherry", "apple", "banana"] as s return max(s) as maximum');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ maximum: "cherry" });
});

test("Test min and max together", async () => {
    const runner = new Runner(
        "unwind [3, 1, 4, 1, 5, 9] as n return min(n) as minimum, max(n) as maximum"
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ minimum: 1, maximum: 9 });
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

test("Test aggregated with on empty result set", async () => {
    const runner = new Runner(
        `
        unwind [] as i
        unwind [1, 2] as j
        with i, count(j) as cnt
        return i, cnt
        `
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(0);
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

test("Test return distinct", async () => {
    const runner = new Runner(
        `
        unwind [1, 1, 2, 2, 3, 3] as i
        return distinct i
        `
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ i: 1 });
    expect(results[1]).toEqual({ i: 2 });
    expect(results[2]).toEqual({ i: 3 });
});

test("Test return distinct with multiple expressions", async () => {
    const runner = new Runner(
        `
        unwind [1, 1, 2, 2] as i
        unwind [10, 10, 20, 20] as j
        return distinct i, j
        `
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(4);
    expect(results[0]).toEqual({ i: 1, j: 10 });
    expect(results[1]).toEqual({ i: 1, j: 20 });
    expect(results[2]).toEqual({ i: 2, j: 10 });
    expect(results[3]).toEqual({ i: 2, j: 20 });
});

test("Test with distinct", async () => {
    const runner = new Runner(
        `
        unwind [1, 1, 2, 2, 3, 3] as i
        with distinct i as i
        return i
        `
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ i: 1 });
    expect(results[1]).toEqual({ i: 2 });
    expect(results[2]).toEqual({ i: 3 });
});

test("Test with distinct and aggregation", async () => {
    const runner = new Runner(
        `
        unwind [1, 1, 2, 2] as i
        with distinct i as i
        return sum(i) as total
        `
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ total: 3 });
});

test("Test return distinct with strings", async () => {
    const runner = new Runner(
        `
        unwind ["a", "b", "a", "c", "b"] as x
        return distinct x
        `
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ x: "a" });
    expect(results[1]).toEqual({ x: "b" });
    expect(results[2]).toEqual({ x: "c" });
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

test("Test string_distance function", async () => {
    const runner = new Runner('RETURN string_distance("kitten", "sitting") as dist');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0].dist).toBeCloseTo(3 / 7, 10);
});

test("Test string_distance function with identical strings", async () => {
    const runner = new Runner('RETURN string_distance("hello", "hello") as dist');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ dist: 0 });
});

test("Test string_distance function with empty string", async () => {
    const runner = new Runner('RETURN string_distance("", "abc") as dist');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ dist: 1 });
});

test("Test string_distance function with both empty strings", async () => {
    const runner = new Runner('RETURN string_distance("", "") as dist');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ dist: 0 });
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

test("Test toString function with number", async () => {
    const runner = new Runner("RETURN toString(42) as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: "42" });
});

test("Test toString function with boolean", async () => {
    const runner = new Runner("RETURN toString(true) as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: "true" });
});

test("Test toString function with object", async () => {
    const runner = new Runner("RETURN toString({a: 1}) as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: '{"a":1}' });
});

test("Test toLower function", async () => {
    const runner = new Runner('RETURN toLower("Hello World") as result');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: "hello world" });
});

test("Test toLower function with all uppercase", async () => {
    const runner = new Runner('RETURN toLower("FOO BAR") as result');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: "foo bar" });
});

test("Test trim function", async () => {
    const runner = new Runner('RETURN trim("  hello  ") as result');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: "hello" });
});

test("Test trim function with tabs and newlines", async () => {
    const runner = new Runner('WITH "\tfoo\n" AS s RETURN trim(s) as result');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: "foo" });
});

test("Test trim function with no whitespace", async () => {
    const runner = new Runner('RETURN trim("hello") as result');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: "hello" });
});

test("Test trim function with empty string", async () => {
    const runner = new Runner('RETURN trim("") as result');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: "" });
});

test("Test substring function with start and length", async () => {
    const runner = new Runner('RETURN substring("hello", 1, 3) as result');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: "ell" });
});

test("Test substring function with start only", async () => {
    const runner = new Runner('RETURN substring("hello", 2) as result');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: "llo" });
});

test("Test substring function with zero start", async () => {
    const runner = new Runner('RETURN substring("hello", 0, 5) as result');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: "hello" });
});

test("Test substring function with zero length", async () => {
    const runner = new Runner('RETURN substring("hello", 1, 0) as result');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: "" });
});

// --- Null propagation tests ---

test("Test toLower with null returns null", async () => {
    const runner = new Runner("RETURN toLower(null) as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: null });
});

test("Test trim with null returns null", async () => {
    const runner = new Runner("RETURN trim(null) as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: null });
});

test("Test replace with null returns null", async () => {
    const runner = new Runner("RETURN replace(null, 'a', 'b') as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: null });
});

test("Test substring with null returns null", async () => {
    const runner = new Runner("RETURN substring(null, 0, 3) as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: null });
});

test("Test split with null returns null", async () => {
    const runner = new Runner("RETURN split(null, ',') as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: null });
});

test("Test size with null returns null", async () => {
    const runner = new Runner("RETURN size(null) as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: null });
});

test("Test round with null returns null", async () => {
    const runner = new Runner("RETURN round(null) as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: null });
});

test("Test join with null returns null", async () => {
    const runner = new Runner("RETURN join(null, ',') as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: null });
});

test("Test string_distance with null returns null", async () => {
    const runner = new Runner("RETURN string_distance(null, 'hello') as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: null });
});

test("Test stringify with null returns null", async () => {
    const runner = new Runner("RETURN stringify(null) as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: null });
});

test("Test toJson with null returns null", async () => {
    const runner = new Runner("RETURN tojson(null) as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: null });
});

test("Test range with null returns null", async () => {
    const runner = new Runner("RETURN range(null, 5) as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: null });
});

test("Test toString with null returns null", async () => {
    const runner = new Runner("RETURN toString(null) as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: null });
});

test("Test keys with null returns null", async () => {
    const runner = new Runner("RETURN keys(null) as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: null });
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

test("Test limit as last operation", async () => {
    const runner = new Runner(
        `
        unwind range(1, 10) as i
        return i
        limit 5
        `
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(5);
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

test("Test properties function with map", async () => {
    const runner = new Runner('RETURN properties({name: "Alice", age: 30}) as props');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ props: { name: "Alice", age: 30 } });
});

test("Test properties function with node", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Animal) AS {
            UNWIND [
                {id: 1, name: 'Dog', legs: 4},
                {id: 2, name: 'Cat', legs: 4}
            ] AS record
            RETURN record.id AS id, record.name AS name, record.legs AS legs
        }
    `).run();
    const match = new Runner(`
        MATCH (a:Animal)
        RETURN properties(a) AS props
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ props: { name: "Dog", legs: 4 } });
    expect(results[1]).toEqual({ props: { name: "Cat", legs: 4 } });
});

test("Test properties function with null", async () => {
    const runner = new Runner("RETURN properties(null) as props");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ props: null });
});

test("Test nodes function", async () => {
    await new Runner(`
        CREATE VIRTUAL (:City) AS {
            UNWIND [
                {id: 1, name: 'New York'},
                {id: 2, name: 'Boston'}
            ] AS record
            RETURN record.id AS id, record.name AS name
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:City)-[:CONNECTED_TO]-(:City) AS {
            UNWIND [
                {left_id: 1, right_id: 2}
            ] AS record
            RETURN record.left_id AS left_id, record.right_id AS right_id
        }
    `).run();
    const match = new Runner(`
        MATCH p=(:City)-[:CONNECTED_TO]-(:City)
        RETURN nodes(p) AS cities
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(1);
    expect(results[0].cities.length).toBe(2);
    expect(results[0].cities[0].id).toBe(1);
    expect(results[0].cities[0].name).toBe("New York");
    expect(results[0].cities[1].id).toBe(2);
    expect(results[0].cities[1].name).toBe("Boston");
});

test("Test relationships function", async () => {
    await new Runner(`
        CREATE VIRTUAL (:City) AS {
            UNWIND [
                {id: 1, name: 'New York'},
                {id: 2, name: 'Boston'}
            ] AS record
            RETURN record.id AS id, record.name AS name
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:City)-[:CONNECTED_TO]-(:City) AS {
            UNWIND [
                {left_id: 1, right_id: 2, distance: 190}
            ] AS record
            RETURN record.left_id AS left_id, record.right_id AS right_id, record.distance AS distance
        }
    `).run();
    const match = new Runner(`
        MATCH p=(:City)-[:CONNECTED_TO]-(:City)
        RETURN relationships(p) AS rels
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(1);
    expect(results[0].rels.length).toBe(1);
    expect(results[0].rels[0].type).toBe("CONNECTED_TO");
    expect(results[0].rels[0].properties.distance).toBe(190);
});

test("Test nodes function with null", async () => {
    const runner = new Runner("RETURN nodes(null) as n");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ n: [] });
});

test("Test relationships function with null", async () => {
    const runner = new Runner("RETURN relationships(null) as r");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ r: [] });
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

test("Test match with aggregated with and subsequent match", async () => {
    await new Runner(`
        CREATE VIRTUAL (:User) AS {
            unwind [
                {id: 1, name: 'Alice'},
                {id: 2, name: 'Bob'},
                {id: 3, name: 'Carol'}
            ] as record
            RETURN record.id as id, record.name as name
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:User)-[:KNOWS]-(:User) AS {
            unwind [
                {left_id: 1, right_id: 2},
                {left_id: 1, right_id: 3}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Project) AS {
            unwind [
                {id: 1, name: 'Project A'},
                {id: 2, name: 'Project B'}
            ] as record
            RETURN record.id as id, record.name as name
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:User)-[:WORKS_ON]-(:Project) AS {
            unwind [
                {left_id: 1, right_id: 1},
                {left_id: 1, right_id: 2}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }
    `).run();
    const match = new Runner(`
        MATCH (u:User)-[:KNOWS]->(s:User)
        WITH u, count(s) as acquaintances
        MATCH (u)-[:WORKS_ON]->(p:Project)
        RETURN u.name as name, acquaintances, collect(p.name) as projects
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({
        name: "Alice",
        acquaintances: 2,
        projects: ["Project A", "Project B"],
    });
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

test("Test circular graph pattern with variable length should not revisit nodes", async () => {
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
    await match.run();
    const results = match.results;
    // Circular graph 1↔2: cycles are skipped, only acyclic paths are returned
    expect(results.length).toBe(6);
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

test("Test optional match with no matching relationship", async () => {
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
                {left_id: 1, right_id: 2}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }
    `).run();
    // Person 3 has no KNOWS relationship, so OPTIONAL MATCH should return null for friend
    const match = new Runner(`
        MATCH (a:Person)
        OPTIONAL MATCH (a)-[:KNOWS]->(b:Person)
        RETURN a.name AS name, b AS friend
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(3);
    expect(results[0].name).toBe("Person 1");
    expect(results[0].friend).toBeDefined();
    expect(results[0].friend.name).toBe("Person 2");
    expect(results[1].name).toBe("Person 2");
    expect(results[1].friend).toBeNull();
    expect(results[2].name).toBe("Person 3");
    expect(results[2].friend).toBeNull();
});

test("Test optional match property access on null node returns null", async () => {
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
                {left_id: 1, right_id: 2}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }
    `).run();
    // When accessing b.name and b is null (no match), should return null
    const match = new Runner(`
        MATCH (a:Person)
        OPTIONAL MATCH (a)-[:KNOWS]->(b:Person)
        RETURN a.name AS name, b.name AS friend_name
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ name: "Person 1", friend_name: "Person 2" });
    expect(results[1]).toEqual({ name: "Person 2", friend_name: null });
    expect(results[2]).toEqual({ name: "Person 3", friend_name: null });
});

test("Test optional match where all nodes match", async () => {
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
    // All persons have KNOWS relationships, so no null values
    const match = new Runner(`
        MATCH (a:Person)
        OPTIONAL MATCH (a)-[:KNOWS]->(b:Person)
        RETURN a.name AS name, b.name AS friend
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ name: "Person 1", friend: "Person 2" });
    expect(results[1]).toEqual({ name: "Person 2", friend: "Person 1" });
});

test("Test optional match with no data returns nulls", async () => {
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
            unwind [] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }
    `).run();
    // KNOWS relationship type exists but has no data
    const match = new Runner(`
        MATCH (a:Person)
        OPTIONAL MATCH (a)-[:KNOWS]->(b:Person)
        RETURN a.name AS name, b AS friend
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(2);
    expect(results[0].name).toBe("Person 1");
    expect(results[0].friend).toBeNull();
    expect(results[1].name).toBe("Person 2");
    expect(results[1].friend).toBeNull();
});

test("Test optional match with aggregation", async () => {
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
                {left_id: 1, right_id: 3}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }
    `).run();
    // Collect friends per person; Person 2 and 3 have no friends
    const match = new Runner(`
        MATCH (a:Person)
        OPTIONAL MATCH (a)-[:KNOWS]->(b:Person)
        RETURN a.name AS name, collect(b) AS friends
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(3);
    expect(results[0].name).toBe("Person 1");
    expect(results[0].friends.length).toBe(2);
    expect(results[1].name).toBe("Person 2");
    expect(results[1].friends.length).toBe(1); // null is collected
    expect(results[2].name).toBe("Person 3");
    expect(results[2].friends.length).toBe(1); // null is collected
});

test("Test standalone optional match returns data when label exists", async () => {
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
                {left_id: 1, right_id: 2}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }
    `).run();
    // Standalone OPTIONAL MATCH with relationship where only Person 1 has a match
    const match = new Runner(`
        OPTIONAL MATCH (a:Person)-[:KNOWS]->(b:Person)
        RETURN a.name AS name, b.name AS friend
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ name: "Person 1", friend: "Person 2" });
});

test("Test optional match returns full node when matched", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Person) AS {
            unwind [
                {id: 1, name: 'Person 1'},
                {id: 2, name: 'Person 2'}
            ] as record
            RETURN record.id as id, record.name as name
        }
    `).run();
    // OPTIONAL MATCH on existing label returns actual nodes
    const match = new Runner(`
        OPTIONAL MATCH (n:Person)
        RETURN n.name AS name
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ name: "Person 1" });
    expect(results[1]).toEqual({ name: "Person 2" });
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
        "CALL schema() YIELD kind, label, type, from_label, to_label, properties, sample RETURN kind, label, type, from_label, to_label, properties, sample"
    );
    await runner.run();
    const results = runner.results;

    const animal = results.find((r: any) => r.kind === "Node" && r.label === "Animal");
    expect(animal).toBeDefined();
    expect(animal.properties).toEqual(["species", "legs"]);
    expect(animal.sample).toBeDefined();
    expect(animal.sample).not.toHaveProperty("id");
    expect(animal.sample).toHaveProperty("species");
    expect(animal.sample).toHaveProperty("legs");

    const chases = results.find((r: any) => r.kind === "Relationship" && r.type === "CHASES");
    expect(chases).toBeDefined();
    expect(chases.from_label).toBe("Animal");
    expect(chases.to_label).toBe("Animal");
    expect(chases.properties).toEqual(["speed"]);
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

test("Test WHERE with AND before IN", async () => {
    const runner = new Runner(`
        unwind ['expert', 'intermediate', 'beginner'] as proficiency
        with proficiency where 1=1 and proficiency in ['expert']
        return proficiency
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ proficiency: "expert" });
});

test("Test WHERE with AND before NOT IN", async () => {
    const runner = new Runner(`
        unwind ['expert', 'intermediate', 'beginner'] as proficiency
        with proficiency where 1=1 and proficiency not in ['expert']
        return proficiency
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results.map((r: any) => r.proficiency)).toEqual(["intermediate", "beginner"]);
});

test("Test WHERE with OR before IN", async () => {
    const runner = new Runner(`
        unwind range(1, 10) as n
        with n where 1=0 or n in [3, 7]
        return n
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results.map((r: any) => r.n)).toEqual([3, 7]);
});

test("Test IN as return expression with AND in WHERE", async () => {
    const runner = new Runner(`
        unwind ['expert', 'intermediate', 'beginner'] as proficiency
        with proficiency where 1=1 and proficiency in ['expert']
        return proficiency, proficiency in ['expert'] as isExpert
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ proficiency: "expert", isExpert: 1 });
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

test("Test collected nodes and re-matching", async () => {
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
        MATCH (a:Person)-[:KNOWS*0..3]->(b:Person)
        WITH collect(a) AS persons, b
        UNWIND persons AS p
        match (p)-[:KNOWS]->(:Person)
        return p.name AS name
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(9);
    const names = results.map((r: any) => r.name);
    expect(names).toContain("Person 1");
    expect(names).toContain("Person 2");
    expect(names).toContain("Person 3");
});

test("Test collected patterns and unwind", async () => {
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
        WITH collect(p) AS patterns
        UNWIND patterns AS pattern
        RETURN pattern
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(10);
    // Index 0: Person 1 zero-hop - pattern = [node1] (single node)
    expect(results[0].pattern.length).toBe(1);
    expect(results[0].pattern[0].id).toBe(1);

    // Index 1: Person 1 -> Person 2 (1-hop)
    expect(results[1].pattern.length).toBe(3);

    // Index 2: Person 1 -> Person 2 -> Person 3 (2-hop)
    expect(results[2].pattern.length).toBe(5);

    // Index 3: Person 1 -> Person 2 -> Person 3 -> Person 4 (3-hop)
    expect(results[3].pattern.length).toBe(7);

    // Index 4: Person 2 zero-hop - pattern = [node2]
    expect(results[4].pattern.length).toBe(1);
    expect(results[4].pattern[0].id).toBe(2);

    // Index 5: Person 2 -> Person 3 (1-hop)
    expect(results[5].pattern.length).toBe(3);

    // Index 6: Person 2 -> Person 3 -> Person 4 (2-hop)
    expect(results[6].pattern.length).toBe(5);

    // Index 7: Person 3 zero-hop - pattern = [node3]
    expect(results[7].pattern.length).toBe(1);
    expect(results[7].pattern[0].id).toBe(3);

    // Index 8: Person 3 -> Person 4 (1-hop)
    expect(results[8].pattern.length).toBe(3);

    // Index 9: Person 4 zero-hop - pattern = [node4]
    expect(results[9].pattern.length).toBe(1);
    expect(results[9].pattern[0].id).toBe(4);
});

// ============================================================
// Add operator tests
// ============================================================

test("Test add two integers", async () => {
    const runner = new Runner("return 1 + 2 as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: 3 });
});

test("Test add negative number", async () => {
    const runner = new Runner("return -3 + 7 as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: 4 });
});

test("Test add to negative result", async () => {
    const runner = new Runner("return 0 - 10 + 4 as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: -6 });
});

test("Test add zero", async () => {
    const runner = new Runner("return 42 + 0 as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: 42 });
});

test("Test add floating point numbers", async () => {
    const runner = new Runner("return 1.5 + 2.3 as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0].result).toBeCloseTo(3.8);
});

test("Test add integer and float", async () => {
    const runner = new Runner("return 1 + 0.5 as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0].result).toBeCloseTo(1.5);
});

test("Test add strings", async () => {
    const runner = new Runner('return "hello" + " world" as result');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: "hello world" });
});

test("Test add empty strings", async () => {
    const runner = new Runner('return "" + "" as result');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: "" });
});

test("Test add string and empty string", async () => {
    const runner = new Runner('return "hello" + "" as result');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: "hello" });
});

test("Test add two lists", async () => {
    const runner = new Runner("return [1, 2] + [3, 4] as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: [1, 2, 3, 4] });
});

test("Test add empty list to list", async () => {
    const runner = new Runner("return [1, 2, 3] + [] as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: [1, 2, 3] });
});

test("Test add two empty lists", async () => {
    const runner = new Runner("return [] + [] as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: [] });
});

test("Test add lists with mixed types", async () => {
    const runner = new Runner('return [1, "a"] + [2, "b"] as result');
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: [1, "a", 2, "b"] });
});

test("Test add chained three numbers", async () => {
    const runner = new Runner("return 1 + 2 + 3 as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: 6 });
});

test("Test add chained multiple numbers", async () => {
    const runner = new Runner("return 10 + 20 + 30 + 40 as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: 100 });
});

test("Test add large numbers", async () => {
    const runner = new Runner("return 1000000 + 2000000 as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: 3000000 });
});

test("Test add with unwind", async () => {
    const runner = new Runner("unwind [1, 2, 3] as x return x + 10 as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ result: 11 });
    expect(results[1]).toEqual({ result: 12 });
    expect(results[2]).toEqual({ result: 13 });
});

test("Test add with multiple return expressions", async () => {
    const runner = new Runner("return 1 + 2 as sum1, 3 + 4 as sum2, 5 + 6 as sum3");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ sum1: 3, sum2: 7, sum3: 11 });
});

test("Test add mixed with other operators", async () => {
    const runner = new Runner("return 2 + 3 * 4 as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: 14 });
});

test("Test add with parentheses", async () => {
    const runner = new Runner("return (2 + 3) * 4 as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: 20 });
});

test("Test add nested lists", async () => {
    const runner = new Runner("return [[1, 2]] + [[3, 4]] as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({
        result: [
            [1, 2],
            [3, 4],
        ],
    });
});

test("Test add with with clause", async () => {
    const runner = new Runner("with 5 as a, 10 as b return a + b as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: 15 });
});

// ============================================================
// UNION and UNION ALL tests
// ============================================================

test("Test UNION with simple values", async () => {
    const runner = new Runner("WITH 1 AS x RETURN x UNION WITH 2 AS x RETURN x");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results).toEqual([{ x: 1 }, { x: 2 }]);
});

test("Test UNION removes duplicates", async () => {
    const runner = new Runner("WITH 1 AS x RETURN x UNION WITH 1 AS x RETURN x");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results).toEqual([{ x: 1 }]);
});

test("Test UNION ALL keeps duplicates", async () => {
    const runner = new Runner("WITH 1 AS x RETURN x UNION ALL WITH 1 AS x RETURN x");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results).toEqual([{ x: 1 }, { x: 1 }]);
});

test("Test UNION with multiple columns", async () => {
    const runner = new Runner(
        "WITH 1 AS a, 'hello' AS b RETURN a, b UNION WITH 2 AS a, 'world' AS b RETURN a, b"
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results).toEqual([
        { a: 1, b: "hello" },
        { a: 2, b: "world" },
    ]);
});

test("Test UNION ALL with multiple columns", async () => {
    const runner = new Runner(
        "WITH 1 AS a RETURN a UNION ALL WITH 2 AS a RETURN a UNION ALL WITH 3 AS a RETURN a"
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results).toEqual([{ a: 1 }, { a: 2 }, { a: 3 }]);
});

test("Test chained UNION removes duplicates across all branches", async () => {
    const runner = new Runner(
        "WITH 1 AS x RETURN x UNION WITH 2 AS x RETURN x UNION WITH 1 AS x RETURN x"
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results).toEqual([{ x: 1 }, { x: 2 }]);
});

test("Test UNION with unwind", async () => {
    const runner = new Runner("UNWIND [1, 2] AS x RETURN x UNION UNWIND [3, 4] AS x RETURN x");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(4);
    expect(results).toEqual([{ x: 1 }, { x: 2 }, { x: 3 }, { x: 4 }]);
});

test("Test UNION with mismatched columns throws error", async () => {
    const runner = new Runner("WITH 1 AS x RETURN x UNION WITH 2 AS y RETURN y");
    await expect(runner.run()).rejects.toThrow(
        "All sub queries in a UNION must have the same return column names"
    );
});

test("Test UNION with empty left side", async () => {
    const runner = new Runner("UNWIND [] AS x RETURN x UNION WITH 1 AS x RETURN x");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results).toEqual([{ x: 1 }]);
});

test("Test UNION with empty right side", async () => {
    const runner = new Runner("WITH 1 AS x RETURN x UNION UNWIND [] AS x RETURN x");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results).toEqual([{ x: 1 }]);
});

test("Test language name hits query with virtual graph", async () => {
    // Create Language nodes
    await new Runner(`
        CREATE VIRTUAL (:Language) AS {
            UNWIND [
                {id: 1, name: 'Python'},
                {id: 2, name: 'JavaScript'},
                {id: 3, name: 'TypeScript'}
            ] AS record
            RETURN record.id AS id, record.name AS name
        }
    `).run();

    // Create Chat nodes with messages
    await new Runner(`
        CREATE VIRTUAL (:Chat) AS {
            UNWIND [
                {id: 1, name: 'Dev Discussion', messages: [
                    {From: 'Alice', SentDateTime: '2025-01-01T10:00:00', Content: 'I love Python and JavaScript'},
                    {From: 'Bob', SentDateTime: '2025-01-01T10:05:00', Content: 'What languages do you prefer?'}
                ]},
                {id: 2, name: 'General', messages: [
                    {From: 'Charlie', SentDateTime: '2025-01-02T09:00:00', Content: 'The weather is nice today'},
                    {From: 'Alice', SentDateTime: '2025-01-02T09:05:00', Content: 'TypeScript is great for language tooling'}
                ]}
            ] AS record
            RETURN record.id AS id, record.name AS name, record.messages AS messages
        }
    `).run();

    // Create User nodes
    await new Runner(`
        CREATE VIRTUAL (:User) AS {
            UNWIND [
                {id: 1, displayName: 'Alice'},
                {id: 2, displayName: 'Bob'},
                {id: 3, displayName: 'Charlie'}
            ] AS record
            RETURN record.id AS id, record.displayName AS displayName
        }
    `).run();

    // Create PARTICIPATES_IN relationships
    await new Runner(`
        CREATE VIRTUAL (:User)-[:PARTICIPATES_IN]-(:Chat) AS {
            UNWIND [
                {left_id: 1, right_id: 1},
                {left_id: 2, right_id: 1},
                {left_id: 3, right_id: 2},
                {left_id: 1, right_id: 2}
            ] AS record
            RETURN record.left_id AS left_id, record.right_id AS right_id
        }
    `).run();

    // Run the original query (using 'sender' alias since 'from' is a reserved keyword)
    const runner = new Runner(`
        MATCH (l:Language)
        WITH collect(distinct l.name) AS langs
        MATCH (c:Chat)
        UNWIND c.messages AS msg
        WITH c, msg, langs,
             sum(lang IN langs | 1 where toLower(msg.Content) CONTAINS toLower(lang)) AS langNameHits
        WHERE toLower(msg.Content) CONTAINS "language"
           OR toLower(msg.Content) CONTAINS "languages"
           OR langNameHits > 0
        OPTIONAL MATCH (u:User)-[:PARTICIPATES_IN]->(c)
        RETURN
          c.name AS chat,
          collect(distinct u.displayName) AS participants,
          msg.From AS sender,
          msg.SentDateTime AS sentDateTime,
          msg.Content AS message
    `);
    await runner.run();
    const results = runner.results;

    // Messages that mention a language name or the word "language(s)":
    // 1. "I love Python and JavaScript" - langNameHits=2 (matches Python and JavaScript)
    // 2. "What languages do you prefer?" - contains "languages"
    // 3. "TypeScript is great for language tooling" - langNameHits=1, also contains "language"
    expect(results.length).toBe(3);
    expect(results[0].chat).toBe("Dev Discussion");
    expect(results[0].message).toBe("I love Python and JavaScript");
    expect(results[0].sender).toBe("Alice");
    expect(results[1].chat).toBe("Dev Discussion");
    expect(results[1].message).toBe("What languages do you prefer?");
    expect(results[1].sender).toBe("Bob");
    expect(results[2].chat).toBe("General");
    expect(results[2].message).toBe("TypeScript is great for language tooling");
    expect(results[2].sender).toBe("Alice");
});

test("Test sum with empty collected array", async () => {
    // Reproduces the original bug: collect on empty input should yield []
    // and sum over that empty array should return 0, not throw
    const runner = new Runner(`
        UNWIND [] AS lang
        WITH collect(distinct lang) AS langs
        UNWIND ['hello', 'world'] AS msg
        WITH msg, langs, sum(l IN langs | 1 where toLower(msg) CONTAINS toLower(l)) AS hits
        RETURN msg, hits
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ msg: "hello", hits: 0 });
    expect(results[1]).toEqual({ msg: "world", hits: 0 });
});

test("Test sum where all elements filtered returns 0", async () => {
    const runner = new Runner("RETURN sum(n in [1, 2, 3] | n where n > 100) as sum");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ sum: 0 });
});

test("Test sum over empty array returns 0", async () => {
    const runner = new Runner("WITH [] AS arr RETURN sum(n in arr | n) as sum");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ sum: 0 });
});

test("Test match with ORed relationship types", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Person) AS {
            unwind [
                {id: 1, name: 'Alice'},
                {id: 2, name: 'Bob'},
                {id: 3, name: 'Charlie'}
            ] as record
            RETURN record.id as id, record.name as name
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Person)-[:KNOWS]-(:Person) AS {
            unwind [
                {left_id: 1, right_id: 2}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Person)-[:FOLLOWS]-(:Person) AS {
            unwind [
                {left_id: 2, right_id: 3}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }
    `).run();
    const match = new Runner(`
        MATCH (a:Person)-[:KNOWS|FOLLOWS]->(b:Person)
        RETURN a.name AS name1, b.name AS name2
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ name1: "Alice", name2: "Bob" });
    expect(results[1]).toEqual({ name1: "Bob", name2: "Charlie" });
});

test("Test match with ORed relationship types with optional colon syntax", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Animal) AS {
            unwind [
                {id: 1, name: 'Cat'},
                {id: 2, name: 'Dog'},
                {id: 3, name: 'Fish'}
            ] as record
            RETURN record.id as id, record.name as name
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Animal)-[:CHASES]-(:Animal) AS {
            unwind [
                {left_id: 1, right_id: 2}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Animal)-[:EATS]-(:Animal) AS {
            unwind [
                {left_id: 1, right_id: 3}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }
    `).run();
    const match = new Runner(`
        MATCH (a:Animal)-[:CHASES|:EATS]->(b:Animal)
        RETURN a.name AS name1, b.name AS name2
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ name1: "Cat", name2: "Dog" });
    expect(results[1]).toEqual({ name1: "Cat", name2: "Fish" });
});

test("Test match with ORed relationship types returns correct type in relationship variable", async () => {
    await new Runner(`
        CREATE VIRTUAL (:City) AS {
            unwind [
                {id: 1, name: 'NYC'},
                {id: 2, name: 'LA'},
                {id: 3, name: 'Chicago'}
            ] as record
            RETURN record.id as id, record.name as name
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:City)-[:FLIGHT]-(:City) AS {
            unwind [
                {left_id: 1, right_id: 2, airline: 'Delta'}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id, record.airline as airline
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:City)-[:TRAIN]-(:City) AS {
            unwind [
                {left_id: 1, right_id: 3, line: 'Amtrak'}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id, record.line as line
        }
    `).run();
    const match = new Runner(`
        MATCH (a:City)-[r:FLIGHT|TRAIN]->(b:City)
        RETURN a.name AS from, b.name AS to, r.type AS type
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ from: "NYC", to: "LA", type: "FLIGHT" });
    expect(results[1]).toEqual({ from: "NYC", to: "Chicago", type: "TRAIN" });
});

test("Test relationship properties can be accessed directly via dot notation", async () => {
    await new Runner(`
        CREATE VIRTUAL (:City) AS {
            unwind [
                {id: 1, name: 'NYC'},
                {id: 2, name: 'LA'},
                {id: 3, name: 'Chicago'}
            ] as record
            RETURN record.id as id, record.name as name
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:City)-[:FLIGHT]-(:City) AS {
            unwind [
                {left_id: 1, right_id: 2, airline: 'Delta', duration: 5}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id, record.airline as airline, record.duration as duration
        }
    `).run();
    const match = new Runner(`
        MATCH (a:City)-[r:FLIGHT]->(b:City)
        RETURN a.name AS from, b.name AS to, r.airline AS airline, r.duration AS duration
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ from: "NYC", to: "LA", airline: "Delta", duration: 5 });
});

test("Test relationship properties accessible via both direct access and properties()", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Person) AS {
            unwind [
                {id: 1, name: 'Alice'},
                {id: 2, name: 'Bob'}
            ] as record
            RETURN record.id as id, record.name as name
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Person)-[:KNOWS]-(:Person) AS {
            unwind [
                {left_id: 1, right_id: 2, since: 2020, strength: 'strong'}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id, record.since as since, record.strength as strength
        }
    `).run();
    const match = new Runner(`
        MATCH (a:Person)-[r:KNOWS]->(b:Person)
        RETURN a.name AS from, b.name AS to, r.since AS since, r.strength AS strength, properties(r).since AS propSince
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({
        from: "Alice",
        to: "Bob",
        since: 2020,
        strength: "strong",
        propSince: 2020,
    });
});

test("Test coalesce returns first non-null value", async () => {
    const runner = new Runner("RETURN coalesce(null, null, 'hello', 'world') as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: "hello" });
});

test("Test coalesce returns first argument when not null", async () => {
    const runner = new Runner("RETURN coalesce('first', 'second') as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: "first" });
});

test("Test coalesce returns null when all arguments are null", async () => {
    const runner = new Runner("RETURN coalesce(null, null, null) as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: null });
});

test("Test coalesce with single non-null argument", async () => {
    const runner = new Runner("RETURN coalesce(42) as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: 42 });
});

test("Test coalesce with mixed types", async () => {
    const runner = new Runner("RETURN coalesce(null, 42, 'hello') as result");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: 42 });
});

test("Test coalesce with property access", async () => {
    const runner = new Runner(
        "WITH {name: 'Alice'} AS person RETURN coalesce(person.nickname, person.name) as result"
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ result: "Alice" });
});

// ============================================================
// Temporal / Time Functions
// ============================================================

test("Test datetime() returns current datetime object", async () => {
    const before = Date.now();
    const runner = new Runner("RETURN datetime() AS dt");
    await runner.run();
    const after = Date.now();
    const results = runner.results;
    expect(results.length).toBe(1);
    const dt = results[0].dt;
    expect(dt).toBeDefined();
    expect(typeof dt.year).toBe("number");
    expect(typeof dt.month).toBe("number");
    expect(typeof dt.day).toBe("number");
    expect(typeof dt.hour).toBe("number");
    expect(typeof dt.minute).toBe("number");
    expect(typeof dt.second).toBe("number");
    expect(typeof dt.millisecond).toBe("number");
    expect(typeof dt.epochMillis).toBe("number");
    expect(typeof dt.epochSeconds).toBe("number");
    expect(typeof dt.dayOfWeek).toBe("number");
    expect(typeof dt.dayOfYear).toBe("number");
    expect(typeof dt.quarter).toBe("number");
    expect(typeof dt.formatted).toBe("string");
    // epochMillis should be between before and after
    expect(dt.epochMillis).toBeGreaterThanOrEqual(before);
    expect(dt.epochMillis).toBeLessThanOrEqual(after);
});

test("Test datetime() with ISO string argument", async () => {
    const runner = new Runner("RETURN datetime('2025-06-15T12:30:45.123Z') AS dt");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    const dt = results[0].dt;
    expect(dt.year).toBe(2025);
    expect(dt.month).toBe(6);
    expect(dt.day).toBe(15);
    expect(dt.hour).toBe(12);
    expect(dt.minute).toBe(30);
    expect(dt.second).toBe(45);
    expect(dt.millisecond).toBe(123);
    expect(dt.formatted).toBe("2025-06-15T12:30:45.123Z");
});

test("Test datetime() property access", async () => {
    const runner = new Runner(
        "WITH datetime('2025-06-15T12:30:45.123Z') AS dt RETURN dt.year AS year, dt.month AS month, dt.day AS day"
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ year: 2025, month: 6, day: 15 });
});

test("Test date() returns current date object", async () => {
    const runner = new Runner("RETURN date() AS d");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    const d = results[0].d;
    expect(d).toBeDefined();
    expect(typeof d.year).toBe("number");
    expect(typeof d.month).toBe("number");
    expect(typeof d.day).toBe("number");
    expect(typeof d.epochMillis).toBe("number");
    expect(typeof d.dayOfWeek).toBe("number");
    expect(typeof d.dayOfYear).toBe("number");
    expect(typeof d.quarter).toBe("number");
    expect(typeof d.formatted).toBe("string");
    // Should not have time fields
    expect(d.hour).toBeUndefined();
    expect(d.minute).toBeUndefined();
});

test("Test date() with ISO date string", async () => {
    const runner = new Runner("RETURN date('2025-06-15') AS d");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    const d = results[0].d;
    expect(d.year).toBe(2025);
    expect(d.month).toBe(6);
    expect(d.day).toBe(15);
    expect(d.formatted).toBe("2025-06-15");
});

test("Test date() dayOfWeek and quarter", async () => {
    // 2025-06-15 is a Sunday
    const runner = new Runner("RETURN date('2025-06-15') AS d");
    await runner.run();
    const d = runner.results[0].d;
    expect(d.dayOfWeek).toBe(7); // Sunday = 7 in ISO
    expect(d.quarter).toBe(2); // June = Q2
});

test("Test time() returns current UTC time", async () => {
    const runner = new Runner("RETURN time() AS t");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    const t = results[0].t;
    expect(typeof t.hour).toBe("number");
    expect(typeof t.minute).toBe("number");
    expect(typeof t.second).toBe("number");
    expect(typeof t.millisecond).toBe("number");
    expect(typeof t.formatted).toBe("string");
    expect(t.formatted).toMatch(/Z$/); // UTC time ends in Z
});

test("Test localtime() returns current local time", async () => {
    const runner = new Runner("RETURN localtime() AS t");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    const t = results[0].t;
    expect(typeof t.hour).toBe("number");
    expect(typeof t.minute).toBe("number");
    expect(typeof t.second).toBe("number");
    expect(typeof t.millisecond).toBe("number");
    expect(typeof t.formatted).toBe("string");
    expect(t.formatted).not.toMatch(/Z$/); // Local time does not end in Z
});

test("Test localdatetime() returns current local datetime", async () => {
    const runner = new Runner("RETURN localdatetime() AS dt");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    const dt = results[0].dt;
    expect(typeof dt.year).toBe("number");
    expect(typeof dt.month).toBe("number");
    expect(typeof dt.day).toBe("number");
    expect(typeof dt.hour).toBe("number");
    expect(typeof dt.minute).toBe("number");
    expect(typeof dt.second).toBe("number");
    expect(typeof dt.millisecond).toBe("number");
    expect(typeof dt.epochMillis).toBe("number");
    expect(typeof dt.formatted).toBe("string");
    expect(dt.formatted).not.toMatch(/Z$/); // Local datetime does not end in Z
});

test("Test localdatetime() with string argument", async () => {
    const runner = new Runner("RETURN localdatetime('2025-01-20T08:15:30.500Z') AS dt");
    await runner.run();
    const dt = runner.results[0].dt;
    expect(typeof dt.year).toBe("number");
    expect(typeof dt.hour).toBe("number");
    expect(dt.epochMillis).toBeDefined();
});

test("Test timestamp() returns epoch millis", async () => {
    const before = Date.now();
    const runner = new Runner("RETURN timestamp() AS ts");
    await runner.run();
    const after = Date.now();
    const results = runner.results;
    expect(results.length).toBe(1);
    const ts = results[0].ts;
    expect(typeof ts).toBe("number");
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
});

test("Test datetime() epochMillis matches timestamp()", async () => {
    const runner = new Runner(
        "WITH datetime() AS dt, timestamp() AS ts RETURN dt.epochMillis AS dtMillis, ts AS tsMillis"
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    // They should be very close (within a few ms)
    expect(Math.abs(results[0].dtMillis - results[0].tsMillis)).toBeLessThan(100);
});

test("Test date() with property access in WHERE", async () => {
    const runner = new Runner(
        "UNWIND [1, 2, 3] AS x WITH x, date('2025-06-15') AS d WHERE d.quarter = 2 RETURN x"
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3); // All 3 pass through since Q2 = 2
});

test("Test datetime() with map argument", async () => {
    const runner = new Runner(
        "RETURN datetime({year: 2024, month: 12, day: 25, hour: 10, minute: 30}) AS dt"
    );
    await runner.run();
    const dt = runner.results[0].dt;
    expect(dt.year).toBe(2024);
    expect(dt.month).toBe(12);
    expect(dt.day).toBe(25);
    expect(dt.quarter).toBe(4); // December = Q4
});

test("Test date() with map argument", async () => {
    const runner = new Runner("RETURN date({year: 2025, month: 3, day: 1}) AS d");
    await runner.run();
    const d = runner.results[0].d;
    expect(d.year).toBe(2025);
    expect(d.month).toBe(3);
    expect(d.day).toBe(1);
    expect(d.quarter).toBe(1); // March = Q1
});

test("Test id() function with node", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Person) AS {
            UNWIND [
                {id: 1, name: 'Alice'},
                {id: 2, name: 'Bob'}
            ] AS record
            RETURN record.id AS id, record.name AS name
        }
    `).run();
    const match = new Runner(`
        MATCH (n:Person)
        RETURN id(n) AS nodeId
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ nodeId: 1 });
    expect(results[1]).toEqual({ nodeId: 2 });
});

test("Test id() function with null", async () => {
    const runner = new Runner("RETURN id(null) AS nodeId");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ nodeId: null });
});

test("Test id() function with relationship", async () => {
    await new Runner(`
        CREATE VIRTUAL (:City) AS {
            UNWIND [
                {id: 1, name: 'New York'},
                {id: 2, name: 'Boston'}
            ] AS record
            RETURN record.id AS id, record.name AS name
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:City)-[:CONNECTED_TO]-(:City) AS {
            UNWIND [
                {left_id: 1, right_id: 2}
            ] AS record
            RETURN record.left_id AS left_id, record.right_id AS right_id
        }
    `).run();
    const match = new Runner(`
        MATCH (a:City)-[r:CONNECTED_TO]->(b:City)
        RETURN id(r) AS relId
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ relId: "CONNECTED_TO" });
});

test("Test elementId() function with node", async () => {
    await new Runner(`
        CREATE VIRTUAL (:Person) AS {
            UNWIND [
                {id: 1, name: 'Alice'},
                {id: 2, name: 'Bob'}
            ] AS record
            RETURN record.id AS id, record.name AS name
        }
    `).run();
    const match = new Runner(`
        MATCH (n:Person)
        RETURN elementId(n) AS eid
    `);
    await match.run();
    const results = match.results;
    expect(results.length).toBe(2);
    expect(results[0]).toEqual({ eid: "1" });
    expect(results[1]).toEqual({ eid: "2" });
});

test("Test elementId() function with null", async () => {
    const runner = new Runner("RETURN elementId(null) AS eid");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(1);
    expect(results[0]).toEqual({ eid: null });
});

test("Test head() function", async () => {
    const runner = new Runner("RETURN head([1, 2, 3]) AS h");
    await runner.run();
    expect(runner.results.length).toBe(1);
    expect(runner.results[0]).toEqual({ h: 1 });
});

test("Test head() function with empty list", async () => {
    const runner = new Runner("RETURN head([]) AS h");
    await runner.run();
    expect(runner.results[0]).toEqual({ h: null });
});

test("Test head() function with null", async () => {
    const runner = new Runner("RETURN head(null) AS h");
    await runner.run();
    expect(runner.results[0]).toEqual({ h: null });
});

test("Test tail() function", async () => {
    const runner = new Runner("RETURN tail([1, 2, 3]) AS t");
    await runner.run();
    expect(runner.results.length).toBe(1);
    expect(runner.results[0]).toEqual({ t: [2, 3] });
});

test("Test tail() function with single element", async () => {
    const runner = new Runner("RETURN tail([1]) AS t");
    await runner.run();
    expect(runner.results[0]).toEqual({ t: [] });
});

test("Test tail() function with null", async () => {
    const runner = new Runner("RETURN tail(null) AS t");
    await runner.run();
    expect(runner.results[0]).toEqual({ t: null });
});

test("Test last() function", async () => {
    const runner = new Runner("RETURN last([1, 2, 3]) AS l");
    await runner.run();
    expect(runner.results.length).toBe(1);
    expect(runner.results[0]).toEqual({ l: 3 });
});

test("Test last() function with empty list", async () => {
    const runner = new Runner("RETURN last([]) AS l");
    await runner.run();
    expect(runner.results[0]).toEqual({ l: null });
});

test("Test last() function with null", async () => {
    const runner = new Runner("RETURN last(null) AS l");
    await runner.run();
    expect(runner.results[0]).toEqual({ l: null });
});

test("Test toInteger() function with string", async () => {
    const runner = new Runner('RETURN toInteger("42") AS i');
    await runner.run();
    expect(runner.results[0]).toEqual({ i: 42 });
});

test("Test toInteger() function with float", async () => {
    const runner = new Runner("RETURN toInteger(3.14) AS i");
    await runner.run();
    expect(runner.results[0]).toEqual({ i: 3 });
});

test("Test toInteger() function with boolean", async () => {
    const runner = new Runner("RETURN toInteger(true) AS i");
    await runner.run();
    expect(runner.results[0]).toEqual({ i: 1 });
});

test("Test toInteger() function with null", async () => {
    const runner = new Runner("RETURN toInteger(null) AS i");
    await runner.run();
    expect(runner.results[0]).toEqual({ i: null });
});

test("Test toFloat() function with string", async () => {
    const runner = new Runner('RETURN toFloat("3.14") AS f');
    await runner.run();
    expect(runner.results[0]).toEqual({ f: 3.14 });
});

test("Test toFloat() function with integer", async () => {
    const runner = new Runner("RETURN toFloat(42) AS f");
    await runner.run();
    expect(runner.results[0]).toEqual({ f: 42 });
});

test("Test toFloat() function with boolean", async () => {
    const runner = new Runner("RETURN toFloat(true) AS f");
    await runner.run();
    expect(runner.results[0]).toEqual({ f: 1.0 });
});

test("Test toFloat() function with null", async () => {
    const runner = new Runner("RETURN toFloat(null) AS f");
    await runner.run();
    expect(runner.results[0]).toEqual({ f: null });
});

test("Test duration() with ISO 8601 string", async () => {
    const runner = new Runner("RETURN duration('P1Y2M3DT4H5M6S') AS d");
    await runner.run();
    const d = runner.results[0].d;
    expect(d.years).toBe(1);
    expect(d.months).toBe(2);
    expect(d.days).toBe(3);
    expect(d.hours).toBe(4);
    expect(d.minutes).toBe(5);
    expect(d.seconds).toBe(6);
    expect(d.totalMonths).toBe(14);
    expect(d.formatted).toBe("P1Y2M3DT4H5M6S");
});

test("Test duration() with map argument", async () => {
    const runner = new Runner("RETURN duration({days: 14, hours: 16}) AS d");
    await runner.run();
    const d = runner.results[0].d;
    expect(d.days).toBe(14);
    expect(d.hours).toBe(16);
    expect(d.totalDays).toBe(14);
    expect(d.totalSeconds).toBe(57600);
});

test("Test duration() with weeks", async () => {
    const runner = new Runner("RETURN duration('P2W') AS d");
    await runner.run();
    const d = runner.results[0].d;
    expect(d.weeks).toBe(2);
    expect(d.days).toBe(14);
    expect(d.totalDays).toBe(14);
});

test("Test duration() with null", async () => {
    const runner = new Runner("RETURN duration(null) AS d");
    await runner.run();
    expect(runner.results[0]).toEqual({ d: null });
});

test("Test duration() with time only", async () => {
    const runner = new Runner("RETURN duration('PT2H30M') AS d");
    await runner.run();
    const d = runner.results[0].d;
    expect(d.hours).toBe(2);
    expect(d.minutes).toBe(30);
    expect(d.totalSeconds).toBe(9000);
    expect(d.formatted).toBe("PT2H30M");
});

// ORDER BY tests

test("Test order by ascending", async () => {
    const runner = new Runner("unwind [3, 1, 2] as x return x order by x");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ x: 1 });
    expect(results[1]).toEqual({ x: 2 });
    expect(results[2]).toEqual({ x: 3 });
});

test("Test order by descending", async () => {
    const runner = new Runner("unwind [3, 1, 2] as x return x order by x desc");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ x: 3 });
    expect(results[1]).toEqual({ x: 2 });
    expect(results[2]).toEqual({ x: 1 });
});

test("Test order by ascending explicit", async () => {
    const runner = new Runner("unwind [3, 1, 2] as x return x order by x asc");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ x: 1 });
    expect(results[1]).toEqual({ x: 2 });
    expect(results[2]).toEqual({ x: 3 });
});

test("Test order by with multiple fields", async () => {
    const runner = new Runner(`
        unwind [{name: 'Alice', age: 30}, {name: 'Bob', age: 25}, {name: 'Alice', age: 25}] as person
        return person.name as name, person.age as age
        order by name asc, age asc
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ name: "Alice", age: 25 });
    expect(results[1]).toEqual({ name: "Alice", age: 30 });
    expect(results[2]).toEqual({ name: "Bob", age: 25 });
});

test("Test order by with strings", async () => {
    const runner = new Runner(
        "unwind ['banana', 'apple', 'cherry'] as fruit return fruit order by fruit"
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ fruit: "apple" });
    expect(results[1]).toEqual({ fruit: "banana" });
    expect(results[2]).toEqual({ fruit: "cherry" });
});

test("Test order by with aggregated return", async () => {
    const runner = new Runner(`
        unwind [1, 1, 2, 2, 3, 3] as x
        return x, count(x) as cnt
        order by x desc
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ x: 3, cnt: 2 });
    expect(results[1]).toEqual({ x: 2, cnt: 2 });
    expect(results[2]).toEqual({ x: 1, cnt: 2 });
});

test("Test order by with limit", async () => {
    const runner = new Runner("unwind [3, 1, 4, 1, 5, 9, 2, 6] as x return x order by x limit 3");
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ x: 1 });
    expect(results[1]).toEqual({ x: 1 });
    expect(results[2]).toEqual({ x: 2 });
});

test("Test order by with where", async () => {
    const runner = new Runner(
        "unwind [3, 1, 4, 1, 5, 9, 2, 6] as x return x where x > 2 order by x desc"
    );
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(5);
    expect(results[0]).toEqual({ x: 9 });
    expect(results[1]).toEqual({ x: 6 });
    expect(results[2]).toEqual({ x: 5 });
    expect(results[3]).toEqual({ x: 4 });
    expect(results[4]).toEqual({ x: 3 });
});

test("Test order by with property access expression", async () => {
    const runner = new Runner(`
        unwind [{name: 'Charlie', age: 30}, {name: 'Alice', age: 25}, {name: 'Bob', age: 35}] as person
        return person.name as name, person.age as age
        order by person.name asc
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ name: "Alice", age: 25 });
    expect(results[1]).toEqual({ name: "Bob", age: 35 });
    expect(results[2]).toEqual({ name: "Charlie", age: 30 });
});

test("Test order by with function expression", async () => {
    const runner = new Runner(`
        unwind ['BANANA', 'apple', 'Cherry'] as fruit
        return fruit
        order by toLower(fruit)
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ fruit: "apple" });
    expect(results[1]).toEqual({ fruit: "BANANA" });
    expect(results[2]).toEqual({ fruit: "Cherry" });
});

test("Test order by with function expression descending", async () => {
    const runner = new Runner(`
        unwind ['BANANA', 'apple', 'Cherry'] as fruit
        return fruit
        order by toLower(fruit) desc
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ fruit: "Cherry" });
    expect(results[1]).toEqual({ fruit: "BANANA" });
    expect(results[2]).toEqual({ fruit: "apple" });
});

test("Test order by with nested function expression", async () => {
    const runner = new Runner(`
        unwind ['Alice', 'Bob', 'ALICE', 'bob'] as name
        return name
        order by string_distance(toLower(name), toLower('alice')) asc
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(4);
    // 'Alice' and 'ALICE' have distance 0 from 'alice', should come first
    expect(results[0].name).toBe("Alice");
    expect(results[1].name).toBe("ALICE");
    // 'Bob' and 'bob' have higher distance from 'alice'
    expect(results[2].name).toBe("Bob");
    expect(results[3].name).toBe("bob");
});

test("Test order by with arithmetic expression", async () => {
    const runner = new Runner(`
        unwind [{a: 3, b: 1}, {a: 1, b: 5}, {a: 2, b: 2}] as item
        return item.a as a, item.b as b
        order by item.a + item.b asc
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ a: 3, b: 1 }); // sum = 4
    expect(results[1]).toEqual({ a: 2, b: 2 }); // sum = 4
    expect(results[2]).toEqual({ a: 1, b: 5 }); // sum = 6
});

test("Test order by expression does not leak synthetic keys", async () => {
    const runner = new Runner(`
        unwind ['B', 'a', 'C'] as x
        return x
        order by toLower(x) asc
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    // Results should only contain 'x', no __orderBy_ keys
    for (const r of results) {
        expect(Object.keys(r)).toEqual(["x"]);
    }
    expect(results[0]).toEqual({ x: "a" });
    expect(results[1]).toEqual({ x: "B" });
    expect(results[2]).toEqual({ x: "C" });
});

test("Test order by with expression and limit", async () => {
    const runner = new Runner(`
        unwind ['BANANA', 'apple', 'Cherry', 'date', 'ELDERBERRY'] as fruit
        return fruit
        order by toLower(fruit) asc
        limit 3
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ fruit: "apple" });
    expect(results[1]).toEqual({ fruit: "BANANA" });
    expect(results[2]).toEqual({ fruit: "Cherry" });
});

test("Test order by with mixed simple and expression fields", async () => {
    const runner = new Runner(`
        unwind [{name: 'Alice', score: 3}, {name: 'Alice', score: 1}, {name: 'Bob', score: 2}] as item
        return item.name as name, item.score as score
        order by name asc, item.score desc
    `);
    await runner.run();
    const results = runner.results;
    expect(results.length).toBe(3);
    expect(results[0]).toEqual({ name: "Alice", score: 3 }); // Alice, score 3 desc
    expect(results[1]).toEqual({ name: "Alice", score: 1 }); // Alice, score 1 desc
    expect(results[2]).toEqual({ name: "Bob", score: 2 }); // Bob
});

test("Test delete virtual node operation", async () => {
    const db = Database.getInstance();
    // Create a virtual node first
    const create = new Runner(`
        CREATE VIRTUAL (:DeleteTestPerson) AS {
            unwind [
                {id: 1, name: 'Person 1'},
                {id: 2, name: 'Person 2'}
            ] as record
            RETURN record.id as id, record.name as name
        }
    `);
    await create.run();
    expect(db.getNode(new Node(null, "DeleteTestPerson"))).not.toBeNull();

    // Delete the virtual node
    const del = new Runner("DELETE VIRTUAL (:DeleteTestPerson)");
    await del.run();
    expect(del.results.length).toBe(0);
    expect(db.getNode(new Node(null, "DeleteTestPerson"))).toBeNull();
});

test("Test delete virtual node then match throws", async () => {
    // Create a virtual node
    const create = new Runner(`
        CREATE VIRTUAL (:DeleteMatchPerson) AS {
            unwind [{id: 1, name: 'Alice'}] as record
            RETURN record.id as id, record.name as name
        }
    `);
    await create.run();

    // Verify it can be matched
    const match1 = new Runner("MATCH (n:DeleteMatchPerson) RETURN n");
    await match1.run();
    expect(match1.results.length).toBe(1);

    // Delete the virtual node
    const del = new Runner("DELETE VIRTUAL (:DeleteMatchPerson)");
    await del.run();

    // Matching should now throw since the node is gone
    const match2 = new Runner("MATCH (n:DeleteMatchPerson) RETURN n");
    await expect(match2.run()).rejects.toThrow();
});

test("Test delete virtual relationship operation", async () => {
    const db = Database.getInstance();
    // Create virtual nodes and relationship
    await new Runner(`
        CREATE VIRTUAL (:DelRelUser) AS {
            unwind [
                {id: 1, name: 'Alice'},
                {id: 2, name: 'Bob'}
            ] as record
            RETURN record.id as id, record.name as name
        }
    `).run();

    await new Runner(`
        CREATE VIRTUAL (:DelRelUser)-[:DEL_KNOWS]-(:DelRelUser) AS {
            unwind [
                {left_id: 1, right_id: 2}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }
    `).run();

    // Verify relationship exists
    const rel = new Relationship();
    rel.type = "DEL_KNOWS";
    expect(db.getRelationship(rel)).not.toBeNull();

    // Delete the virtual relationship
    const del = new Runner("DELETE VIRTUAL (:DelRelUser)-[:DEL_KNOWS]-(:DelRelUser)");
    await del.run();
    expect(del.results.length).toBe(0);
    expect(db.getRelationship(rel)).toBeNull();
});

test("Test delete virtual node leaves other nodes intact", async () => {
    const db = Database.getInstance();
    // Create two virtual node types
    await new Runner(`
        CREATE VIRTUAL (:KeepNode) AS {
            unwind [{id: 1, name: 'Keep'}] as record
            RETURN record.id as id, record.name as name
        }
    `).run();

    await new Runner(`
        CREATE VIRTUAL (:RemoveNode) AS {
            unwind [{id: 2, name: 'Remove'}] as record
            RETURN record.id as id, record.name as name
        }
    `).run();

    expect(db.getNode(new Node(null, "KeepNode"))).not.toBeNull();
    expect(db.getNode(new Node(null, "RemoveNode"))).not.toBeNull();

    // Delete only one
    await new Runner("DELETE VIRTUAL (:RemoveNode)").run();

    // The other should still exist
    expect(db.getNode(new Node(null, "KeepNode"))).not.toBeNull();
    expect(db.getNode(new Node(null, "RemoveNode"))).toBeNull();

    // The remaining node can still be matched
    const match = new Runner("MATCH (n:KeepNode) RETURN n");
    await match.run();
    expect(match.results.length).toBe(1);
    expect(match.results[0].n.name).toBe("Keep");
});

test("Test RETURN alias shadowing graph variable in same RETURN clause", async () => {
    // Create User nodes with displayName, jobTitle, and department
    await new Runner(`
        CREATE VIRTUAL (:MentorUser) AS {
            UNWIND [
                {id: 1, displayName: 'Alice Smith', jobTitle: 'Senior Engineer', department: 'Engineering'},
                {id: 2, displayName: 'Bob Jones', jobTitle: 'Staff Engineer', department: 'Engineering'},
                {id: 3, displayName: 'Chloe Dubois', jobTitle: 'Junior Engineer', department: 'Engineering'}
            ] AS record
            RETURN record.id AS id, record.displayName AS displayName, record.jobTitle AS jobTitle, record.department AS department
        }
    `).run();

    // Create MENTORS relationships
    await new Runner(`
        CREATE VIRTUAL (:MentorUser)-[:MENTORS]-(:MentorUser) AS {
            UNWIND [
                {left_id: 1, right_id: 3},
                {left_id: 2, right_id: 3}
            ] AS record
            RETURN record.left_id AS left_id, record.right_id AS right_id
        }
    `).run();

    // This query aliases mentor.displayName AS mentor, which shadows the graph variable "mentor".
    // Subsequent expressions mentor.jobTitle and mentor.department should still reference the graph node.
    const runner = new Runner(`
        MATCH (mentor:MentorUser)-[:MENTORS]->(mentee:MentorUser)
        WHERE mentee.displayName = "Chloe Dubois"
        RETURN mentor.displayName AS mentor, mentor.jobTitle AS mentorJobTitle, mentor.department AS mentorDepartment
    `);
    await runner.run();
    const results = runner.results;

    expect(results.length).toBe(2);
    expect(results[0]).toEqual({
        mentor: "Alice Smith",
        mentorJobTitle: "Senior Engineer",
        mentorDepartment: "Engineering",
    });
    expect(results[1]).toEqual({
        mentor: "Bob Jones",
        mentorJobTitle: "Staff Engineer",
        mentorDepartment: "Engineering",
    });
});

test("Test chained optional match with null intermediate node", async () => {
    // Create a chain: A -> B -> C (C has no outgoing REPORTS_TO)
    await new Runner(`
        CREATE VIRTUAL (:Employee) AS {
            unwind [
                {id: 1, name: 'Alice'},
                {id: 2, name: 'Bob'},
                {id: 3, name: 'Charlie'}
            ] as record
            RETURN record.id as id, record.name as name
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Employee)-[:REPORTS_TO]-(:Employee) AS {
            unwind [
                {left_id: 1, right_id: 2},
                {left_id: 2, right_id: 3}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }
    `).run();

    // Alice -> Bob -> Charlie -> null -> null
    // m1=Bob, m2=Charlie, m3=null, m4=null (should not crash)
    const runner = new Runner(`
        MATCH (u:Employee)
        WHERE u.name = "Alice"
        OPTIONAL MATCH (u)-[:REPORTS_TO]->(m1:Employee)
        OPTIONAL MATCH (m1)-[:REPORTS_TO]->(m2:Employee)
        OPTIONAL MATCH (m2)-[:REPORTS_TO]->(m3:Employee)
        OPTIONAL MATCH (m3)-[:REPORTS_TO]->(m4:Employee)
        RETURN
            u.name AS user,
            m1.name AS manager1,
            m2.name AS manager2,
            m3.name AS manager3,
            m4.name AS manager4
    `);
    await runner.run();
    const results = runner.results;

    expect(results.length).toBe(1);
    expect(results[0].user).toBe("Alice");
    expect(results[0].manager1).toBe("Bob");
    expect(results[0].manager2).toBe("Charlie");
    expect(results[0].manager3).toBeNull();
    expect(results[0].manager4).toBeNull();
});

test("Test chained optional match all null from first optional", async () => {
    // Create nodes with no relationships
    await new Runner(`
        CREATE VIRTUAL (:Worker) AS {
            unwind [
                {id: 1, name: 'Solo'}
            ] as record
            RETURN record.id as id, record.name as name
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Worker)-[:MANAGES]-(:Worker) AS {
            unwind [] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }
    `).run();

    // Solo has no MANAGES relationship at all
    // m1=null, m2=null, m3=null
    const runner = new Runner(`
        MATCH (u:Worker)
        OPTIONAL MATCH (u)-[:MANAGES]->(m1:Worker)
        OPTIONAL MATCH (m1)-[:MANAGES]->(m2:Worker)
        OPTIONAL MATCH (m2)-[:MANAGES]->(m3:Worker)
        RETURN
            u.name AS user,
            m1.name AS mgr1,
            m2.name AS mgr2,
            m3.name AS mgr3
    `);
    await runner.run();
    const results = runner.results;

    expect(results.length).toBe(1);
    expect(results[0].user).toBe("Solo");
    expect(results[0].mgr1).toBeNull();
    expect(results[0].mgr2).toBeNull();
    expect(results[0].mgr3).toBeNull();
});

test("Test chained optional match with mixed null and non-null paths", async () => {
    // Two starting nodes: one with full chain, one with partial
    await new Runner(`
        CREATE VIRTUAL (:Staff) AS {
            unwind [
                {id: 1, name: 'Dev'},
                {id: 2, name: 'Lead'},
                {id: 3, name: 'Director'},
                {id: 4, name: 'Intern'}
            ] as record
            RETURN record.id as id, record.name as name
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:Staff)-[:REPORTS_TO]-(:Staff) AS {
            unwind [
                {left_id: 1, right_id: 2},
                {left_id: 2, right_id: 3}
            ] as record
            RETURN record.left_id as left_id, record.right_id as right_id
        }
    `).run();

    // Dev -> Lead -> Director -> null
    // Intern -> null -> null -> null
    const runner = new Runner(`
        MATCH (u:Staff)
        WHERE u.name = "Dev" OR u.name = "Intern"
        OPTIONAL MATCH (u)-[:REPORTS_TO]->(m1:Staff)
        OPTIONAL MATCH (m1)-[:REPORTS_TO]->(m2:Staff)
        OPTIONAL MATCH (m2)-[:REPORTS_TO]->(m3:Staff)
        RETURN
            u.name AS user,
            m1.name AS mgr1,
            m2.name AS mgr2,
            m3.name AS mgr3
    `);
    await runner.run();
    const results = runner.results;

    expect(results.length).toBe(2);
    // Dev's chain
    const dev = results.find((r: any) => r.user === "Dev");
    expect(dev.mgr1).toBe("Lead");
    expect(dev.mgr2).toBe("Director");
    expect(dev.mgr3).toBeNull();
    // Intern's chain
    const intern = results.find((r: any) => r.user === "Intern");
    expect(intern.mgr1).toBeNull();
    expect(intern.mgr2).toBeNull();
    expect(intern.mgr3).toBeNull();
});
