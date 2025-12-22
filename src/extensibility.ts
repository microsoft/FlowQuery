/**
 * FlowQuery Extensibility API
 * 
 * This module provides all the exports needed to create custom FlowQuery functions.
 * 
 * @packageDocumentation
 * 
 * @example
 * ```typescript
 * import { Function, FunctionDef } from 'flowquery/extensibility';
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
export { default as Function } from "./parsing/functions/function";
export { default as AggregateFunction } from "./parsing/functions/aggregate_function";
export { default as AsyncFunction } from "./parsing/functions/async_function";
export { default as PredicateFunction } from "./parsing/functions/predicate_function";
export { default as ReducerElement } from "./parsing/functions/reducer_element";

// Decorator and metadata types for function registration
export { 
    FunctionDef,
    FunctionMetadata,
    FunctionDefOptions,
    ParameterSchema,
    OutputSchema,
    FunctionCategory
} from "./parsing/functions/function_metadata";
