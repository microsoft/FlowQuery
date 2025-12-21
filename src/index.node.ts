/**
 * FlowQuery - A declarative query language for data processing pipelines.
 * 
 * This is the main entry point for the FlowQuery Node.js library usage.
 * 
 * @packageDocumentation
 */

import {default as FlowQuery} from "./compute/runner";
import FunctionFactory, { FunctionCreator, AsyncDataProvider } from "./parsing/functions/function_factory";
import { 
    FunctionMetadata, 
    ParameterSchema, 
    OutputSchema,
    RegisterFunctionOptions,
    RegisterAsyncProviderOptions 
} from "./parsing/functions/function_metadata";
import Function from "./parsing/functions/function";

/**
 * Register a synchronous plugin function.
 * 
 * @param name - The function name
 * @param factoryOrOptions - Factory function or options object with metadata
 * 
 * @example
 * ```javascript
 * // Simple registration
 * FlowQuery.registerFunction("uppercase", () => new MyUpperCaseFunction());
 * 
 * // Registration with metadata for LLM consumption
 * FlowQuery.registerFunction("uppercase", {
 *     factory: () => new MyUpperCaseFunction(),
 *     metadata: {
 *         name: "uppercase",
 *         description: "Converts a string to uppercase",
 *         category: "string",
 *         parameters: [{ name: "text", description: "String to convert", type: "string" }],
 *         output: { description: "Uppercase string", type: "string" },
 *         examples: ["WITH 'hello' AS s RETURN uppercase(s)"]
 *     }
 * });
 * ```
 */
FlowQuery.registerFunction = function(name: string, factoryOrOptions: FunctionCreator | RegisterFunctionOptions): void {
    FunctionFactory.register(name, factoryOrOptions);
};

/**
 * Unregister a synchronous plugin function.
 * 
 * @param name - The function name
 */
FlowQuery.unregisterFunction = function(name: string): void {
    FunctionFactory.unregister(name);
};

/**
 * Register an async data provider function for use in LOAD operations.
 * 
 * @param name - The function name
 * @param providerOrOptions - Async provider or options object with metadata
 * 
 * @example
 * ```javascript
 * // Registration with metadata for LLM consumption
 * FlowQuery.registerAsyncProvider("fetchUsers", {
 *     provider: async function* (endpoint) {
 *         const response = await fetch(endpoint);
 *         const data = await response.json();
 *         for (const item of data) yield item;
 *     },
 *     metadata: {
 *         name: "fetchUsers",
 *         description: "Fetches user data from an API",
 *         category: "data",
 *         parameters: [{ name: "endpoint", description: "API URL", type: "string" }],
 *         output: { 
 *             description: "User object", 
 *             type: "object",
 *             properties: {
 *                 id: { description: "User ID", type: "number" },
 *                 name: { description: "User name", type: "string" }
 *             }
 *         },
 *         examples: ["LOAD JSON FROM fetchUsers('https://api.example.com/users') AS user"]
 *     }
 * });
 * ```
 */
FlowQuery.registerAsyncProvider = function(name: string, providerOrOptions: AsyncDataProvider | RegisterAsyncProviderOptions): void {
    FunctionFactory.registerAsyncProvider(name, providerOrOptions);
};

/**
 * Unregister an async data provider function.
 * 
 * @param name - The function name
 */
FlowQuery.unregisterAsyncProvider = function(name: string): void {
    FunctionFactory.unregisterAsyncProvider(name);
};

/**
 * List all registered functions with their metadata.
 * 
 * @param options - Optional filter options
 * @returns Array of function metadata
 */
FlowQuery.listFunctions = function(options?: { category?: string; asyncOnly?: boolean; syncOnly?: boolean }): FunctionMetadata[] {
    return FunctionFactory.listFunctions(options);
};

/**
 * Get metadata for a specific function.
 * 
 * @param name - The function name
 * @returns Function metadata or undefined
 */
FlowQuery.getFunctionMetadata = function(name: string): FunctionMetadata | undefined {
    return FunctionFactory.getMetadata(name);
};

/**
 * Base Function class for creating custom plugin functions.
 */
FlowQuery.Function = Function;

export default FlowQuery;
export { 
    FlowQuery, 
    Function, 
    FunctionFactory, 
    FunctionCreator, 
    AsyncDataProvider,
    FunctionMetadata,
    ParameterSchema,
    OutputSchema,
    RegisterFunctionOptions,
    RegisterAsyncProviderOptions
};
