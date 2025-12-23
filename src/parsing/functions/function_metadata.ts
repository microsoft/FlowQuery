/**
 * Category types for functions.
 * Core categories: scalar, aggregate, predicate, async
 * Additional categories for organization: string, math, data, etc.
 */
export type FunctionCategory = "scalar" | "aggregate" | "predicate" | "async" | string;

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
    /** Category that determines function type and behavior */
    category: FunctionCategory;
    /** Array of parameter schemas */
    parameters: ParameterSchema[];
    /** Output schema */
    output: OutputSchema;
    /** Example usage in FlowQuery syntax */
    examples?: string[];
    /** Additional notes or caveats */
    notes?: string;
}

/**
 * Type for async data provider functions used in LOAD operations.
 */
export type AsyncDataProvider = (...args: any[]) => AsyncGenerator<any, void, unknown> | Promise<any>;

/**
 * Centralized registry for function metadata, factories, and async providers.
 * Encapsulates all registration logic for the @FunctionDef decorator.
 */
class FunctionRegistry {
    private static metadata: Map<string, FunctionMetadata> = new Map<string, FunctionMetadata>();
    private static factories: Map<string, () => any> = new Map<string, () => any>();
    private static asyncProviders: Map<string, AsyncDataProvider> = new Map<string, AsyncDataProvider>();

    /** Registers an async data provider class. */
    static registerAsync<T extends new (...args: any[]) => any>(constructor: T, options: FunctionDefOptions): void {
        const displayName: string = constructor.name;
        const registryKey: string = displayName.toLowerCase();

        this.metadata.set(registryKey, { name: displayName, ...options });
        this.asyncProviders.set(registryKey, (...args: any[]) => new constructor().fetch(...args));
    }

    /** Registers a regular function class. */
    static registerFunction<T extends new (...args: any[]) => any>(constructor: T, options: FunctionDefOptions): void {
        const instance: any = new constructor();
        const displayName: string = (instance.name?.toLowerCase() || constructor.name.toLowerCase());
        const registryKey: string = options.category ? `${displayName}:${options.category}` : displayName;

        this.metadata.set(registryKey, { name: displayName, ...options });
        
        if (options.category !== 'predicate') {
            this.factories.set(displayName, () => new constructor());
        }
        this.factories.set(registryKey, () => new constructor());
    }

    static getAllMetadata(): FunctionMetadata[] {
        return Array.from(this.metadata.values());
    }

    static getMetadata(name: string, category?: string): FunctionMetadata | undefined {
        const lowerName: string = name.toLowerCase();
        if (category) return this.metadata.get(`${lowerName}:${category}`);
        for (const meta of this.metadata.values()) {
            if (meta.name.toLowerCase() === lowerName) return meta;
        }
        return undefined;
    }

    static getFactory(name: string, category?: string): (() => any) | undefined {
        const lowerName: string = name.toLowerCase();
        if (category) return this.factories.get(`${lowerName}:${category}`);
        return this.factories.get(lowerName);
    }

    static getAsyncProvider(name: string): AsyncDataProvider | undefined {
        return this.asyncProviders.get(name.toLowerCase());
    }
}

/**
 * Decorator options - metadata without the name (derived from class).
 */
export type FunctionDefOptions = Omit<FunctionMetadata, 'name'>;

/**
 * Class decorator that registers function metadata.
 * The function name is derived from the class's constructor call to super() for regular functions,
 * or from the class name for async providers.
 * 
 * For async providers (category: "async"), the class must have a `fetch` method that returns
 * an AsyncGenerator. The function name is derived from the class name, converted to camelCase
 * (first letter lowercased).
 * 
 * @param options - Function metadata (excluding name)
 * @returns Class decorator
 * 
 * @example
 * ```typescript
 * // Regular function
 * @FunctionDef({
 *     description: "Calculates the sum of numeric values",
 *     category: "aggregate",
 *     parameters: [{ name: "value", description: "Numeric value to sum", type: "number" }],
 *     output: { description: "Sum of all values", type: "number", example: 150 },
 *     examples: ["WITH [1, 2, 3] AS nums UNWIND nums AS n RETURN sum(n)"]
 * })
 * class Sum extends AggregateFunction { ... }
 * 
 * // Async data provider
 * @FunctionDef({
 *     description: "Fetches random cat facts from the Cat Facts API",
 *     category: "async",
 *     parameters: [{ name: "count", description: "Number of facts", type: "number", required: false, default: 1 }],
 *     output: { description: "Cat fact object", type: "object" },
 *     examples: ["LOAD JSON FROM catFacts(5) AS fact RETURN fact.text"]
 * })
 * class CatFacts {
 *     async *fetch(count: number = 1): AsyncGenerator<any> { ... }
 * }
 * ```
 */
export function FunctionDef(options: FunctionDefOptions) {
    return function <T extends new (...args: any[]) => any>(constructor: T): T {
        if (options.category === 'async') {
            FunctionRegistry.registerAsync(constructor, options);
        } else {
            FunctionRegistry.registerFunction(constructor, options);
        }
        return constructor;
    };
}

/**
 * Gets all registered function metadata from decorators.
 */
export function getRegisteredFunctionMetadata(): FunctionMetadata[] {
    return FunctionRegistry.getAllMetadata();
}

/**
 * Gets a registered function factory by name.
 */
export function getRegisteredFunctionFactory(name: string, category?: string): (() => any) | undefined {
    return FunctionRegistry.getFactory(name, category);
}

/**
 * Gets metadata for a specific function by name.
 */
export function getFunctionMetadata(name: string, category?: string): FunctionMetadata | undefined {
    return FunctionRegistry.getMetadata(name, category);
}

/**
 * Gets a registered async data provider by name.
 */
export function getRegisteredAsyncProvider(name: string): AsyncDataProvider | undefined {
    return FunctionRegistry.getAsyncProvider(name);
}
