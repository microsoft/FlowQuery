import AsyncFunction from "./async_function";
import "./avg";
import "./collect";
import "./count";
import Function from "./function";
import {
    AsyncDataProvider,
    FunctionMetadata,
    getFunctionMetadata,
    getRegisteredFunctionFactory,
    getRegisteredFunctionMetadata,
} from "./function_metadata";
import "./functions";
import "./join";
import "./keys";
import PredicateFunction from "./predicate_function";
import "./predicate_sum";
import "./rand";
import "./range";
import "./replace";
import "./round";
import "./schema";
import "./size";
import "./split";
import "./string_distance";
import "./stringify";
// Import built-in functions to ensure their @FunctionDef decorators run
import "./sum";
import "./to_json";
import "./to_lower";
import "./to_string";
import "./trim";
import "./type";

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
        return getRegisteredFunctionFactory(name.toLowerCase());
    }

    /**
     * Checks if a function name is registered as an async data provider.
     *
     * @param name - The function name (case-insensitive)
     * @returns True if the function is an async data provider
     */
    public static isAsyncProvider(name: string): boolean {
        return getRegisteredFunctionFactory(name.toLowerCase(), "async") !== undefined;
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
            if (options?.asyncOnly && meta.category !== "async") continue;
            if (options?.syncOnly && meta.category === "async") continue;
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
        return getRegisteredFunctionMetadata().map((m) => m.name);
    }

    /**
     * Gets all function metadata as a JSON-serializable object for LLM consumption.
     *
     * @returns Object with functions grouped by category
     */
    public static toJSON(): { functions: FunctionMetadata[]; categories: string[] } {
        const functions = FunctionFactory.listFunctions();
        const categories = [
            ...new Set(functions.map((f) => f.category).filter(Boolean)),
        ] as string[];
        return { functions, categories };
    }

    /**
     * Creates a function instance by name.
     *
     * @param name - The function name (case-insensitive)
     * @returns A Function instance of the appropriate type
     */
    public static create(name: string): Function {
        const lowerName: string = name.toLowerCase();

        // Check decorator-registered functions (built-ins use @FunctionDef)
        const decoratorFactory = getRegisteredFunctionFactory(lowerName);
        if (decoratorFactory) {
            return decoratorFactory();
        }

        throw new Error(`Unknown function: ${name}`);
    }

    /**
     * Creates a predicate function instance by name.
     * Predicate functions are used in WHERE clauses with quantifiers (e.g., ANY, ALL).
     *
     * @param name - The function name (case-insensitive)
     * @returns A PredicateFunction instance of the appropriate type
     */
    public static createPredicate(name: string): PredicateFunction {
        const lowerName: string = name.toLowerCase();

        // Check decorator-registered predicate functions
        const decoratorFactory = getRegisteredFunctionFactory(lowerName, "predicate");
        if (decoratorFactory) {
            return decoratorFactory();
        }

        throw new Error(`Unknown predicate function: ${name}`);
    }

    public static createAsync(name: string): AsyncFunction {
        const lowerName: string = name.toLowerCase();
        const decoratorFactory = getRegisteredFunctionFactory(lowerName, "async");
        if (decoratorFactory) {
            return decoratorFactory() as AsyncFunction;
        }
        throw new Error(`Unknown async function: ${name}`);
    }
}

export default FunctionFactory;
