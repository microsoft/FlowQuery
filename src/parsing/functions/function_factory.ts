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
import "./keys";
import "./to_json";
import "./replace";
import "./stringify";
import "./size";
import "./functions";
import "./predicate_sum";
import "./type";
import { 
    FunctionMetadata, 
    getRegisteredFunctionMetadata,
    getFunctionMetadata,
    getRegisteredFunctionFactory,
    getRegisteredAsyncProvider,
    AsyncDataProvider
} from "./function_metadata";

// Re-export AsyncDataProvider for backwards compatibility
export { AsyncDataProvider };

/**
 * Factory for creating function instances by name.
 * 
 * All functions are registered via the @FunctionDef decorator.
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
     * Gets an async data provider by name.
     * 
     * @param name - The function name (case-insensitive)
     * @returns The async data provider, or undefined if not found
     */
    public static getAsyncProvider(name: string): AsyncDataProvider | undefined {
        return getRegisteredAsyncProvider(name.toLowerCase());
    }

    /**
     * Checks if a function name is registered as an async data provider.
     * 
     * @param name - The function name (case-insensitive)
     * @returns True if the function is an async data provider
     */
    public static isAsyncProvider(name: string): boolean {
        return getRegisteredAsyncProvider(name.toLowerCase()) !== undefined;
    }

    /**
     * Gets metadata for a specific function.
     * 
     * @param name - The function name (case-insensitive)
     * @returns The function metadata, or undefined if not found
     */
    public static getMetadata(name: string): FunctionMetadata | undefined {
        return getFunctionMetadata(name.toLowerCase());
    }

    /**
     * Lists all registered functions with their metadata.
     * 
     * @param options - Optional filter options
     * @returns Array of function metadata
     */
    public static listFunctions(options?: { 
        category?: string; 
        asyncOnly?: boolean;
        syncOnly?: boolean;
    }): FunctionMetadata[] {
        const result: FunctionMetadata[] = [];
        
        for (const meta of getRegisteredFunctionMetadata()) {
            if (options?.category && meta.category !== options.category) continue;
            if (options?.asyncOnly && meta.category !== 'async') continue;
            if (options?.syncOnly && meta.category === 'async') continue;
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
        return getRegisteredFunctionMetadata().map(m => m.name);
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