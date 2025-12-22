/**
 * FlowQuery - A declarative query language for data processing pipelines.
 * 
 * This is the main entry point for the FlowQuery Node.js library usage.
 * 
 * @packageDocumentation
 */

import {default as FlowQuery} from "./compute/runner";
import FunctionFactory, { AsyncDataProvider } from "./parsing/functions/function_factory";
import { 
    FunctionMetadata, 
    ParameterSchema, 
    OutputSchema
} from "./parsing/functions/function_metadata";
import Function from "./parsing/functions/function";

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
    AsyncDataProvider,
    FunctionMetadata,
    ParameterSchema,
    OutputSchema
};
