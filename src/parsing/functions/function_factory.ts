import Sum from "./sum";
import Collect from "./collect";
import Avg from "./avg";
import Range from "./range";
import Rand from "./rand";
import Round from "./round";
import Split from "./split";
import Join from "./join";
import ToJson from "./to_json";
import Replace from "./replace";
import Stringify from "./stringify";
import Size from "./size";
import Functions from "./functions";
import Function from "./function";
import { 
    FunctionMetadata, 
    RegisterFunctionOptions, 
    RegisterAsyncProviderOptions,
    BUILTIN_FUNCTION_METADATA 
} from "./function_metadata";

/**
 * Type for synchronous function factories.
 */
export type FunctionCreator = () => Function;

/**
 * Type for async data provider functions used in LOAD operations.
 * These functions can yield data asynchronously.
 */
export type AsyncDataProvider = (...args: any[]) => AsyncGenerator<any, void, unknown> | Promise<any>;

/**
 * Factory for creating function instances by name.
 * 
 * Maps function names (case-insensitive) to their corresponding implementation classes.
 * Supports built-in functions like sum, avg, collect, range, split, join, etc.
 * 
 * @example
 * ```typescript
 * const sumFunc = FunctionFactory.create("sum");
 * const avgFunc = FunctionFactory.create("AVG");
 * ```
 */
class FunctionFactory {
    /**
     * Registry for plugin functions (synchronous).
     */
    private static plugins: Map<string, FunctionCreator> = new Map();

    /**
     * Registry for async data provider functions used in LOAD operations.
     */
    private static asyncProviders: Map<string, AsyncDataProvider> = new Map();

    /**
     * Registry for function metadata (both sync and async).
     */
    private static metadata: Map<string, FunctionMetadata> = new Map();

    /**
     * Registers a synchronous plugin function.
     * 
     * @param name - The function name (will be lowercased)
     * @param factoryOrOptions - Factory function or options object with metadata
     */
    public static register(name: string, factoryOrOptions: FunctionCreator | RegisterFunctionOptions): void {
        const lowerName = name.toLowerCase();
        if (typeof factoryOrOptions === 'function') {
            FunctionFactory.plugins.set(lowerName, factoryOrOptions);
        } else {
            FunctionFactory.plugins.set(lowerName, factoryOrOptions.factory);
            FunctionFactory.metadata.set(lowerName, {
                ...factoryOrOptions.metadata,
                name: lowerName,
                isAsyncProvider: false
            });
        }
    }

    /**
     * Unregisters a synchronous plugin function.
     * 
     * @param name - The function name to unregister
     */
    public static unregister(name: string): void {
        const lowerName = name.toLowerCase();
        FunctionFactory.plugins.delete(lowerName);
        FunctionFactory.metadata.delete(lowerName);
    }

    /**
     * Registers an async data provider function for use in LOAD operations.
     * 
     * @param name - The function name (will be lowercased)
     * @param providerOrOptions - Async provider or options object with metadata
     * 
     * @example
     * ```typescript
     * // Register with metadata for LLM consumption
     * FunctionFactory.registerAsyncProvider("fetchUsers", {
     *     provider: async function* (endpoint: string) {
     *         const response = await fetch(endpoint);
     *         const data = await response.json();
     *         for (const item of data) {
     *             yield item;
     *         }
     *     },
     *     metadata: {
     *         name: "fetchUsers",
     *         description: "Fetches user data from an API endpoint",
     *         parameters: [
     *             { name: "endpoint", description: "API endpoint URL", type: "string" }
     *         ],
     *         output: {
     *             description: "User objects",
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
    public static registerAsyncProvider(name: string, providerOrOptions: AsyncDataProvider | RegisterAsyncProviderOptions): void {
        const lowerName = name.toLowerCase();
        if (typeof providerOrOptions === 'function') {
            FunctionFactory.asyncProviders.set(lowerName, providerOrOptions);
        } else {
            FunctionFactory.asyncProviders.set(lowerName, providerOrOptions.provider);
            FunctionFactory.metadata.set(lowerName, {
                ...providerOrOptions.metadata,
                name: lowerName,
                isAsyncProvider: true
            });
        }
    }

    /**
     * Unregisters an async data provider function.
     * 
     * @param name - The function name to unregister
     */
    public static unregisterAsyncProvider(name: string): void {
        const lowerName = name.toLowerCase();
        FunctionFactory.asyncProviders.delete(lowerName);
        FunctionFactory.metadata.delete(lowerName);
    }

    /**
     * Gets an async data provider by name.
     * 
     * @param name - The function name (case-insensitive)
     * @returns The async data provider, or undefined if not found
     */
    public static getAsyncProvider(name: string): AsyncDataProvider | undefined {
        return FunctionFactory.asyncProviders.get(name.toLowerCase());
    }

    /**
     * Checks if a function name is registered as an async data provider.
     * 
     * @param name - The function name (case-insensitive)
     * @returns True if the function is an async data provider
     */
    public static isAsyncProvider(name: string): boolean {
        return FunctionFactory.asyncProviders.has(name.toLowerCase());
    }

    /**
     * Gets metadata for a specific function.
     * 
     * @param name - The function name (case-insensitive)
     * @returns The function metadata, or undefined if not found
     */
    public static getMetadata(name: string): FunctionMetadata | undefined {
        const lowerName = name.toLowerCase();
        // Check plugin metadata first
        if (FunctionFactory.metadata.has(lowerName)) {
            return FunctionFactory.metadata.get(lowerName);
        }
        // Fall back to built-in metadata
        return BUILTIN_FUNCTION_METADATA.find(m => m.name === lowerName);
    }

    /**
     * Lists all registered functions with their metadata.
     * Includes both built-in and plugin functions.
     * 
     * @param options - Optional filter options
     * @returns Array of function metadata
     */
    public static listFunctions(options?: { 
        category?: string; 
        includeBuiltins?: boolean;
        asyncOnly?: boolean;
        syncOnly?: boolean;
    }): FunctionMetadata[] {
        const result: FunctionMetadata[] = [];
        const includeBuiltins = options?.includeBuiltins !== false;
        
        // Add built-in functions
        if (includeBuiltins) {
            for (const meta of BUILTIN_FUNCTION_METADATA) {
                if (options?.category && meta.category !== options.category) continue;
                if (options?.asyncOnly) continue; // Built-ins are sync
                result.push(meta);
            }
        }
        
        // Add plugin functions
        for (const [name, meta] of FunctionFactory.metadata) {
            if (options?.category && meta.category !== options.category) continue;
            if (options?.asyncOnly && !meta.isAsyncProvider) continue;
            if (options?.syncOnly && meta.isAsyncProvider) continue;
            result.push(meta);
        }
        
        return result;
    }

    /**
     * Lists all registered function names.
     * 
     * @returns Array of function names
     */
    public static listFunctionNames(): string[] {
        const builtinNames = BUILTIN_FUNCTION_METADATA.map(m => m.name);
        const pluginNames = Array.from(FunctionFactory.plugins.keys());
        const asyncNames = Array.from(FunctionFactory.asyncProviders.keys());
        return [...new Set([...builtinNames, ...pluginNames, ...asyncNames])];
    }

    /**
     * Gets all function metadata as a JSON-serializable object for LLM consumption.
     * 
     * @returns Object with functions grouped by category
     */
    public static toJSON(): { functions: FunctionMetadata[]; categories: string[] } {
        const functions = FunctionFactory.listFunctions();
        const categories = [...new Set(functions.map(f => f.category).filter(Boolean))] as string[];
        return { functions, categories };
    }

    /**
     * Creates a function instance by name.
     * 
     * @param name - The function name (case-insensitive)
     * @returns A Function instance of the appropriate type
     */
    public static create(name: string): Function {
        const lowerName = name.toLowerCase();
        
        // Check plugin registry first (allows overriding built-ins)
        if (FunctionFactory.plugins.has(lowerName)) {
            return FunctionFactory.plugins.get(lowerName)!();
        }

        switch (lowerName) {
            case "sum":
                return new Sum();
            case "collect":
                return new Collect();
            case "avg":
                return new Avg();
            case "range":
                return new Range();
            case "rand":
                return new Rand();
            case "round":
                return new Round();
            case "split":
                return new Split();
            case "join":
                return new Join();
            case "tojson":
                return new ToJson();
            case "replace":
                return new Replace();
            case "stringify":
                return new Stringify();
            case "size":
                return new Size();
            case "functions":
                return new Functions();
            default:
                return new Function(name);
        }
    }
}

export default FunctionFactory;