import Function from "./function";
import PredicateFunction from "./predicate_function";
// Import built-in functions to ensure their @FunctionDef decorators run
import "./sum";
import "./collect";
import "./avg";
import "./range";
import "./rand";
import "./round";
import "./split";
import "./join";
import "./to_json";
import "./replace";
import "./stringify";
import "./size";
import "./functions";
import "./predicate_sum";
import { 
    FunctionMetadata, 
    RegisterFunctionOptions, 
    RegisterAsyncProviderOptions,
    getRegisteredFunctionMetadata,
    getFunctionMetadata,
    getRegisteredFunctionFactory
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
        // Fall back to decorator-registered metadata
        return getFunctionMetadata(lowerName);
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
        
        // Add decorator-registered functions (built-ins)
        if (includeBuiltins) {
            for (const meta of getRegisteredFunctionMetadata()) {
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
        const builtinNames = getRegisteredFunctionMetadata().map(m => m.name);
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

        // Check decorator-registered functions (built-ins use @FunctionDef)
        const decoratorFactory = getRegisteredFunctionFactory(lowerName);
        if (decoratorFactory) {
            return decoratorFactory();
        }

        // Unknown function - return generic Function instance
        return new Function(name);
    }

    /**
     * Creates a predicate function instance by name.
     * Predicate functions are used in WHERE clauses with quantifiers (e.g., ANY, ALL).
     * 
     * @param name - The function name (case-insensitive)
     * @returns A PredicateFunction instance of the appropriate type
     */
    public static createPredicate(name: string): PredicateFunction {
        const lowerName = name.toLowerCase();
        
        // Check decorator-registered predicate functions
        const decoratorFactory = getRegisteredFunctionFactory(lowerName, 'predicate');
        if (decoratorFactory) {
            return decoratorFactory();
        }

        // Unknown predicate function - return generic PredicateFunction instance
        return new PredicateFunction(name);
    }
}

export default FunctionFactory;