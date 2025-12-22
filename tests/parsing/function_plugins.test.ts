import FunctionFactory from "../../src/parsing/functions/function_factory";
import Function from "../../src/parsing/functions/function";
import { FunctionMetadata } from "../../src/parsing/functions/function_metadata";
import Runner from "../../src/compute/runner";

// Custom test function
class UpperCase extends Function {
    constructor() {
        super("uppercase");
        this._expectedParameterCount = 1;
    }
    public value(): any {
        return String(this.getChildren()[0].value()).toUpperCase();
    }
}

describe("FunctionFactory Plugin Registration", () => {
    afterEach(() => {
        // Clean up registered functions after each test
        FunctionFactory.unregister("uppercase");
        FunctionFactory.unregister("testfunc");
        FunctionFactory.unregisterAsyncProvider("testprovider");
        FunctionFactory.unregisterAsyncProvider("asyncdata");
    });

    describe("register()", () => {
        it("should register a simple function factory", () => {
            FunctionFactory.register("uppercase", () => new UpperCase());
            const func = FunctionFactory.create("uppercase");
            expect(func).toBeInstanceOf(UpperCase);
        });

        it("should register a function with metadata", () => {
            FunctionFactory.register("uppercase", {
                factory: () => new UpperCase(),
                metadata: {
                    name: "uppercase",
                    description: "Converts a string to uppercase",
                    category: "string",
                    parameters: [
                        { name: "text", description: "String to convert", type: "string" }
                    ],
                    output: { description: "Uppercase string", type: "string" },
                    examples: ["WITH 'hello' AS s RETURN uppercase(s)"]
                }
            });

            const func = FunctionFactory.create("uppercase");
            expect(func).toBeInstanceOf(UpperCase);

            const metadata = FunctionFactory.getMetadata("uppercase");
            expect(metadata).toBeDefined();
            expect(metadata?.description).toBe("Converts a string to uppercase");
            expect(metadata?.category).toBe("string");
            expect(metadata?.parameters).toHaveLength(1);
        });

        it("should be case-insensitive", () => {
            FunctionFactory.register("UpperCase", () => new UpperCase());
            const func = FunctionFactory.create("UPPERCASE");
            expect(func).toBeInstanceOf(UpperCase);
        });
    });

    describe("unregister()", () => {
        it("should unregister a function and its metadata", () => {
            FunctionFactory.register("testfunc", {
                factory: () => new Function("testfunc"),
                metadata: {
                    name: "testfunc",
                    description: "Test function",
                    parameters: [],
                    output: { description: "Test output", type: "string" }
                }
            });

            expect(FunctionFactory.getMetadata("testfunc")).toBeDefined();
            
            FunctionFactory.unregister("testfunc");
            
            expect(FunctionFactory.getMetadata("testfunc")).toBeUndefined();
        });
    });

    describe("registerAsyncProvider()", () => {
        it("should register a simple async provider", () => {
            const provider = async function* () {
                yield { id: 1 };
                yield { id: 2 };
            };
            
            FunctionFactory.registerAsyncProvider("testprovider", provider);
            
            expect(FunctionFactory.isAsyncProvider("testprovider")).toBe(true);
            expect(FunctionFactory.getAsyncProvider("testprovider")).toBe(provider);
        });

        it("should register an async provider with metadata", () => {
            FunctionFactory.registerAsyncProvider("asyncdata", {
                provider: async function* (url: string) {
                    yield { data: url };
                },
                metadata: {
                    name: "asyncdata",
                    description: "Fetches data from a URL",
                    category: "data",
                    parameters: [
                        { name: "url", description: "The URL to fetch", type: "string" }
                    ],
                    output: { 
                        description: "Data object", 
                        type: "object",
                        properties: {
                            data: { description: "The fetched data", type: "string" }
                        }
                    },
                    examples: ["LOAD JSON FROM asyncdata('http://example.com') AS item"]
                }
            });

            expect(FunctionFactory.isAsyncProvider("asyncdata")).toBe(true);
            
            const metadata = FunctionFactory.getMetadata("asyncdata");
            expect(metadata).toBeDefined();
            expect(metadata?.description).toBe("Fetches data from a URL");
            expect(metadata?.isAsyncProvider).toBe(true);
        });
    });

    describe("unregisterAsyncProvider()", () => {
        it("should unregister an async provider and its metadata", () => {
            FunctionFactory.registerAsyncProvider("testprovider", {
                provider: async function* () { yield 1; },
                metadata: {
                    name: "testprovider",
                    description: "Test provider",
                    parameters: [],
                    output: { description: "Number", type: "number" }
                }
            });

            expect(FunctionFactory.isAsyncProvider("testprovider")).toBe(true);
            expect(FunctionFactory.getMetadata("testprovider")).toBeDefined();
            
            FunctionFactory.unregisterAsyncProvider("testprovider");
            
            expect(FunctionFactory.isAsyncProvider("testprovider")).toBe(false);
            expect(FunctionFactory.getMetadata("testprovider")).toBeUndefined();
        });
    });
});

describe("FunctionFactory Metadata Queries", () => {
    beforeAll(() => {
        // Register test functions for metadata queries
        FunctionFactory.register("customfunc", {
            factory: () => new Function("customfunc"),
            metadata: {
                name: "customfunc",
                description: "A custom test function",
                category: "test",
                parameters: [{ name: "arg", description: "An argument", type: "string" }],
                output: { description: "Result", type: "string" }
            }
        });

        FunctionFactory.registerAsyncProvider("customprovider", {
            provider: async function* () { yield 1; },
            metadata: {
                name: "customprovider",
                description: "A custom async provider",
                category: "test",
                parameters: [],
                output: { description: "Number", type: "number" }
            }
        });
    });

    afterAll(() => {
        FunctionFactory.unregister("customfunc");
        FunctionFactory.unregisterAsyncProvider("customprovider");
    });

    describe("getMetadata()", () => {
        it("should return metadata for built-in functions", () => {
            const metadata = FunctionFactory.getMetadata("sum");
            expect(metadata).toBeDefined();
            expect(metadata?.name).toBe("sum");
            expect(metadata?.category).toBe("aggregate");
        });

        it("should return metadata for plugin functions", () => {
            const metadata = FunctionFactory.getMetadata("customfunc");
            expect(metadata).toBeDefined();
            expect(metadata?.description).toBe("A custom test function");
        });

        it("should return undefined for unknown functions", () => {
            const metadata = FunctionFactory.getMetadata("nonexistent");
            expect(metadata).toBeUndefined();
        });

        it("should be case-insensitive", () => {
            const metadata = FunctionFactory.getMetadata("SUM");
            expect(metadata).toBeDefined();
            expect(metadata?.name).toBe("sum");
        });
    });

    describe("listFunctions()", () => {
        it("should list all functions including built-ins", () => {
            const functions = FunctionFactory.listFunctions();
            expect(functions.length).toBeGreaterThan(10);
            expect(functions.some(f => f.name === "sum")).toBe(true);
            expect(functions.some(f => f.name === "customfunc")).toBe(true);
        });

        it("should filter by category", () => {
            const aggregationFuncs = FunctionFactory.listFunctions({ category: "aggregate" });
            expect(aggregationFuncs.every(f => f.category === "aggregate")).toBe(true);
            expect(aggregationFuncs.some(f => f.name === "sum")).toBe(true);
            expect(aggregationFuncs.some(f => f.name === "avg")).toBe(true);
        });

        it("should filter async providers only", () => {
            const asyncFuncs = FunctionFactory.listFunctions({ asyncOnly: true });
            expect(asyncFuncs.every(f => f.isAsyncProvider === true)).toBe(true);
            expect(asyncFuncs.some(f => f.name === "customprovider")).toBe(true);
        });

        it("should filter sync functions only", () => {
            const syncFuncs = FunctionFactory.listFunctions({ syncOnly: true });
            expect(syncFuncs.every(f => !f.isAsyncProvider)).toBe(true);
        });

        it("should exclude built-ins when specified", () => {
            const pluginsOnly = FunctionFactory.listFunctions({ includeBuiltins: false });
            expect(pluginsOnly.some(f => f.name === "sum")).toBe(false);
            expect(pluginsOnly.some(f => f.name === "customfunc")).toBe(true);
        });
    });

    describe("listFunctionNames()", () => {
        it("should return all function names", () => {
            const names = FunctionFactory.listFunctionNames();
            expect(names).toContain("sum");
            expect(names).toContain("avg");
            expect(names).toContain("customfunc");
            expect(names).toContain("customprovider");
        });

        it("should not have duplicates", () => {
            const names = FunctionFactory.listFunctionNames();
            const uniqueNames = [...new Set(names)];
            expect(names.length).toBe(uniqueNames.length);
        });
    });

    describe("toJSON()", () => {
        it("should return functions and categories", () => {
            const result = FunctionFactory.toJSON();
            expect(result.functions).toBeDefined();
            expect(Array.isArray(result.functions)).toBe(true);
            expect(result.categories).toBeDefined();
            expect(Array.isArray(result.categories)).toBe(true);
            expect(result.categories).toContain("aggregate");
            expect(result.categories).toContain("scalar");
        });
    });
});

describe("functions() built-in function", () => {
    it("should return all functions when called without arguments", async () => {
        const runner = new Runner("WITH functions() AS funcs RETURN size(funcs)");
        await runner.run();
        expect(runner.results[0].expr0).toBeGreaterThan(10);
    });

    it("should return function metadata with expected properties", async () => {
        const runner = new Runner("WITH functions() AS funcs UNWIND funcs AS f WITH f WHERE f.name = 'sum' AND f.category = 'aggregate' RETURN f.name, f.description, f.category");
        await runner.run();
        expect(runner.results).toHaveLength(1);
        expect(runner.results[0].expr0).toBe("sum");
        expect(runner.results[0].expr1).toBe("Calculates the sum of numeric values across grouped rows");
        expect(runner.results[0].expr2).toBe("aggregate");
    });

    it("should filter by category when argument provided", async () => {
        const runner = new Runner("WITH functions('aggregate') AS funcs UNWIND funcs AS f RETURN f.name");
        await runner.run();
        const names = runner.results.map((r: any) => r.expr0);
        expect(names).toContain("sum");
        expect(names).toContain("avg");
        expect(names).toContain("collect");
        expect(names).not.toContain("split"); // scalar category
    });

    it("should include the functions() function itself", async () => {
        const runner = new Runner("WITH functions('scalar') AS funcs UNWIND funcs AS f RETURN f.name");
        await runner.run();
        expect(runner.results.some((r: any) => r.expr0 === "functions")).toBe(true);
    });

    it("should include parameter information", async () => {
        const runner = new Runner("WITH functions() AS funcs UNWIND funcs AS f WITH f WHERE f.name = 'split' RETURN f.parameters");
        await runner.run();
        const params = runner.results[0].expr0;
        expect(Array.isArray(params)).toBe(true);
        expect(params.length).toBe(2);
        expect(params[0].name).toBe("text");
        expect(params[1].name).toBe("delimiter");
    });

    it("should include output schema", async () => {
        const runner = new Runner("WITH functions() AS funcs UNWIND funcs AS f WITH f WHERE f.name = 'sum' RETURN f.output");
        await runner.run();
        const output = runner.results[0].expr0;
        expect(output.type).toBe("number");
        expect(output.description).toBeDefined();
    });

    it("should include examples", async () => {
        const runner = new Runner("WITH functions() AS funcs UNWIND funcs AS f WITH f WHERE f.name = 'range' RETURN f.examples");
        await runner.run();
        const examples = runner.results[0].expr0;
        expect(Array.isArray(examples)).toBe(true);
        expect(examples.length).toBeGreaterThan(0);
    });
});

describe("Plugin function execution", () => {
    beforeAll(() => {
        FunctionFactory.register("double", {
            factory: () => {
                const func = new Function("double");
                (func as any)._expectedParameterCount = 1;
                (func as any).value = function() {
                    return this.getChildren()[0].value() * 2;
                };
                return func;
            },
            metadata: {
                name: "double",
                description: "Doubles a number",
                category: "math",
                parameters: [{ name: "n", description: "Number to double", type: "number" }],
                output: { description: "Doubled value", type: "number" }
            }
        });
    });

    afterAll(() => {
        FunctionFactory.unregister("double");
    });

    it("should execute a registered plugin function", async () => {
        const runner = new Runner("WITH 5 AS n RETURN double(n)");
        await runner.run();
        expect(runner.results[0].expr0).toBe(10);
    });

    it("should show plugin function in functions() output", async () => {
        const runner = new Runner("WITH functions('math') AS funcs UNWIND funcs AS f RETURN f.name");
        await runner.run();
        const names = runner.results.map((r: any) => r.expr0);
        expect(names).toContain("double");
        // round is in 'scalar' category, not 'math'
    });
});
