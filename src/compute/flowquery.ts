import Function from "../parsing/functions/function";
import { FunctionMetadata } from "../parsing/functions/function_metadata";
import Runner from "./runner";

/**
 * FlowQuery is the public API surface for the FlowQuery library.
 *
 * It extends {@link Runner} with extensibility features such as function
 * listing and plugin registration, keeping the Runner focused on execution.
 *
 * The static members are assigned dynamically in
 * {@link ../index.browser.ts | index.browser.ts} and
 * {@link ../index.node.ts | index.node.ts}.
 *
 * @example
 * ```typescript
 * const fq = new FlowQuery("WITH 1 as x RETURN x");
 * await fq.run();
 * console.log(fq.results); // [{ x: 1 }]
 *
 * // List all registered functions
 * const functions = FlowQuery.listFunctions();
 * ```
 */
class FlowQuery extends Runner {
    /**
     * List all registered functions with their metadata.
     */
    static listFunctions: (options?: {
        category?: string;
        asyncOnly?: boolean;
        syncOnly?: boolean;
    }) => FunctionMetadata[];

    /**
     * Get metadata for a specific function.
     */
    static getFunctionMetadata: (name: string) => FunctionMetadata | undefined;

    /**
     * Base Function class for creating custom plugin functions.
     */
    static Function: typeof Function;
}

export default FlowQuery;
