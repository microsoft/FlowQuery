/**
 * Schema definition for function arguments and outputs.
 * Compatible with JSON Schema for LLM consumption.
 */
export interface ParameterSchema {
    /** The parameter name */
    name: string;
    /** Description of the parameter */
    description: string;
    /** JSON Schema type: string, number, boolean, object, array, null */
    type: "string" | "number" | "boolean" | "object" | "array" | "null" | string;
    /** Whether the parameter is required (default: true) */
    required?: boolean;
    /** Default value if not provided */
    default?: any;
    /** For arrays, the schema of items */
    items?: Omit<ParameterSchema, 'name' | 'required' | 'default'>;
    /** For objects, the properties schema */
    properties?: Record<string, Omit<ParameterSchema, 'name' | 'required'>>;
    /** Enum of allowed values */
    enum?: any[];
    /** Example value */
    example?: any;
}

/**
 * Schema definition for function output.
 */
export interface OutputSchema {
    /** Description of the output */
    description: string;
    /** JSON Schema type */
    type: "string" | "number" | "boolean" | "object" | "array" | "null" | string;
    /** For arrays, the schema of items */
    items?: Omit<OutputSchema, 'description'>;
    /** For objects, the properties schema */
    properties?: Record<string, Omit<ParameterSchema, 'name' | 'required'>>;
    /** Example output value */
    example?: any;
}

/**
 * Metadata for a registered function, designed for LLM consumption.
 */
export interface FunctionMetadata {
    /** The function name */
    name: string;
    /** Human-readable description of what the function does */
    description: string;
    /** Category for grouping functions (e.g., "aggregation", "string", "data") */
    category?: string;
    /** Array of parameter schemas */
    parameters: ParameterSchema[];
    /** Output schema */
    output: OutputSchema;
    /** Example usage in FlowQuery syntax */
    examples?: string[];
    /** Whether this is an async data provider for LOAD operations */
    isAsyncProvider?: boolean;
    /** Additional notes or caveats */
    notes?: string;
}

/**
 * Options for registering a sync function with metadata.
 */
export interface RegisterFunctionOptions {
    /** Factory function that creates the Function instance */
    factory: () => any;
    /** Function metadata for documentation */
    metadata: FunctionMetadata;
}

/**
 * Options for registering an async data provider with metadata.
 */
export interface RegisterAsyncProviderOptions {
    /** Async generator or function that returns data */
    provider: (...args: any[]) => AsyncGenerator<any, void, unknown> | Promise<any>;
    /** Function metadata for documentation */
    metadata: FunctionMetadata;
}

/**
 * Built-in function metadata definitions.
 */
export const BUILTIN_FUNCTION_METADATA: FunctionMetadata[] = [
    {
        name: "sum",
        description: "Calculates the sum of numeric values across grouped rows",
        category: "aggregation",
        parameters: [
            { name: "value", description: "Numeric value to sum", type: "number" }
        ],
        output: { description: "Sum of all values", type: "number", example: 150 },
        examples: ["WITH [1, 2, 3] AS nums UNWIND nums AS n RETURN sum(n)"]
    },
    {
        name: "avg",
        description: "Calculates the average of numeric values across grouped rows",
        category: "aggregation",
        parameters: [
            { name: "value", description: "Numeric value to average", type: "number" }
        ],
        output: { description: "Average of all values", type: "number", example: 50 },
        examples: ["WITH [10, 20, 30] AS nums UNWIND nums AS n RETURN avg(n)"]
    },
    {
        name: "collect",
        description: "Collects values into an array across grouped rows",
        category: "aggregation",
        parameters: [
            { name: "value", description: "Value to collect", type: "any" }
        ],
        output: { description: "Array of collected values", type: "array", example: [1, 2, 3] },
        examples: ["WITH [1, 2, 3] AS nums UNWIND nums AS n RETURN collect(n)"]
    },
    {
        name: "range",
        description: "Generates an array of sequential integers",
        category: "generator",
        parameters: [
            { name: "start", description: "Starting number (inclusive)", type: "number" },
            { name: "end", description: "Ending number (inclusive)", type: "number" }
        ],
        output: { description: "Array of integers from start to end", type: "array", items: { type: "number" }, example: [1, 2, 3, 4, 5] },
        examples: ["WITH range(1, 5) AS nums RETURN nums"]
    },
    {
        name: "rand",
        description: "Generates a random number between 0 and 1",
        category: "generator",
        parameters: [],
        output: { description: "Random number between 0 and 1", type: "number", example: 0.7234 },
        examples: ["WITH rand() AS r RETURN r"]
    },
    {
        name: "round",
        description: "Rounds a number to the nearest integer",
        category: "math",
        parameters: [
            { name: "value", description: "Number to round", type: "number" }
        ],
        output: { description: "Rounded integer", type: "number", example: 4 },
        examples: ["WITH 3.7 AS n RETURN round(n)"]
    },
    {
        name: "split",
        description: "Splits a string into an array by a delimiter",
        category: "string",
        parameters: [
            { name: "text", description: "String to split", type: "string" },
            { name: "delimiter", description: "Delimiter to split by", type: "string" }
        ],
        output: { description: "Array of string parts", type: "array", items: { type: "string" }, example: ["a", "b", "c"] },
        examples: ["WITH 'a,b,c' AS s RETURN split(s, ',')"]
    },
    {
        name: "join",
        description: "Joins an array of strings with a delimiter",
        category: "string",
        parameters: [
            { name: "array", description: "Array of values to join", type: "array" },
            { name: "delimiter", description: "Delimiter to join with", type: "string" }
        ],
        output: { description: "Joined string", type: "string", example: "a,b,c" },
        examples: ["WITH ['a', 'b', 'c'] AS arr RETURN join(arr, ',')"]
    },
    {
        name: "replace",
        description: "Replaces occurrences of a pattern in a string",
        category: "string",
        parameters: [
            { name: "text", description: "Source string", type: "string" },
            { name: "pattern", description: "Pattern to find", type: "string" },
            { name: "replacement", description: "Replacement string", type: "string" }
        ],
        output: { description: "String with replacements", type: "string", example: "hello world" },
        examples: ["WITH 'hello there' AS s RETURN replace(s, 'there', 'world')"]
    },
    {
        name: "stringify",
        description: "Converts a value to its JSON string representation",
        category: "conversion",
        parameters: [
            { name: "value", description: "Value to stringify", type: "any" }
        ],
        output: { description: "JSON string", type: "string", example: "{\"a\":1}" },
        examples: ["WITH {a: 1} AS obj RETURN stringify(obj)"]
    },
    {
        name: "tojson",
        description: "Parses a JSON string into an object",
        category: "conversion",
        parameters: [
            { name: "text", description: "JSON string to parse", type: "string" }
        ],
        output: { description: "Parsed object or array", type: "object", example: { a: 1 } },
        examples: ["WITH '{\"a\": 1}' AS s RETURN tojson(s)"]
    },
    {
        name: "size",
        description: "Returns the length of an array or string",
        category: "utility",
        parameters: [
            { name: "value", description: "Array or string to measure", type: "array" }
        ],
        output: { description: "Length of the input", type: "number", example: 3 },
        examples: ["WITH [1, 2, 3] AS arr RETURN size(arr)"]
    },
    {
        name: "functions",
        description: "Lists all registered functions with their metadata. Useful for discovering available functions and their documentation. Results include name, description, parameters, output schema, and usage examples.",
        category: "introspection",
        parameters: [
            { name: "category", description: "Optional category to filter by (e.g., 'aggregation', 'string', 'math')", type: "string", required: false }
        ],
        output: { 
            description: "Array of function metadata objects", 
            type: "array",
            items: {
                type: "object",
                properties: {
                    name: { description: "Function name", type: "string" },
                    description: { description: "What the function does", type: "string" },
                    category: { description: "Function category", type: "string" },
                    parameters: { description: "Array of parameter definitions", type: "array" },
                    output: { description: "Output schema", type: "object" },
                    examples: { description: "Usage examples", type: "array" }
                }
            }
        },
        examples: [
            "WITH functions() AS funcs RETURN funcs",
            "WITH functions('aggregation') AS funcs UNWIND funcs AS f RETURN f.name, f.description"
        ]
    }
];
