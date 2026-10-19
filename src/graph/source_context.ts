import {
    QueryCancelledError,
    SOURCE_CONTRACT_VERSION,
    SourceError,
    SourceReadContext,
    SourceResponseError,
    SourceRow,
    SourceUnsupportedError,
} from "./source_provider";
import type { WriteSet } from "./write_set";

/** Options controlling provider-backed execution (`RunnerOptions.sources`). */
export interface SourceOptions {
    /** Preferred page size sent to providers (default 256). */
    pageSize?: number;
    /** Upper bound on ids per lookup/expand request (default 100; providers may lower it). */
    maxBatchSize?: number;
    /** Query-scoped cache capacity, in rows (default 10000; 0 disables caching). */
    cacheCapacity?: number;
    /** Maximum rows buffered by a batched expansion before falling back to streaming (default 1024). */
    maxPrefetchRows?: number;
    /** Allow reversing a pattern to start from a more selective end node (default true). */
    reorder?: boolean;
    /** External cancellation signal for the query. */
    signal?: AbortSignal;
}

export interface ResolvedSourceOptions {
    pageSize: number;
    maxBatchSize: number;
    cacheCapacity: number;
    maxPrefetchRows: number;
    reorder: boolean;
}

/** A start-point decision recorded for diagnostics. */
export interface SourcePlan {
    pattern: string;
    start: "first" | "last";
    reason: string;
}

/** Counters describing provider interaction for one query. */
export interface SourceStats {
    calls: { scan: number; lookup: number; expand: number };
    pages: number;
    rows: number;
    cacheHits: number;
    cacheMisses: number;
    batches: number;
    materializations: number;
    fallbacks: number;
    cancellations: number;
    peakBufferedRows: number;
    plans: SourcePlan[];
}

export function emptySourceStats(): SourceStats {
    return {
        calls: { scan: 0, lookup: 0, expand: 0 },
        pages: 0,
        rows: 0,
        cacheHits: 0,
        cacheMisses: 0,
        batches: 0,
        materializations: 0,
        fallbacks: 0,
        cancellations: 0,
        peakBufferedRows: 0,
        plans: [],
    };
}

/**
 * Canonical, type-tagged cache key.  `1` and `"1"` produce different
 * keys; object keys are sorted so logically equal requests collide.
 */
export function canonicalKey(value: any): string {
    if (value === undefined) return "u";
    if (value === null) return "z";
    switch (typeof value) {
        case "boolean":
            return `b:${value}`;
        case "number":
            return `n:${Object.is(value, -0) ? 0 : value}`;
        case "string":
            return `s:${JSON.stringify(value)}`;
        case "bigint":
            return `i:${value.toString()}`;
    }
    if (Array.isArray(value)) {
        return `[${value.map(canonicalKey).join(",")}]`;
    }
    if (typeof value === "object") {
        const keys = Object.keys(value).sort();
        return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalKey(value[k])}`).join(",")}}`;
    }
    return `x:${String(value)}`;
}

/** Row-weighted LRU cache of completed reads. */
class RowCache {
    private _entries: Map<string, SourceRow[]> = new Map();
    private _weight: number = 0;
    constructor(private readonly _capacity: number) {}
    public get(key: string): SourceRow[] | undefined {
        const rows = this._entries.get(key);
        if (rows !== undefined) {
            this._entries.delete(key);
            this._entries.set(key, rows);
        }
        return rows;
    }
    public set(key: string, rows: SourceRow[]): void {
        const weight = Math.max(1, rows.length);
        if (weight > this._capacity) return;
        const existing = this._entries.get(key);
        if (existing !== undefined) {
            this._weight -= Math.max(1, existing.length);
            this._entries.delete(key);
        }
        this._entries.set(key, rows);
        this._weight += weight;
        for (const [k, v] of this._entries) {
            if (this._weight <= this._capacity) break;
            this._entries.delete(k);
            this._weight -= Math.max(1, v.length);
        }
    }
    public get size(): number {
        return this._entries.size;
    }
}

interface OpenedReadContext {
    provider: any;
    snapshot: unknown;
}

/**
 * Query-scoped state shared by every provider read of one top-level
 * query (including nested virtual definition runs): options, stats,
 * the read cache, cancellation and provider read contexts.
 */
class SourceContext {
    public readonly options: ResolvedSourceOptions;
    public readonly stats: SourceStats = emptySourceStats();
    public readonly provenance: boolean;
    /** Top-level query parameters (`RunnerOptions.parameters`), visible to nested runs. */
    public parameters: Record<string, any> = {};
    /** Changes collected by write clauses; sent to the backend when the query succeeds. */
    public writes: WriteSet | null = null;
    private _controller: AbortController = new AbortController();
    private _cache: RowCache;
    private _inflight: Map<string, Promise<SourceRow[]>> = new Map();
    private _readContexts: Map<any, Promise<OpenedReadContext>> = new Map();
    private _materialized: Map<string, Promise<SourceRow[]>> = new Map();
    private _closed: boolean = false;
    private _externalSignal: AbortSignal | undefined;
    private _onExternalAbort: (() => void) | null = null;

    constructor(options: SourceOptions = {}, provenance: boolean = false) {
        this.options = {
            pageSize: positive(options.pageSize, 256),
            maxBatchSize: positive(options.maxBatchSize, 100),
            cacheCapacity: Math.max(0, options.cacheCapacity ?? 10000),
            maxPrefetchRows: Math.max(0, options.maxPrefetchRows ?? 1024),
            reorder: options.reorder ?? true,
        };
        this.provenance = provenance;
        this._cache = new RowCache(this.options.cacheCapacity);
        this._externalSignal = options.signal;
        if (options.signal !== undefined) {
            if (options.signal.aborted) {
                this.cancel();
            } else {
                this._onExternalAbort = () => this.cancel();
                options.signal.addEventListener("abort", this._onExternalAbort);
            }
        }
    }

    public get signal(): AbortSignal {
        return this._controller.signal;
    }
    public get cancelled(): boolean {
        return this._controller.signal.aborted;
    }
    /** Cancel the query: aborts every in-flight provider read. */
    public cancel(reason: string = "Query cancelled"): void {
        if (!this._controller.signal.aborted) {
            this.stats.cancellations++;
            this._controller.abort(new QueryCancelledError(reason));
        }
    }
    public throwIfCancelled(): void {
        if (this._controller.signal.aborted) {
            const reason = this._controller.signal.reason;
            throw reason instanceof QueryCancelledError ? reason : new QueryCancelledError();
        }
    }
    /** Await `promise`, rejecting early when the query is cancelled. */
    public race<T>(promise: Promise<T>): Promise<T> {
        if (this.cancelled) {
            promise.catch(() => undefined);
            return Promise.reject(this._controller.signal.reason);
        }
        return new Promise<T>((resolve, reject) => {
            const onAbort = () => reject(this._controller.signal.reason);
            this._controller.signal.addEventListener("abort", onAbort, { once: true });
            promise.then(
                (v) => {
                    this._controller.signal.removeEventListener("abort", onAbort);
                    resolve(v);
                },
                (e) => {
                    this._controller.signal.removeEventListener("abort", onAbort);
                    reject(e);
                }
            );
        });
    }

    public cacheGet(key: string): SourceRow[] | undefined {
        if (this.options.cacheCapacity === 0) return undefined;
        const rows = this._cache.get(key);
        if (rows !== undefined) this.stats.cacheHits++;
        else this.stats.cacheMisses++;
        return rows;
    }
    public cacheSet(key: string, rows: SourceRow[]): void {
        if (this.options.cacheCapacity === 0) return;
        this._cache.set(key, rows);
    }
    /** Drop cached and materialized reads (after the query wrote to a backend). */
    public clearCache(): void {
        this._cache = new RowCache(this.options.cacheCapacity);
        this._materialized.clear();
    }
    /** Coalesce concurrent identical reads within the query. */
    public coalesce(key: string, load: () => Promise<SourceRow[]>): Promise<SourceRow[]> {
        const pending = this._inflight.get(key);
        if (pending !== undefined) return pending;
        const promise = load().finally(() => this._inflight.delete(key));
        this._inflight.set(key, promise);
        return promise;
    }
    /** Full-scan materialization shared within the query (fallback path). */
    public materialize(key: string, load: () => Promise<SourceRow[]>): Promise<SourceRow[]> {
        let pending = this._materialized.get(key);
        if (pending === undefined) {
            this.stats.materializations++;
            pending = load();
            this._materialized.set(key, pending);
            pending.catch(() => this._materialized.delete(key));
        }
        return pending;
    }
    public notePeakBuffered(rows: number): void {
        if (rows > this.stats.peakBufferedRows) this.stats.peakBufferedRows = rows;
    }

    /** Lazily open the provider's read context (once per query). */
    public async readContext(provider: any): Promise<SourceReadContext> {
        if (this._closed) {
            throw new SourceError("Query already finished; source reads are closed");
        }
        let opened = this._readContexts.get(provider);
        if (opened === undefined) {
            opened = (async () => ({
                provider,
                snapshot:
                    typeof provider.openReadContext === "function"
                        ? await provider.openReadContext()
                        : undefined,
            }))();
            this._readContexts.set(provider, opened);
        }
        const ctx = await opened;
        const readContext: SourceReadContext = {
            signal: this._controller.signal,
            snapshot: ctx.snapshot,
        };
        Object.defineProperty(readContext, OWNER, { value: this, enumerable: false });
        return readContext;
    }

    /** End the query: abort outstanding reads and close provider read contexts. */
    public async close(): Promise<void> {
        if (this._closed) return;
        this._closed = true;
        if (this._externalSignal !== undefined && this._onExternalAbort !== null) {
            this._externalSignal.removeEventListener("abort", this._onExternalAbort);
        }
        if (!this._controller.signal.aborted) {
            this._controller.abort(new QueryCancelledError("Query finished"));
        }
        let firstError: unknown = null;
        for (const opened of this._readContexts.values()) {
            try {
                const ctx = await opened;
                if (typeof ctx.provider.closeReadContext === "function") {
                    await ctx.provider.closeReadContext(ctx.snapshot);
                }
            } catch (e) {
                if (firstError === null) firstError = e;
            }
        }
        this._readContexts.clear();
        if (firstError !== null) throw firstError;
    }

    /**
     * Invoke a provider operation and iterate its result as validated
     * pages.  Errors are wrapped with the source name and operation;
     * {@link SourceUnsupportedError} and cancellation propagate as-is.
     */
    public async *call(
        provider: any,
        operation: "scan" | "lookup" | "expand",
        name: string,
        kind: "node" | "relationship",
        request: Record<string, any>
    ): AsyncGenerator<SourceRow[], void, unknown> {
        this.throwIfCancelled();
        const readContext = await this.readContext(provider);
        this.stats.calls[operation]++;
        let result: any;
        try {
            result = provider[operation](
                { version: SOURCE_CONTRACT_VERSION, ...request },
                readContext
            );
        } catch (e) {
            throw wrapError(e, name, operation);
        }
        try {
            if (Array.isArray(result)) {
                yield this._page(result, name, operation, kind);
                return;
            }
            if (
                result !== null &&
                typeof result === "object" &&
                typeof result.then === "function"
            ) {
                const page = await this.race(result as Promise<any>);
                yield this._page(page, name, operation, kind);
                return;
            }
            if (result !== null && typeof result === "object") {
                if (typeof result[Symbol.asyncIterator] === "function") {
                    const iterator: AsyncIterator<any> = result[Symbol.asyncIterator]();
                    try {
                        while (true) {
                            const step = await this.race(iterator.next());
                            if (step.done) return;
                            yield this._page(step.value, name, operation, kind);
                        }
                    } finally {
                        // A generator suspended inside its own await only
                        // handles return() once that await settles; don't
                        // let a non-cooperative provider block cancellation.
                        const closing = closeIterator(iterator);
                        if (!this.cancelled) await closing;
                    }
                }
                if (typeof result[Symbol.iterator] === "function") {
                    for (const page of result as Iterable<any>) {
                        this.throwIfCancelled();
                        yield this._page(page, name, operation, kind);
                    }
                    return;
                }
            }
            throw new SourceResponseError(
                `Source ${name}: ${operation}() must return an array, a promise of an array, or an (async) iterable of arrays`,
                name,
                operation
            );
        } catch (e) {
            throw wrapError(e, name, operation);
        }
    }

    private _page(page: any, name: string, operation: string, kind: string): SourceRow[] {
        this.throwIfCancelled();
        if (!Array.isArray(page)) {
            throw new SourceResponseError(
                `Source ${name}: ${operation}() produced a page that is not an array`,
                name,
                operation
            );
        }
        for (const row of page) {
            if (row === null || typeof row !== "object" || Array.isArray(row)) {
                throw new SourceResponseError(
                    `Source ${name}: ${operation}() returned a row that is not an object`,
                    name,
                    operation
                );
            }
            if (kind === "node" ? !("id" in row) : !("left_id" in row) || !("right_id" in row)) {
                throw new SourceResponseError(
                    `Source ${name}: ${operation}() returned a row without ${kind === "node" ? "id" : "left_id/right_id"}`,
                    name,
                    operation
                );
            }
        }
        this.stats.pages++;
        this.stats.rows += page.length;
        return page;
    }
}

function positive(value: number | undefined, fallback: number): number {
    return value !== undefined && Number.isFinite(value) && value >= 1
        ? Math.floor(value)
        : fallback;
}

const OWNER = Symbol("flowquery.sourceContext");

/** @internal The query context that produced a read context, if any. */
export function contextOf(readContext: SourceReadContext | null | undefined): SourceContext | null {
    return (readContext as any)?.[OWNER] ?? null;
}

async function closeIterator(iterator: AsyncIterator<any>): Promise<void> {
    if (typeof iterator.return === "function") {
        try {
            await iterator.return();
        } catch {
            // Cleanup errors must not mask the primary outcome.
        }
    }
}

function wrapError(e: unknown, name: string, operation: string): unknown {
    if (
        e instanceof SourceError ||
        e instanceof QueryCancelledError ||
        e instanceof SourceUnsupportedError
    ) {
        return e;
    }
    const message = e instanceof Error ? e.message : String(e);
    return new SourceError(`Source ${name}: ${operation}() failed: ${message}`, name, operation, e);
}

export default SourceContext;
