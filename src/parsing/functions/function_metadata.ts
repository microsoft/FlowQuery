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
 * Registry for function metadata collected via decorators.
 */
const functionMetadataRegistry: Map<string, FunctionMetadata> = new Map();

/**
 * Registry for function factories collected via decorators.
 * Allows @FunctionDef to automatically register functions for instantiation.
 */
const functionFactoryRegistry: Map<string, () => any> = new Map();

/**
 * Type for async data provider functions used in LOAD operations.
 */
export type AsyncDataProvider = (...args: any[]) => AsyncGenerator<any, void, unknown> | Promise<any>;

/**
 * Registry for async data providers collected via decorators.
 */
const asyncProviderRegistry: Map<string, AsyncDataProvider> = new Map();

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
 * an AsyncGenerator. The function name is derived from the class name (removing 'Loader' suffix
 * if present) and converted to camelCase.
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
 * class CatFactsLoader {
 *     async *fetch(count: number = 1): AsyncGenerator<any> { ... }
 * }
 * ```
 */
export function FunctionDef(options: FunctionDefOptions) {
    return function <T extends new (...args: any[]) => any>(constructor: T): T {
        // Handle async providers differently
        if (options.category === 'async') {
            // Derive the function name from the class name
            // Remove 'Loader' suffix if present and convert to lowercase for registry
            let baseName = constructor.name;
            if (baseName.endsWith('Loader')) {
                baseName = baseName.slice(0, -6);
            }
            // Keep display name in camelCase, but use lowercase for registry keys
            const displayName = baseName.charAt(0).toLowerCase() + baseName.slice(1);
            const registryKey = displayName.toLowerCase();
            
            // Register metadata with display name
            const metadata: FunctionMetadata = {
                name: displayName,
                ...options
            };
            functionMetadataRegistry.set(registryKey, metadata);
            
            // Register the async provider (wraps the class's fetch method)
            asyncProviderRegistry.set(registryKey, (...args: any[]) => new constructor().fetch(...args));
            
            return constructor;
        }
        
        // Regular function handling
        // Create an instance to get the function name from super() call
        const instance = new constructor();
        const baseName = instance.name?.toLowerCase() || constructor.name.toLowerCase();
        
        // Use category-qualified key to avoid collisions (e.g., sum vs sum:predicate)
        // but store the display name without the qualifier
        const displayName = baseName.includes(':') ? baseName.split(':')[0] : baseName;
        const registryKey = options.category ? `${displayName}:${options.category}` : displayName;
        
        // Register metadata with display name but category-qualified key
        const metadata: FunctionMetadata = {
            name: displayName,
            ...options
        };
        functionMetadataRegistry.set(registryKey, metadata);
        
        // Register factory function for automatic instantiation
        // Only register to the simple name if no collision exists (predicate functions use qualified keys)
        if (options.category !== 'predicate') {
            functionFactoryRegistry.set(displayName, () => new constructor());
        }
        functionFactoryRegistry.set(registryKey, () => new constructor());
        
        return constructor;
    };
}

/**
 * Gets all registered function metadata from decorators.
 * 
 * @returns Array of function metadata
 */
export function getRegisteredFunctionMetadata(): FunctionMetadata[] {
    return Array.from(functionMetadataRegistry.values());
}

/**
 * Gets a registered function factory by name.
 * Used by FunctionFactory to instantiate decorator-registered functions.
 * 
 * @param name - Function name (case-insensitive)
 * @param category - Optional category to disambiguate (e.g., 'predicate')
 * @returns Factory function or undefined
 */
export function getRegisteredFunctionFactory(name: string, category?: string): (() => any) | undefined {
    const lowerName = name.toLowerCase();
    
    // If category specified, look for exact match
    if (category) {
        return functionFactoryRegistry.get(`${lowerName}:${category}`);
    }
    
    // Try direct match first
    if (functionFactoryRegistry.has(lowerName)) {
        return functionFactoryRegistry.get(lowerName);
    }
    
    return undefined;
}

/**
 * Gets metadata for a specific function by name.
 * If multiple functions share the same name (e.g., aggregate vs predicate),
 * optionally specify the category to get the specific one.
 * 
 * @param name - Function name (case-insensitive)
 * @param category - Optional category to disambiguate
 * @returns Function metadata or undefined
 */
export function getFunctionMetadata(name: string, category?: string): FunctionMetadata | undefined {
    const lowerName = name.toLowerCase();
    
    // If category specified, look for exact match
    if (category) {
        return functionMetadataRegistry.get(`${lowerName}:${category}`);
    }
    
    // Otherwise, first try direct match (for functions without category conflicts)
    // Then search for any function with matching name
    for (const [key, meta] of functionMetadataRegistry) {
        if (meta.name === lowerName) {
            return meta;
        }
    }
    
    return undefined;
}

/**
 * Gets a registered async data provider by name.
 * Used by FunctionFactory to get decorator-registered async providers.
 * 
 * @param name - Function name (case-insensitive)
 * @returns Async data provider or undefined
 */
export function getRegisteredAsyncProvider(name: string): AsyncDataProvider | undefined {
    return asyncProviderRegistry.get(name.toLowerCase());
}
