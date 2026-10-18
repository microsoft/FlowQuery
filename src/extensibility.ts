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
    FunctionCategory,
} from "./parsing/functions/function_metadata";

// Backend-aware virtual source contract
export {
    SOURCE_CONTRACT_VERSION,
    PREDICATE_OPERATORS,
    SourceError,
    SourceCapabilityError,
    SourceResponseError,
    SourceUnsupportedError,
    QueryCancelledError,
    cursorPages,
    matchesPredicate,
    inMemoryNodeSource,
    inMemoryRelationshipSource,
} from "./graph/source_provider";
export type {
    SourceRow,
    InMemorySourceOptions,
    PredicateOperator,
    SourcePredicate,
    PredicateCapabilities,
    NodeSourceCapabilities,
    RelationshipSourceCapabilities,
    NodeScanRequest,
    NodeLookupRequest,
    RelationshipScanRequest,
    RelationshipExpandRequest,
    NodeSourceRequest,
    RelationshipSourceRequest,
    SourceReadContext,
    SourceResult,
    NodeSourceProvider,
    RelationshipSourceProvider,
} from "./graph/source_provider";
export type { SourceOptions, SourceStats, SourcePlan } from "./graph/source_context";
