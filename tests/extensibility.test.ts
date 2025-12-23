import {
    Function,
    AggregateFunction,
    AsyncFunction,
    PredicateFunction,
    ReducerElement,
    FunctionDef,
    FunctionMetadata,
    FunctionDefOptions,
    ParameterSchema,
    OutputSchema,
    FunctionCategory
} from "../src/extensibility";
import {
    getRegisteredAsyncProvider,
    getFunctionMetadata
} from "../src/parsing/functions/function_metadata";

describe("Extensibility API Exports", () => {
    test("Function class is exported and can be extended", () => {
        class CustomFunction extends Function {
            constructor() {
                super("customFunc");
                this._expectedParameterCount = 1;
            }
            
            public value(): string {
                return "custom value";
            }
        }
        
        const func = new CustomFunction();
        expect(func.name).toBe("customFunc");
        expect(func.toString()).toBe("Function (customFunc)");
        expect(func.value()).toBe("custom value");
    });

    test("Function validates parameter count when set", () => {
        class TwoParamFunction extends Function {
            constructor() {
                super("twoParam");
                this._expectedParameterCount = 2;
            }
        }
        
        const func = new TwoParamFunction();
        
        // Should throw when wrong number of parameters
        expect(() => {
            func.parameters = [];
        }).toThrow("Function twoParam expected 2 parameters, but got 0");
    });

    test("Function without expected parameter count accepts any number", () => {
        class FlexibleFunction extends Function {
            constructor() {
                super("flexible");
                // _expectedParameterCount is null by default
            }
        }
        
        const func = new FlexibleFunction();
        // Should not throw
        func.parameters = [];
        expect(func.getChildren().length).toBe(0);
    });

    test("AggregateFunction class is exported and can be extended", () => {
        class SumElement extends ReducerElement {
            private _value: number = 0;
            public get value(): number {
                return this._value;
            }
            public set value(v: number) {
                this._value = v;
            }
        }
        
        class CustomSum extends AggregateFunction {
            private _total: number = 0;
            
            constructor() {
                super("customSum");
            }
            
            public reduce(element: ReducerElement): void {
                this._total += element.value;
            }
            
            public element(): ReducerElement {
                const el = new SumElement();
                el.value = this._total;
                return el;
            }
            
            public value(): number {
                return this._total;
            }
        }
        
        const agg = new CustomSum();
        expect(agg.name).toBe("customSum");
        
        const elem = new SumElement();
        elem.value = 5;
        agg.reduce(elem);
        expect(agg.value()).toBe(5);
        
        const elem2 = new SumElement();
        elem2.value = 3;
        agg.reduce(elem2);
        expect(agg.value()).toBe(8);
    });

    test("PredicateFunction class is exported and can be extended", () => {
        class CustomPredicate extends PredicateFunction {
            constructor() {
                super("customPredicate");
            }
            
            public value(): boolean {
                return true;
            }
        }
        
        const pred = new CustomPredicate();
        expect(pred.name).toBe("customPredicate");
        expect(pred.toString()).toBe("PredicateFunction (customPredicate)");
        expect(pred.value()).toBe(true);
    });

    test("AsyncFunction class is exported and can be instantiated", () => {
        const asyncFunc = new AsyncFunction("testAsync");
        expect(asyncFunc.name).toBe("testAsync");
    });

    test("ReducerElement class is exported and can be extended", () => {
        class NumberElement extends ReducerElement {
            private _num: number = 0;
            
            public get value(): number {
                return this._num;
            }
            
            public set value(v: number) {
                this._num = v;
            }
        }
        
        const elem = new NumberElement();
        elem.value = 42;
        expect(elem.value).toBe(42);
    });
});

describe("FunctionDef Decorator", () => {
    test("FunctionDef decorator can be applied to a scalar function", () => {
        @FunctionDef({
            description: "Test function for extensibility",
            category: "scalar",
            parameters: [
                { name: "input", description: "Input value", type: "string" }
            ],
            output: { description: "Output value", type: "string" },
            examples: ["RETURN testExtFunc('hello')"]
        })
        class TestExtFunc extends Function {
            constructor() {
                super("testExtFunc");
                this._expectedParameterCount = 1;
            }
            
            public value(): string {
                return "test result";
            }
        }
        
        // Verify the decorated class still works correctly
        const instance = new TestExtFunc();
        expect(instance.name).toBe("testExtFunc");
        expect(instance.value()).toBe("test result");
    });

    test("FunctionDef decorator can be applied to an aggregate function", () => {
        @FunctionDef({
            description: "Test aggregate function",
            category: "aggregate",
            parameters: [
                { name: "value", description: "Numeric value", type: "number" }
            ],
            output: { description: "Aggregated result", type: "number" }
        })
        class TestAggExt extends AggregateFunction {
            private _sum: number = 0;
            
            constructor() {
                super("testAggExt");
            }
            
            public value(): number {
                return this._sum;
            }
        }
        
        const instance = new TestAggExt();
        expect(instance.name).toBe("testAggExt");
        expect(instance.value()).toBe(0);
    });

    test("FunctionDef decorator can be applied to an async provider", async () => {
        @FunctionDef({
            description: "Test async provider for extensibility",
            category: "async",
            parameters: [
                { name: "count", description: "Number of items", type: "number", required: false, default: 1 }
            ],
            output: { description: "Data object", type: "object" }
        })
        class Simple {
            async *fetch(count: number = 1): AsyncGenerator<any> {
                for (let i = 0; i < count; i++) {
                    yield { id: i, data: `item${i}` };
                }
            }
        }
        
        // Verify the decorated class still works correctly
        const loader = new Simple();
        const results: any[] = [];
        for await (const item of loader.fetch(2)) {
            results.push(item);
        }
        expect(results.length).toBe(2);
        expect(results[0]).toEqual({ id: 0, data: "item0" });
        expect(results[1]).toEqual({ id: 1, data: "item1" });
        
        // Verify the async provider was registered
        const provider = getRegisteredAsyncProvider("simple");
        expect(provider).toBeDefined();
        expect(typeof provider).toBe("function");
        
        // Verify the metadata was registered
        const metadata = getFunctionMetadata("simple");
        expect(metadata).toBeDefined();
        expect(metadata?.name).toBe("Simple");
        expect(metadata?.category).toBe("async");
        expect(metadata?.description).toBe("Test async provider for extensibility");
    });

    test("FunctionDef decorator can be applied to a predicate function", () => {
        @FunctionDef({
            description: "Test predicate function",
            category: "predicate",
            parameters: [
                { name: "list", description: "List to check", type: "array" }
            ],
            output: { description: "Boolean result", type: "boolean" }
        })
        class TestPredExt extends PredicateFunction {
            constructor() {
                super("testPredExt");
            }
            
            public value(): boolean {
                return true;
            }
        }
        
        const instance = new TestPredExt();
        expect(instance.name).toBe("testPredExt");
        expect(instance.value()).toBe(true);
    });
});

describe("Type Exports", () => {
    test("FunctionMetadata type can be used", () => {
        const meta: FunctionMetadata = {
            name: "typeTest",
            description: "Testing type exports",
            category: "scalar",
            parameters: [],
            output: { description: "Output", type: "string" }
        };
        
        expect(meta.name).toBe("typeTest");
        expect(meta.description).toBe("Testing type exports");
    });

    test("ParameterSchema type can be used", () => {
        const param: ParameterSchema = {
            name: "testParam",
            description: "A test parameter",
            type: "string",
            required: true,
            default: "default value",
            example: "example value"
        };
        
        expect(param.name).toBe("testParam");
        expect(param.required).toBe(true);
    });

    test("ParameterSchema with nested types", () => {
        const arrayParam: ParameterSchema = {
            name: "items",
            description: "Array of items",
            type: "array",
            items: {
                description: "Item in array",
                type: "string"
            }
        };
        
        const objectParam: ParameterSchema = {
            name: "config",
            description: "Configuration object",
            type: "object",
            properties: {
                enabled: { description: "Is enabled", type: "boolean" },
                value: { description: "Value", type: "number" }
            }
        };
        
        expect(arrayParam.items?.type).toBe("string");
        expect(objectParam.properties?.enabled.type).toBe("boolean");
    });

    test("OutputSchema type can be used", () => {
        const output: OutputSchema = {
            description: "Result output",
            type: "object",
            properties: {
                success: { description: "Success flag", type: "boolean" },
                data: { description: "Result data", type: "array" }
            },
            example: { success: true, data: [] }
        };
        
        expect(output.type).toBe("object");
        expect(output.properties?.success.type).toBe("boolean");
    });

    test("FunctionCategory type accepts standard and custom categories", () => {
        const scalar: FunctionCategory = "scalar";
        const aggregate: FunctionCategory = "aggregate";
        const predicate: FunctionCategory = "predicate";
        const async: FunctionCategory = "async";
        const custom: FunctionCategory = "myCustomCategory";
        
        expect(scalar).toBe("scalar");
        expect(aggregate).toBe("aggregate");
        expect(predicate).toBe("predicate");
        expect(async).toBe("async");
        expect(custom).toBe("myCustomCategory");
    });

    test("FunctionDefOptions type can be used", () => {
        const options: FunctionDefOptions = {
            description: "Function options test",
            category: "scalar",
            parameters: [],
            output: { description: "Output", type: "string" },
            notes: "Some additional notes"
        };
        
        expect(options.description).toBe("Function options test");
        expect(options.notes).toBe("Some additional notes");
    });
});

describe("Plugin Functions Integration with FlowQuery", () => {
    // Import Runner for executing FlowQuery statements
    const Runner = require("../src/compute/runner").default;

    test("Custom scalar function can be used in a FlowQuery statement", async () => {
        // Define and register a custom function via @FunctionDef decorator
        @FunctionDef({
            description: "Doubles a number",
            category: "scalar",
            parameters: [{ name: "value", description: "Number to double", type: "number" }],
            output: { description: "Doubled value", type: "number" }
        })
        class Double extends Function {
            constructor() {
                super("double");
                this._expectedParameterCount = 1;
            }
            
            public value(): number {
                return this.getChildren()[0].value() * 2;
            }
        }

        // Execute a FlowQuery statement that uses the custom function
        const runner = new Runner("WITH 5 AS num RETURN double(num) AS result");
        await runner.run();
        
        expect(runner.results.length).toBe(1);
        expect(runner.results[0]).toEqual({ result: 10 });
    });

    test("Custom string function can be used in a FlowQuery statement", async () => {
        @FunctionDef({
            description: "Reverses a string",
            category: "scalar",
            parameters: [{ name: "text", description: "String to reverse", type: "string" }],
            output: { description: "Reversed string", type: "string" }
        })
        class StrReverse extends Function {
            constructor() {
                super("strreverse");
                this._expectedParameterCount = 1;
            }
            
            public value(): string {
                const input = String(this.getChildren()[0].value());
                return input.split('').reverse().join('');
            }
        }

        const runner = new Runner("WITH 'hello' AS s RETURN strreverse(s) AS reversed");
        await runner.run();
        
        expect(runner.results.length).toBe(1);
        expect(runner.results[0]).toEqual({ reversed: 'olleh' });
    });

    test("Custom aggregate function can be used in a FlowQuery statement", async () => {
        // Create a custom reducer element for the aggregate
        class ProductElement extends ReducerElement {
            private _value: number = 1;
            public get value(): number {
                return this._value;
            }
            public set value(v: number) {
                this._value *= v;
            }
        }

        @FunctionDef({
            description: "Calculates the product of values",
            category: "aggregate",
            parameters: [{ name: "value", description: "Number to multiply", type: "number" }],
            output: { description: "Product of all values", type: "number" }
        })
        class Product extends AggregateFunction {
            constructor() {
                super("product");
                this._expectedParameterCount = 1;
            }
            
            public reduce(element: ReducerElement): void {
                element.value = this.firstChild().value();
            }
            
            public element(): ReducerElement {
                return new ProductElement();
            }
        }

        const runner = new Runner("UNWIND [2, 3, 4] AS num RETURN product(num) AS result");
        await runner.run();
        
        expect(runner.results.length).toBe(1);
        expect(runner.results[0]).toEqual({ result: 24 });
    });

    test("Custom function works with expressions and other functions", async () => {
        @FunctionDef({
            description: "Adds 100 to a number",
            category: "scalar",
            parameters: [{ name: "value", description: "Number", type: "number" }],
            output: { description: "Number plus 100", type: "number" }
        })
        class AddHundred extends Function {
            constructor() {
                super("addhundred");
                this._expectedParameterCount = 1;
            }
            
            public value(): number {
                return this.getChildren()[0].value() + 100;
            }
        }

        // Use the custom function with expressions
        const runner = new Runner("WITH 5 * 3 AS num RETURN addhundred(num) + 1 AS result");
        await runner.run();
        
        expect(runner.results.length).toBe(1);
        expect(runner.results[0]).toEqual({ result: 116 }); // (5*3) + 100 + 1 = 116
    });

    test("Multiple custom functions can be used together", async () => {
        @FunctionDef({
            description: "Triples a number",
            category: "scalar",
            parameters: [{ name: "value", description: "Number to triple", type: "number" }],
            output: { description: "Tripled value", type: "number" }
        })
        class Triple extends Function {
            constructor() {
                super("triple");
                this._expectedParameterCount = 1;
            }
            
            public value(): number {
                return this.getChildren()[0].value() * 3;
            }
        }

        @FunctionDef({
            description: "Squares a number",
            category: "scalar",
            parameters: [{ name: "value", description: "Number to square", type: "number" }],
            output: { description: "Squared value", type: "number" }
        })
        class Square extends Function {
            constructor() {
                super("square");
                this._expectedParameterCount = 1;
            }
            
            public value(): number {
                const v = this.getChildren()[0].value();
                return v * v;
            }
        }

        // Use both custom functions in a query
        const runner = new Runner("WITH 2 AS num RETURN triple(num) AS tripled, square(num) AS squared");
        await runner.run();
        
        expect(runner.results.length).toBe(1);
        expect(runner.results[0]).toEqual({ tripled: 6, squared: 4 });
    });

    test("Custom async provider can be used in LOAD JSON FROM statement", async () => {
        @FunctionDef({
            description: "Provides example data for testing",
            category: "async",
            parameters: [],
            output: { description: "Example data object", type: "object" }
        })
        class GetExampleData {
            async *fetch(): AsyncGenerator<any> {
                yield { id: 1, name: "Alice" };
                yield { id: 2, name: "Bob" };
            }
        }

        // Verify registration worked
        expect(getRegisteredAsyncProvider("getExampleData")).toBeDefined();

        // Use the async provider in a FlowQuery statement
        const runner = new Runner("LOAD JSON FROM getExampleData() AS data RETURN data.id AS id, data.name AS name");
        await runner.run();
        
        expect(runner.results.length).toBe(2);
        expect(runner.results[0]).toEqual({ id: 1, name: "Alice" });
        expect(runner.results[1]).toEqual({ id: 2, name: "Bob" });
    });

    test("Function names are case-insensitive", async () => {
        @FunctionDef({
            description: "Test function for case insensitivity",
            category: "async",
            parameters: [],
            output: { description: "Test data", type: "object" }
        })
        class MixedCaseFunc {
            async *fetch(): AsyncGenerator<any> {
                yield { value: 42 };
            }
        }

        // Verify registration works with different casings
        expect(getRegisteredAsyncProvider("MixedCaseFunc")).toBeDefined();
        expect(getRegisteredAsyncProvider("mixedcasefunc")).toBeDefined();
        expect(getRegisteredAsyncProvider("MIXEDCASEFUNC")).toBeDefined();
        expect(getRegisteredAsyncProvider("mIxEdCaSeFuNc")).toBeDefined();

        // Verify metadata lookup is case-insensitive
        expect(getFunctionMetadata("MixedCaseFunc")).toBeDefined();
        expect(getFunctionMetadata("mixedcasefunc")).toBeDefined();
        expect(getFunctionMetadata("MIXEDCASEFUNC")).toBeDefined();

        // Test using different casings in FlowQuery statements
        const runner1 = new Runner("LOAD JSON FROM mixedcasefunc() AS d RETURN d.value AS v");
        await runner1.run();
        expect(runner1.results[0]).toEqual({ v: 42 });

        const runner2 = new Runner("LOAD JSON FROM MIXEDCASEFUNC() AS d RETURN d.value AS v");
        await runner2.run();
        expect(runner2.results[0]).toEqual({ v: 42 });

        const runner3 = new Runner("LOAD JSON FROM MixedCaseFunc() AS d RETURN d.value AS v");
        await runner3.run();
        expect(runner3.results[0]).toEqual({ v: 42 });
    });

    test("Custom function can be retrieved via functions() in a FlowQuery statement", async () => {
        @FunctionDef({
            description: "A unique test function for introspection",
            category: "scalar",
            parameters: [{ name: "x", description: "Input value", type: "number" }],
            output: { description: "Output value", type: "number" }
        })
        class IntrospectTestFunc extends Function {
            constructor() {
                super("introspectTestFunc");
                this._expectedParameterCount = 1;
            }
            
            public value(): number {
                return this.getChildren()[0].value() + 42;
            }
        }

        // First verify the function is registered
        const metadata = getFunctionMetadata("introspectTestFunc");
        expect(metadata).toBeDefined();
        expect(metadata?.name).toBe("introspecttestfunc");

        // Use functions() with UNWIND to find the registered function
        const runner = new Runner(`
            WITH functions() AS funcs
            UNWIND funcs AS f
            WITH f WHERE f.name = 'introspecttestfunc'
            RETURN f.name AS name, f.description AS description, f.category AS category
        `);
        await runner.run();
        
        expect(runner.results.length).toBe(1);
        expect(runner.results[0].name).toBe("introspecttestfunc");
        expect(runner.results[0].description).toBe("A unique test function for introspection");
        expect(runner.results[0].category).toBe("scalar");
    });
});
