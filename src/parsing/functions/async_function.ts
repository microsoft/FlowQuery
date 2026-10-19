import type SourceContext from "../../graph/source_context";
import type { SourceStats } from "../../graph/source_context";
import ASTNode from "../ast_node";
import Function from "./function";

/**
 * Query-scoped context visible to an async function as `this.context`
 * while it runs (also inside `CREATE VIRTUAL` definition bodies).
 */
export interface FunctionContext {
    /** Aborted when the query is cancelled or finishes; pass it to `fetch` etc. */
    signal: AbortSignal;
    /**
     * Value returned by the function class's static `openReadContext()`
     * hook, opened once per query and shared by every call of the
     * function in that query (`undefined` when the hook is absent).
     */
    snapshot: unknown;
    /** The query's source counters; functions may add to them. */
    stats: SourceStats;
}

/**
 * Represents an async data provider function call for use in LOAD operations.
 *
 * This class holds the function name and arguments, and provides async iteration
 * over the results from a registered async data provider.
 *
 * Subclasses may declare static `openReadContext()` / `closeReadContext(snapshot)`
 * hooks: the first is called once per query before the function's first
 * call and its result is exposed as `this.context.snapshot`; the second is
 * called once when the query ends, including on error or cancellation.
 *
 * @example
 * ```typescript
 * // Used in: LOAD JSON FROM myDataSource('arg1', 'arg2') AS data
 * const asyncFunc = new AsyncFunction("myDataSource");
 * asyncFunc.parameters = [arg1Node, arg2Node];
 * for await (const item of asyncFunc.execute()) {
 *     console.log(item);
 * }
 * ```
 */
class AsyncFunction extends Function {
    private _sourceContext: SourceContext | null = null;
    private _context: FunctionContext | null = null;

    /**
     * Sets the function parameters.
     *
     * @param nodes - Array of AST nodes representing the function arguments
     */
    public set parameters(nodes: ASTNode[]) {
        this.children = nodes;
    }

    /** @internal Query context assigned by the runner. */
    public set sourceContext(ctx: SourceContext | null) {
        this._sourceContext = ctx;
        this._context = null;
    }
    public get sourceContext(): SourceContext | null {
        return this._sourceContext;
    }

    /**
     * Query-scoped context (`signal`, `snapshot`, `stats`) of the running
     * query, or `null` when the function is called outside a query.
     */
    public get context(): FunctionContext | null {
        return this._context;
    }

    /**
     * @internal Opens the class's read context for this query (once) and
     * exposes the query's signal, snapshot and stats as `this.context`.
     */
    public async prepareContext(afterCancel: boolean = false): Promise<void> {
        const ctx = this._sourceContext;
        if (ctx === null) {
            this._context = null;
            return;
        }
        if (!afterCancel) ctx.throwIfCancelled();
        const readContext = await ctx.readContext(this.constructor);
        this._context = {
            signal: readContext.signal,
            snapshot: readContext.snapshot,
            stats: ctx.stats,
        };
    }

    /**
     * Evaluates all parameters and returns their values.
     * Used by the framework to pass arguments to generate().
     *
     * @returns Array of parameter values
     */
    public getArguments(): any[] {
        return this.children.map((child) => child.value());
    }

    /**
     * Generates the async data provider function results.
     *
     * Subclasses override this method with their own typed parameters.
     * The framework automatically evaluates the AST children and spreads
     * them as arguments when calling this method.
     *
     * @param args - Arguments passed from the query (e.g., myFunc(arg1, arg2))
     * @yields Data items from the async provider
     * @throws {Error} If the function is not registered as an async provider
     *
     * @example
     * ```typescript
     * // Subclass with typed parameters:
     * async *generate(count: number = 1, filter?: string): AsyncGenerator<any> {
     *     // Implementation
     * }
     * ```
     */
    public async *generate(...args: any[]): AsyncGenerator<any, void, unknown> {
        throw new Error("Not implemented: generate method must be overridden in subclasses.");
    }
}

export default AsyncFunction;
