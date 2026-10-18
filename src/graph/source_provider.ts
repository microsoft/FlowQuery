/**
 * Backend-neutral source provider contract (version 1).
 *
 * A source provider exposes the rows of a virtual node label or
 * relationship type to FlowQuery and declares, through explicit
 * capabilities, which logical operations it can execute natively
 * (lookup by id, adjacency expansion, predicate filtering, paging).
 * FlowQuery plans against these declared operations only; it never
 * inspects what kind of backend sits behind a provider.
 *
 * Rows always describe the *virtual definition*: node rows carry an `id`
 * plus properties, relationship rows carry `left_id`, `right_id` plus
 * properties, exactly as a `CREATE VIRTUAL` definition would return them.
 * Ids are scoped to their label (or relationship type); they do not need
 * to be globally unique.
 *
 * Correctness rule: a provider may return a *superset* of the rows that
 * satisfy a request — FlowQuery always re-applies every constraint
 * locally — but it must never drop a row that satisfies the request.
 */

export const SOURCE_CONTRACT_VERSION = 1;

export type SourceRow = Record<string, any>;

/** Comparison operators that can appear in a {@link SourcePredicate}. */
export type PredicateOperator = "eq" | "gt" | "gte" | "lt" | "lte" | "in";

export const PREDICATE_OPERATORS: readonly PredicateOperator[] = [
    "eq",
    "gt",
    "gte",
    "lt",
    "lte",
    "in",
];

/**
 * Structured, versioned predicate over the columns of the virtual
 * definition.  Semantics (identical in the TypeScript and Python
 * implementations):
 *
 * - `eq`: the property is present and equal to `value` (host-language
 *   equality on primitives).  `value` is never `null`.
 * - `gt`/`gte`/`lt`/`lte`: a row may only be excluded when its property
 *   value is a non-null primitive of the same type as `value` (number or
 *   string) that fails the comparison.  Rows whose value is missing,
 *   `null`, or of another type must be returned.  String bounds are only
 *   sent to sources declaring `stringOrdering: "binary"`.
 * - `in`: the property is present and equal to one of `values`.  `values`
 *   is de-duplicated, contains only primitives and never contains `null`;
 *   it may be empty (no row matches).
 * - `and`: every term holds.  FlowQuery never sends `or` or negation.
 */
export type SourcePredicate =
    | { op: "and"; terms: SourcePredicate[] }
    | { op: "eq" | "gt" | "gte" | "lt" | "lte"; property: string; value: any }
    | { op: "in"; property: string; values: any[] };

export interface PredicateCapabilities {
    /** Operators the source can evaluate.  `and` is always implied. */
    operators: PredicateOperator[];
    /** Restrict push-down to these definition columns.  Omit for any column. */
    properties?: string[];
    /**
     * String ordering used for range operators.  Only `"binary"`
     * (code-unit order) matches FlowQuery and enables string range
     * push-down; numeric ranges are always eligible.
     */
    stringOrdering?: "binary";
}

interface BaseSourceCapabilities {
    /** Contract version; must be {@link SOURCE_CONTRACT_VERSION}. */
    version: number;
    /** Predicate push-down support.  Omit when the source ignores predicates. */
    predicates?: PredicateCapabilities;
    /**
     * Results are produced incrementally as pages (async iterables).  For
     * statement-backed definitions this also enables streaming execution
     * of eligible inner queries.
     */
    streaming?: boolean;
    /** Repeated identical reads within one query return the same rows and may be cached. */
    cacheable?: boolean;
    /** Maximum number of ids per lookup/expand request (default: unlimited). */
    maxBatchSize?: number;
}

export interface NodeSourceCapabilities extends BaseSourceCapabilities {
    /** The source implements {@link NodeSourceProvider.lookup} (batched lookup by id). */
    lookup?: boolean;
}

export interface RelationshipSourceCapabilities extends BaseSourceCapabilities {
    /**
     * Adjacency expansion support.  `left: true` means relationships can be
     * fetched by `left_id`, `right: true` by `right_id`.
     */
    expand?: { left?: boolean; right?: boolean };
}

interface BaseSourceRequest {
    version: number;
    /** Pushed-down predicate over definition columns, or `null`. */
    predicate: SourcePredicate | null;
    /**
     * The legacy `$args` equality map built from the pattern's own
     * property constraints (unchanged shape), or `null`.  Never contains
     * correlation ids.
     */
    args: Record<string, any> | null;
    /** Preferred page size.  Sources may return smaller or larger pages. */
    pageSize: number;
}

export interface NodeScanRequest extends BaseSourceRequest {
    operation: "scan";
    label: string;
}

export interface NodeLookupRequest extends BaseSourceRequest {
    operation: "lookup";
    label: string;
    /** Distinct ids to fetch; at most `maxBatchSize` entries. */
    ids: any[];
}

export interface RelationshipScanRequest extends BaseSourceRequest {
    operation: "scan";
    type: string;
    sourceLabel: string | null;
    targetLabel: string | null;
}

export interface RelationshipExpandRequest extends BaseSourceRequest {
    operation: "expand";
    type: string;
    sourceLabel: string | null;
    targetLabel: string | null;
    /** Which stored endpoint the anchor ids constrain (`left` → `left_id`). */
    side: "left" | "right";
    /** Distinct anchor ids; at most `maxBatchSize` entries. */
    ids: any[];
}

export type NodeSourceRequest = NodeScanRequest | NodeLookupRequest;
export type RelationshipSourceRequest = RelationshipScanRequest | RelationshipExpandRequest;

/**
 * Per-query read context passed to every provider call.
 */
export interface SourceReadContext {
    /** Aborted when the query completes, fails, is cancelled or abandons the read. */
    signal: AbortSignal;
    /** Value returned by the provider's `openReadContext`, or `undefined`. */
    snapshot: unknown;
}

/**
 * Result of a provider call: a single page (array or promise of array),
 * or a sync/async iterable of pages.  Empty pages are allowed and do not
 * signal completion; completion is the end of the iteration.
 */
export type SourceResult =
    | SourceRow[]
    | Promise<SourceRow[]>
    | AsyncIterable<SourceRow[]>
    | Iterable<SourceRow[]>;

interface BaseSourceProvider {
    /**
     * Optional query-scoped read context (e.g. a snapshot or transaction).
     * Opened lazily on first use and closed when the query ends.
     */
    openReadContext?(): unknown | Promise<unknown>;
    closeReadContext?(snapshot: unknown): void | Promise<void>;
}

export interface NodeSourceProvider extends BaseSourceProvider {
    readonly capabilities: NodeSourceCapabilities;
    /** Required: return all rows (optionally filtered by `request.predicate`). */
    scan(request: NodeScanRequest, context: SourceReadContext): SourceResult;
    /** Return rows whose `id` is in `request.ids`.  Required when `capabilities.lookup`. */
    lookup?(request: NodeLookupRequest, context: SourceReadContext): SourceResult;
    /** Optional cardinality estimate used to rank start points (lower is better). */
    estimate?(request: NodeScanRequest): number | undefined;
}

export interface RelationshipSourceProvider extends BaseSourceProvider {
    readonly capabilities: RelationshipSourceCapabilities;
    /** Required: return all rows (optionally filtered by `request.predicate`). */
    scan(request: RelationshipScanRequest, context: SourceReadContext): SourceResult;
    /** Return rows whose `side` endpoint is in `request.ids`.  Required when `capabilities.expand`. */
    expand?(request: RelationshipExpandRequest, context: SourceReadContext): SourceResult;
}

/** Base class of all source-related errors. */
export class SourceError extends Error {
    public readonly source: string;
    public readonly operation: string;
    public readonly cause?: unknown;
    constructor(message: string, source: string = "", operation: string = "", cause?: unknown) {
        super(message);
        this.name = "SourceError";
        this.source = source;
        this.operation = operation;
        this.cause = cause;
    }
}

/** Invalid capability declaration or provider registration. */
export class SourceCapabilityError extends SourceError {
    constructor(message: string, source: string = "") {
        super(message, source, "register");
        this.name = "SourceCapabilityError";
    }
}

/** Malformed provider response (non-array page, missing ids, invalid cursor...). */
export class SourceResponseError extends SourceError {
    constructor(message: string, source: string = "", operation: string = "") {
        super(message, source, operation);
        this.name = "SourceResponseError";
    }
}

/**
 * Thrown by a provider to decline an optional operation at runtime.
 * FlowQuery then uses its documented fallback (a scan).  Any other
 * error propagates to the caller of the query.
 */
export class SourceUnsupportedError extends SourceError {
    constructor(
        message: string = "Operation not supported",
        source: string = "",
        operation: string = ""
    ) {
        super(message, source, operation);
        this.name = "SourceUnsupportedError";
    }
}

/** Raised when a query is cancelled through `Runner.cancel()`. */
export class QueryCancelledError extends Error {
    constructor(message: string = "Query cancelled") {
        super(message);
        this.name = "QueryCancelledError";
    }
}

function validateBase(caps: any, name: string): void {
    if (caps === null || typeof caps !== "object") {
        throw new SourceCapabilityError(`Source ${name}: capabilities object is required`, name);
    }
    if (caps.version !== SOURCE_CONTRACT_VERSION) {
        throw new SourceCapabilityError(
            `Source ${name}: unsupported capability version ${JSON.stringify(caps.version)}; expected ${SOURCE_CONTRACT_VERSION}`,
            name
        );
    }
    if (
        caps.maxBatchSize !== undefined &&
        (!Number.isInteger(caps.maxBatchSize) || caps.maxBatchSize < 1)
    ) {
        throw new SourceCapabilityError(
            `Source ${name}: maxBatchSize must be a positive integer`,
            name
        );
    }
    if (caps.predicates !== undefined) {
        const p = caps.predicates;
        if (p === null || typeof p !== "object" || !Array.isArray(p.operators)) {
            throw new SourceCapabilityError(
                `Source ${name}: predicates.operators must be an array`,
                name
            );
        }
        for (const op of p.operators) {
            if (!PREDICATE_OPERATORS.includes(op)) {
                throw new SourceCapabilityError(
                    `Source ${name}: unknown predicate operator ${JSON.stringify(op)}; supported: ${PREDICATE_OPERATORS.join(", ")}`,
                    name
                );
            }
        }
        if (p.properties !== undefined && !Array.isArray(p.properties)) {
            throw new SourceCapabilityError(
                `Source ${name}: predicates.properties must be an array of column names`,
                name
            );
        }
        if (p.stringOrdering !== undefined && p.stringOrdering !== "binary") {
            throw new SourceCapabilityError(
                `Source ${name}: predicates.stringOrdering must be "binary" when set`,
                name
            );
        }
    }
}

/** Validate a node provider; throws {@link SourceCapabilityError} with an actionable message. */
export function validateNodeProvider(provider: NodeSourceProvider, name: string): void {
    if (provider === null || typeof provider !== "object") {
        throw new SourceCapabilityError(`Source ${name}: provider object is required`, name);
    }
    validateBase(provider.capabilities, name);
    if (typeof provider.scan !== "function") {
        throw new SourceCapabilityError(`Source ${name}: provider must implement scan()`, name);
    }
    if (provider.capabilities.lookup && typeof provider.lookup !== "function") {
        throw new SourceCapabilityError(
            `Source ${name}: capabilities.lookup is true but lookup() is not implemented`,
            name
        );
    }
}

/** Validate a relationship provider; throws {@link SourceCapabilityError} with an actionable message. */
export function validateRelationshipProvider(
    provider: RelationshipSourceProvider,
    name: string
): void {
    if (provider === null || typeof provider !== "object") {
        throw new SourceCapabilityError(`Source ${name}: provider object is required`, name);
    }
    validateBase(provider.capabilities, name);
    if (typeof provider.scan !== "function") {
        throw new SourceCapabilityError(`Source ${name}: provider must implement scan()`, name);
    }
    const expand = provider.capabilities.expand;
    if (expand !== undefined) {
        if (expand === null || typeof expand !== "object") {
            throw new SourceCapabilityError(
                `Source ${name}: capabilities.expand must be an object like { left: true, right: true }`,
                name
            );
        }
        if ((expand.left || expand.right) && typeof provider.expand !== "function") {
            throw new SourceCapabilityError(
                `Source ${name}: capabilities.expand is declared but expand() is not implemented`,
                name
            );
        }
    }
}

/**
 * Turn a continuation-token API into a page iterator.  Tokens stay opaque
 * to FlowQuery; a token repeated twice in a row is reported as an invalid
 * cursor instead of looping forever.
 *
 * @example
 * ```typescript
 * scan(req, ctx) {
 *     return cursorPages((cursor) => backend.query(req, cursor, req.pageSize));
 * }
 * ```
 */
export async function* cursorPages(
    fetchPage: (cursor: string | null) => Promise<{ rows: SourceRow[]; cursor?: string | null }>
): AsyncGenerator<SourceRow[], void, unknown> {
    let cursor: string | null = null;
    while (true) {
        const page = await fetchPage(cursor);
        if (page === null || typeof page !== "object" || !Array.isArray(page.rows)) {
            throw new SourceResponseError("Cursor page must be an object with a rows array");
        }
        yield page.rows;
        const next = page.cursor ?? null;
        if (next === null) {
            return;
        }
        if (next === cursor) {
            throw new SourceResponseError(`Invalid continuation token: ${String(next)} repeated`);
        }
        cursor = next;
    }
}

function isRangeComparable(value: any, bound: any): boolean {
    return (
        value !== null &&
        value !== undefined &&
        (typeof bound === "number" || typeof bound === "string") &&
        typeof value === typeof bound
    );
}

/**
 * A source may only drop a row for an equality/IN term when the property
 * is absent or holds a number/string that differs from every value;
 * other values (booleans, lists, maps...) must be returned and are
 * re-checked by FlowQuery.
 */
function matchesEquality(row: SourceRow, property: string, values: readonly any[]): boolean {
    if (!(property in row)) return false;
    const value = row[property];
    if (typeof value !== "number" && typeof value !== "string") return true;
    return values.includes(value);
}

/**
 * Reference implementation of {@link SourcePredicate} semantics for
 * in-memory providers and tests.  Returns `true` when the row must be
 * returned by a source receiving this predicate.
 */
export function matchesPredicate(predicate: SourcePredicate | null, row: SourceRow): boolean {
    if (predicate === null) return true;
    switch (predicate.op) {
        case "and":
            return predicate.terms.every((t) => matchesPredicate(t, row));
        case "eq":
            return matchesEquality(row, predicate.property, [predicate.value]);
        case "in":
            return matchesEquality(row, predicate.property, predicate.values);
        default: {
            const value = row[predicate.property];
            if (!isRangeComparable(value, predicate.value)) return true;
            switch (predicate.op) {
                case "gt":
                    return value > predicate.value;
                case "gte":
                    return value >= predicate.value;
                case "lt":
                    return value < predicate.value;
                case "lte":
                    return value <= predicate.value;
            }
        }
    }
    return true;
}

/** Options for {@link inMemoryNodeSource} and {@link inMemoryRelationshipSource}. */
export interface InMemorySourceOptions {
    /** Declare the source cacheable (default `true`). */
    cacheable?: boolean;
    /** Maximum ids per lookup/expand request (default: unlimited). */
    maxBatchSize?: number;
}

function* pagesOf(rows: SourceRow[], pageSize: number): Iterable<SourceRow[]> {
    const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : rows.length || 1;
    for (let i = 0; i < rows.length; i += size) {
        yield rows.slice(i, i + size);
    }
}

function filterRows(
    rows: SourceRow[],
    predicate: SourcePredicate | null,
    field: string | null,
    ids: any[] | null
): SourceRow[] {
    const wanted = ids === null ? null : new Set(ids);
    return rows.filter(
        (row) =>
            (wanted === null || (field !== null && wanted.has(row[field]))) &&
            matchesPredicate(predicate, row)
    );
}

function inMemoryCapabilities(options: InMemorySourceOptions): Record<string, any> {
    const caps: Record<string, any> = {
        version: SOURCE_CONTRACT_VERSION,
        cacheable: options.cacheable ?? true,
        streaming: true,
        predicates: { operators: [...PREDICATE_OPERATORS], stringOrdering: "binary" },
    };
    if (options.maxBatchSize !== undefined) caps.maxBatchSize = options.maxBatchSize;
    return caps;
}

/**
 * A ready-made node source over an in-memory array of rows (each with an
 * `id`).  It supports lookup, every predicate operator and paging, which
 * makes it handy for tests, examples and small reference data sets.  The
 * array is read on every request, so later mutations are visible.
 *
 * @example
 * ```typescript
 * FlowQuery.registerNodeSource("Person", inMemoryNodeSource([{ id: 1, name: "Ada" }]));
 * ```
 */
export function inMemoryNodeSource(
    rows: SourceRow[],
    options: InMemorySourceOptions = {}
): NodeSourceProvider {
    return {
        capabilities: { ...inMemoryCapabilities(options), lookup: true } as NodeSourceCapabilities,
        scan: (req) => pagesOf(filterRows(rows, req.predicate, null, null), req.pageSize),
        lookup: (req) => pagesOf(filterRows(rows, req.predicate, "id", req.ids), req.pageSize),
    };
}

/**
 * A ready-made relationship source over an in-memory array of rows (each
 * with `left_id` and `right_id`), supporting expansion from both sides.
 *
 * @example
 * ```typescript
 * FlowQuery.registerRelationshipSource(
 *     "KNOWS", "Person", "Person",
 *     inMemoryRelationshipSource([{ left_id: 1, right_id: 2, since: 2020 }])
 * );
 * ```
 */
export function inMemoryRelationshipSource(
    rows: SourceRow[],
    options: InMemorySourceOptions = {}
): RelationshipSourceProvider {
    return {
        capabilities: {
            ...inMemoryCapabilities(options),
            expand: { left: true, right: true },
        } as RelationshipSourceCapabilities,
        scan: (req) => pagesOf(filterRows(rows, req.predicate, null, null), req.pageSize),
        expand: (req) =>
            pagesOf(
                filterRows(
                    rows,
                    req.predicate,
                    req.side === "left" ? "left_id" : "right_id",
                    req.ids
                ),
                req.pageSize
            ),
    };
}
