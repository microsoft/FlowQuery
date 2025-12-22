/**
 * Category types for functions.
 * Core categories: scalar, aggregate, predicate, async
 * Additional categories for organization: string, math, data, etc.
 */
export type FunctionCategory = "scalar" | "aggregate" | "predicate" | "async" | "string" | "math" | "data" | "introspection" | string;

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
    /** Category for grouping functions */
    category?: FunctionCategory;
    /** Array of parameter schemas */
    parameters: ParameterSchema[];
    /** Output schema */
    output: OutputSchema;
    /** Example usage in FlowQuery syntax */
    examples?: string[];
    /** Additional notes or caveats */
    notes?: string;
    /** Whether this is an async data provider (for LOAD operations) */
    isAsyncProvider?: boolean;
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
 * Registry for function metadata collected via decorators.
 */
const functionMetadataRegistry: Map<string, FunctionMetadata> = new Map();

/**
 * Registry for function factories collected via decorators.
 * Allows @FunctionDef to automatically register functions for instantiation.
 */
const functionFactoryRegistry: Map<string, () => any> = new Map();

/**
 * Decorator options - metadata without the name (derived from class).
 */
export type FunctionDefOptions = Omit<FunctionMetadata, 'name'>;

/**
 * Class decorator that registers function metadata.
 * The function name is derived from the class's constructor call to super().
 * 
 * @param options - Function metadata (excluding name)
 * @returns Class decorator
 * 
 * @example
 * ```typescript
 * @FunctionDef({
 *     description: "Calculates the sum of numeric values",
 *     category: "aggregate",
 *     parameters: [{ name: "value", description: "Numeric value to sum", type: "number" }],
 *     output: { description: "Sum of all values", type: "number", example: 150 },
 *     examples: ["WITH [1, 2, 3] AS nums UNWIND nums AS n RETURN sum(n)"]
 * })
 * class Sum extends AggregateFunction { ... }
 * ```
 */
export function FunctionDef(options: FunctionDefOptions) {
    return function <T extends new (...args: any[]) => any>(constructor: T): T {
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
