/**
 * FlowQuery Extensibility API
 * 
 * This module provides all the exports needed to create custom FlowQuery functions.
 * 
 * @packageDocumentation
 * 
 * @example
 * ```typescript
 * import { Function, FunctionDef } from '../parsing/functions/extensibility';
 * 
 * @FunctionDef({
 *     description: "Converts a string to uppercase",
 *     category: "string",
 *     parameters: [{ name: "text", description: "String to convert", type: "string" }],
 *     output: { description: "Uppercase string", type: "string" }
 * })
 * class UpperCase extends Function {
 *     constructor() {
 *         super("uppercase");
 *         this._expectedParameterCount = 1;
 *     }
 *     public value(): string {
 *         return String(this.getChildren()[0].value()).toUpperCase();
 *     }
 * }
 * ```
 */

// Base function classes for creating custom functions
export { default as Function } from "../function";
export { default as AggregateFunction } from "../aggregate_function";
export { default as PredicateFunction } from "../predicate_function";
export { default as ReducerElement } from "../reducer_element";

// Decorator and metadata types for function registration
export { 
    FunctionDef,
    FunctionMetadata,
    FunctionDefOptions,
    ParameterSchema,
    OutputSchema,
    FunctionCategory
} from "../function_metadata";

// Factory for advanced usage
export { default as FunctionFactory } from "../function_factory";
export type { FunctionCreator, AsyncDataProvider } from "../function_factory";

// Registration option types
export type {
    RegisterFunctionOptions,
    RegisterAsyncProviderOptions
} from "../function_metadata";
