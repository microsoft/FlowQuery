import type Runner from "../compute/runner";
import ASTNode from "../parsing/ast_node";
import type SourceContext from "./source_context";
import { QueryCancelledError } from "./source_provider";
import { attachVirtualSource } from "./virtual_sources";

/**
 * Backing statement of a virtual node or relationship: owns the AST that
 * synthesises the records and the optional in-memory cache around its
 * execution.
 *
 * Used by {@link PhysicalNode} and {@link PhysicalRelationship} via
 * composition so both physical kinds share a single caching + execution
 * implementation.
 */
class VirtualStatement {
    private _statement: ASTNode | null = null;
    private _isStatic: boolean = false;
    private _refreshEveryMs: number | null = null;
    private _cache: Record<string, any>[] | null = null;
    private _cachedAt: number = 0;
    private _active: { channel: RowChannel; done: Promise<void> } | null = null;

    public set statement(statement: ASTNode | null) {
        this._statement = statement;
        this.invalidateCache();
    }
    public get statement(): ASTNode | null {
        return this._statement;
    }

    public set isStatic(value: boolean) {
        this._isStatic = value;
    }
    public get isStatic(): boolean {
        return this._isStatic;
    }

    public set refreshEveryMs(value: number | null) {
        this._refreshEveryMs = value;
    }
    public get refreshEveryMs(): number | null {
        return this._refreshEveryMs;
    }

    public invalidateCache(): void {
        this._cache = null;
        this._cachedAt = 0;
    }

    /** True if the cached payload (if any) is still within its refresh window. */
    private isCacheFresh(): boolean {
        return this._refreshEveryMs === null || Date.now() - this._cachedAt < this._refreshEveryMs;
    }

    /**
     * Execute the backing statement and return its records, using the
     * persistent cache when it is safe to do so.
     *
     * @param args        Pass-down filter arguments; bypasses the cache.
     * @param provenance  Run the inner statement with provenance enabled
     *                    so each emitted record carries a weak-map link to
     *                    the inner row that produced it.  Also bypasses the
     *                    cache (the weak-map binding must be re-established
     *                    each call).
     */
    public async data(
        args: Record<string, any> | null = null,
        provenance: boolean = false,
        sourceContext: SourceContext | null = null
    ): Promise<Record<string, any>[]> {
        if (this._statement === null) {
            throw new Error("Statement is null");
        }
        // Filter pass-down queries (with args) and provenance mode bypass
        // the persistent cache: arg-bound results depend on runtime values,
        // and provenance mode needs fresh records to back the lineage
        // weak-map.
        const cacheable = !provenance && args === null && this._isStatic;
        if (cacheable && this._cache !== null && this.isCacheFresh()) {
            return this._cache;
        }
        const result = await this.runInner(args, provenance, sourceContext);
        if (cacheable) {
            this._cache = result;
            this._cachedAt = Date.now();
        }
        return result;
    }

    private async runInner(
        args: Record<string, any> | null,
        provenance: boolean,
        sourceContext: SourceContext | null = null,
        parameters: Record<string, any> | null = null
    ): Promise<Record<string, any>[]> {
        await this.quiesce();
        // Lazy dynamic import to avoid a load-time cycle:
        // virtual_statement -> runner -> parsing -> graph (back to here).
        // Python uses the same idiom (function-local import).
        const RunnerCtor: typeof Runner = (await import("../compute/runner")).default;
        const runner = new RunnerCtor(null, this._statement, args, {
            provenance,
            parameters: parameters ?? undefined,
            [INNER_SOURCE_CONTEXT]: sourceContext,
        } as any);
        await runner.run();
        const result = runner.results;
        if (provenance) {
            const prov = runner.provenance;
            const len = Math.min(prov.length, result.length);
            for (let i = 0; i < len; i++) {
                attachVirtualSource(result[i], prov[i]);
            }
        }
        return result;
    }

    /**
     * Wait until no streamed execution of this statement is in progress.
     * A suspended stream is switched to unbounded buffering and run to
     * completion first, because executions share the statement's AST.
     */
    private async quiesce(): Promise<void> {
        while (this._active !== null) {
            const active = this._active;
            active.channel.drain();
            await active.done;
            if (this._active === active) this._active = null;
        }
    }

    /** True when the statement can stream rows (single plain RETURN without ORDER BY). */
    public get streamable(): boolean {
        const last = this._statement?.lastChild() as any;
        return (
            last !== null &&
            last !== undefined &&
            typeof last.setRowSink === "function" &&
            last.supportsRowSink === true
        );
    }

    /**
     * Serve a source request by running the statement with `$request`
     * bound to the request envelope (and `$args` to the legacy args).
     */
    public request(
        request: Record<string, any>,
        streaming: boolean,
        sourceContext: SourceContext | null
    ): Promise<Record<string, any>[]> | AsyncGenerator<Record<string, any>[]> {
        if (this._statement === null) {
            throw new Error("Statement is null");
        }
        const parameters = { request };
        if (!streaming || !this.streamable) {
            if (sourceContext !== null) sourceContext.stats.materializations++;
            return this.runInner(request.args ?? null, false, sourceContext, parameters);
        }
        return this.stream(request, parameters, sourceContext);
    }

    private async *stream(
        request: Record<string, any>,
        parameters: Record<string, any>,
        sourceContext: SourceContext | null
    ): AsyncGenerator<Record<string, any>[]> {
        await this.quiesce();
        const RunnerCtor: typeof Runner = (await import("../compute/runner")).default;
        const channel = new RowChannel(Math.max(1, request.pageSize ?? 256));
        const runner = new RunnerCtor(null, this._statement, request.args ?? null, {
            parameters,
            rowSink: (row: Record<string, any>) => channel.push(row),
            [INNER_SOURCE_CONTEXT]: sourceContext,
        } as any);
        const done = runner.run().then(
            () => channel.close(),
            (e) => channel.fail(e)
        );
        const active = { channel, done };
        this._active = active;
        const onAbort = () => channel.cancel();
        sourceContext?.signal.addEventListener("abort", onAbort, { once: true });
        try {
            yield* channel.pages();
        } finally {
            sourceContext?.signal.removeEventListener("abort", onAbort);
            channel.cancel();
            await done;
            if (this._active === active) this._active = null;
        }
    }
}

/** @internal Runner option key carrying the parent query's source context. */
export const INNER_SOURCE_CONTEXT = "__sourceContext";

/**
 * Bounded hand-off between a streaming inner statement (producer) and
 * the traversal consuming its rows.  The producer blocks once
 * `capacity` full pages are waiting.
 */
class RowChannel {
    private _pages: Record<string, any>[][] = [];
    private _current: Record<string, any>[] = [];
    private _done: boolean = false;
    private _error: unknown = null;
    private _cancelled: boolean = false;
    private _unbounded: boolean = false;
    private _consumerWaiter: (() => void) | null = null;
    private _producerWaiter: (() => void) | null = null;

    constructor(
        private readonly _pageSize: number,
        private readonly _capacity: number = 2
    ) {}

    public async push(row: Record<string, any>): Promise<void> {
        if (this._cancelled) throw new QueryCancelledError("Source stream closed");
        this._current.push(row);
        if (this._current.length < this._pageSize) return;
        this._pages.push(this._current);
        this._current = [];
        this._wakeConsumer();
        while (!this._unbounded && !this._cancelled && this._pages.length >= this._capacity) {
            await new Promise<void>((resolve) => (this._producerWaiter = resolve));
        }
        if (this._cancelled) throw new QueryCancelledError("Source stream closed");
    }
    public close(): void {
        if (this._current.length > 0) {
            this._pages.push(this._current);
            this._current = [];
        }
        this._done = true;
        this._wakeConsumer();
    }
    public fail(error: unknown): void {
        this._error = error;
        this._done = true;
        this._wakeConsumer();
    }
    public cancel(): void {
        this._cancelled = true;
        this._wakeProducer();
    }
    public drain(): void {
        this._unbounded = true;
        this._wakeProducer();
    }
    public async *pages(): AsyncGenerator<Record<string, any>[]> {
        while (true) {
            if (this._pages.length > 0) {
                const page = this._pages.shift()!;
                this._wakeProducer();
                yield page;
                continue;
            }
            if (this._done) {
                if (
                    this._error !== null &&
                    !(this._cancelled && this._error instanceof QueryCancelledError)
                ) {
                    throw this._error;
                }
                return;
            }
            await new Promise<void>((resolve) => (this._consumerWaiter = resolve));
        }
    }
    private _wakeConsumer(): void {
        const w = this._consumerWaiter;
        this._consumerWaiter = null;
        w?.();
    }
    private _wakeProducer(): void {
        const w = this._producerWaiter;
        this._producerWaiter = null;
        w?.();
    }
}

export default VirtualStatement;
