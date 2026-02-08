/**
 * FlowQuery - A declarative query language for data processing pipelines.
 *
 * This is the main entry point for the FlowQuery in-browser usage.
 *
 * @packageDocumentation
 */
import { default as FlowQuery } from "./compute/flowquery";
import Function from "./parsing/functions/function";
import FunctionFactory from "./parsing/functions/function_factory";
import {
    FunctionMetadata,
    OutputSchema,
    ParameterSchema,
} from "./parsing/functions/function_metadata";

/**
 * List all registered functions with their metadata.
 *
 * @param options - Optional filter options
 * @returns Array of function metadata
 */
FlowQuery.listFunctions = function (options?: {
    category?: string;
    asyncOnly?: boolean;
    syncOnly?: boolean;
}): FunctionMetadata[] {
    return FunctionFactory.listFunctions(options);
};

/**
 * Get metadata for a specific function.
 *
 * @param name - The function name
 * @returns Function metadata or undefined
 */
FlowQuery.getFunctionMetadata = function (name: string): FunctionMetadata | undefined {
    return FunctionFactory.getMetadata(name);
};

/**
 * Base Function class for creating custom plugin functions.
 */
FlowQuery.Function = Function;

export default FlowQuery;
