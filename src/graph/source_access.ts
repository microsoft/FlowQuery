import ASTNode from "../parsing/ast_node";
import ListComprehension from "../parsing/data_structures/list_comprehension";
import BindingReference from "../parsing/expressions/binding_reference";
import Expression from "../parsing/expressions/expression";
import Reference from "../parsing/expressions/reference";
import Function from "../parsing/functions/function";
import {
    VIRTUAL_NAMESPACE,
    endpointMatches,
    originMatches,
    withEndpointNamespaces,
} from "./graph_records";
import SourceContext, { canonicalKey } from "./source_context";
import {
    NodeSourceProvider,
    PredicateCapabilities,
    PredicateOperator,
    RelationshipSourceProvider,
    SourcePredicate,
    SourceRow,
    SourceUnsupportedError,
} from "./source_provider";

/** A constraint FlowQuery may push to a source (evaluated per request). */
export interface PushTerm {
    op: PredicateOperator;
    property: string;
    value?: any;
    values?: any[];
}

/** A WHERE comparison attached to a pattern node for push-down. */
export interface PushedPredicate {
    op: "gt" | "gte" | "lt" | "lte" | "in";
    property: string;
    expression: ASTNode;
}

export interface SourceTerms {
    terms: PushTerm[];
    /** Legacy `$args` equality map from the element's own static properties. */
    args: Record<string, any> | null;
}

/**
 * True when the expression only depends on literals and query
 * parameters, i.e. its value is fixed for the whole query.
 */
export function isStaticExpression(node: ASTNode): boolean {
    if (
        node instanceof Reference ||
        node instanceof BindingReference ||
        node instanceof Function ||
        node instanceof ListComprehension ||
        // Pattern and sub-query expressions are evaluated per row.
        typeof (node as any).evaluate === "function"
    ) {
        return false;
    }
    for (const child of node.getChildren()) {
        if (!isStaticExpression(child)) return false;
    }
    return true;
}

/** Evaluate static element properties and pushed WHERE predicates into push terms. */
export function buildTerms(
    properties: Map<string, Expression>,
    pushed: PushedPredicate[]
): SourceTerms {
    const terms: PushTerm[] = [];
    let args: Record<string, any> | null = null;
    for (const [key, expression] of properties) {
        if (!isStaticExpression(expression)) continue;
        const value = expression.value();
        args ??= {};
        args[key] = value;
        terms.push({ op: "eq", property: key, value });
    }
    for (const p of pushed) {
        const value = p.expression.value();
        if (p.op === "in") {
            if (Array.isArray(value)) terms.push({ op: "in", property: p.property, values: value });
        } else {
            terms.push({ op: p.op, property: p.property, value });
        }
    }
    return { terms, args };
}

function isPushablePrimitive(value: any): boolean {
    return typeof value === "string" || (typeof value === "number" && Number.isFinite(value));
}

/**
 * UTF-16 code-unit order (JavaScript's `<`) and Unicode code-point order
 * only disagree between surrogate pairs (U+10000 and above) and
 * U+E000–U+FFFF.  A bound without code units at or above U+D800 compares
 * the same way against every string under both orders, so it is safe to
 * push to a `"codepoint"` source.
 */
function codePointSafe(bound: string): boolean {
    for (let i = 0; i < bound.length; i++) {
        if (bound.charCodeAt(i) >= 0xd800) return false;
    }
    return true;
}

/** Convert a term into a contract predicate the source can evaluate, or null. */
function toPredicate(
    caps: PredicateCapabilities | undefined,
    term: PushTerm
): SourcePredicate | null {
    if (caps === undefined || !caps.operators.includes(term.op)) return null;
    if (caps.properties !== undefined && !caps.properties.includes(term.property)) return null;
    switch (term.op) {
        case "eq":
            return isPushablePrimitive(term.value)
                ? { op: "eq", property: term.property, value: term.value }
                : null;
        case "in": {
            const values = term.values ?? [];
            if (!values.every(isPushablePrimitive)) return null;
            const seen = new Set<string>();
            const distinct: any[] = [];
            for (const v of values) {
                const key = canonicalKey(v);
                if (!seen.has(key)) {
                    seen.add(key);
                    distinct.push(v);
                }
            }
            return { op: "in", property: term.property, values: distinct };
        }
        default:
            if (typeof term.value === "number" && Number.isFinite(term.value)) {
                return { op: term.op, property: term.property, value: term.value };
            }
            if (
                typeof term.value === "string" &&
                (caps.stringOrdering === "binary" ||
                    (caps.stringOrdering === "codepoint" && codePointSafe(term.value)))
            ) {
                return { op: term.op, property: term.property, value: term.value };
            }
            return null;
    }
}

function combine(predicates: SourcePredicate[]): SourcePredicate | null {
    if (predicates.length === 0) return null;
    if (predicates.length === 1) return predicates[0];
    return { op: "and", terms: predicates };
}

export function predicateFor(
    caps: PredicateCapabilities | undefined,
    terms: PushTerm[]
): SourcePredicate | null {
    const out: SourcePredicate[] = [];
    for (const term of terms) {
        const p = toPredicate(caps, term);
        if (p !== null) out.push(p);
    }
    return combine(out);
}

function supportsKeyIn(caps: PredicateCapabilities | undefined, field: string): boolean {
    return (
        caps !== undefined &&
        caps.operators.includes("in") &&
        (caps.properties === undefined || caps.properties.includes(field))
    );
}

const providerIds: WeakMap<object, number> = new WeakMap();
let nextProviderId = 0;
function providerKey(provider: object): number {
    let id = providerIds.get(provider);
    if (id === undefined) {
        id = ++nextProviderId;
        providerIds.set(provider, id);
    }
    return id;
}

function chunk<T>(items: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
}

function distinct(ids: any[]): any[] {
    const seen = new Set<string>();
    const out: any[] = [];
    for (const id of ids) {
        if (id === null || id === undefined) continue;
        const key = canonicalKey(id);
        if (!seen.has(key)) {
            seen.add(key);
            out.push(id);
        }
    }
    return out;
}

const indexCache: WeakMap<SourceRow[], Map<string, Map<string, SourceRow[]>>> = new WeakMap();
function indexRows(rows: SourceRow[], field: string): Map<string, SourceRow[]> {
    let byField = indexCache.get(rows);
    if (byField === undefined) {
        byField = new Map();
        indexCache.set(rows, byField);
    }
    let index = byField.get(field);
    if (index === undefined) {
        index = new Map();
        for (const row of rows) {
            if (!(field in row)) continue;
            const key = canonicalKey(row[field]);
            let bucket = index.get(key);
            if (bucket === undefined) {
                bucket = [];
                index.set(key, bucket);
            }
            bucket.push(row);
        }
        byField.set(field, index);
    }
    return index;
}

/** Common machinery for one provider bound to one label or relationship type. */
abstract class SourceEntry {
    protected _unsupported: Set<string> = new Set();
    constructor(
        protected readonly ctx: SourceContext,
        public readonly provider: NodeSourceProvider | RelationshipSourceProvider,
        public readonly name: string,
        protected readonly kind: "node" | "relationship",
        /**
         * Namespace of the entry: the name of the graph it reads, or
         * `"virtual"` for a `CREATE VIRTUAL` definition.
         */
        public readonly namespace: string = VIRTUAL_NAMESPACE
    ) {}
    /** The entry reads a graph (rows carry their graph's namespace). */
    public get isGraph(): boolean {
        return this.namespace !== VIRTUAL_NAMESPACE;
    }

    protected abstract base(): Record<string, any>;
    protected abstract enrich(row: SourceRow): SourceRow;

    protected get caps() {
        return this.provider.capabilities;
    }
    protected get batchSize(): number {
        return Math.min(this.ctx.options.maxBatchSize, this.caps.maxBatchSize ?? Infinity);
    }
    protected get cacheable(): boolean {
        return this.caps.cacheable === true;
    }
    protected cacheKey(
        op: string,
        predicate: SourcePredicate | null,
        args: any,
        extra: any
    ): string {
        return `${this.kind}|${providerKey(this.provider)}|${this.name}|${op}|${canonicalKey(predicate)}|${canonicalKey(args)}|${canonicalKey(extra)}`;
    }

    /** Stream scan pages, optionally constrained by an extra key predicate. */
    public async *scan(
        terms: PushTerm[],
        args: Record<string, any> | null
    ): AsyncGenerator<SourceRow[]> {
        const predicate = predicateFor(this.caps.predicates, terms);
        yield* this.scanWith(predicate, args);
    }

    protected async *scanWith(
        predicate: SourcePredicate | null,
        args: Record<string, any> | null
    ): AsyncGenerator<SourceRow[]> {
        const key = this.cacheable ? this.cacheKey("scan", predicate, args, null) : null;
        if (key !== null) {
            const cached = this.ctx.cacheGet(key);
            if (cached !== undefined) {
                yield cached;
                return;
            }
        }
        const collected: SourceRow[] | null = key !== null ? [] : null;
        let overflow = false;
        for await (const page of this.ctx.call(this.provider, "scan", this.name, this.kind, {
            operation: "scan",
            ...this.base(),
            predicate,
            args,
            pageSize: this.ctx.options.pageSize,
        })) {
            const enriched = page.map((row) => this.enrich(row));
            if (collected !== null && !overflow) {
                if (collected.length + enriched.length > this.ctx.options.cacheCapacity) {
                    overflow = true;
                } else {
                    collected.push(...enriched);
                }
            }
            yield enriched;
        }
        if (key !== null && collected !== null && !overflow) {
            this.ctx.cacheSet(key, collected);
        }
    }

    /** Fully materialize a scan (shared per query) as the last-resort fallback. */
    protected materializeAll(args: Record<string, any> | null): Promise<SourceRow[]> {
        const key = this.cacheKey("materialize", null, args, null);
        return this.ctx.materialize(key, async () => {
            const rows: SourceRow[] = [];
            for await (const page of this.scanWith(null, args)) rows.push(...page);
            return rows;
        });
    }

    /**
     * Fetch rows for a set of key values using the native keyed operation
     * (`lookup`/`expand`) in batches, falling back to filtered scans or a
     * materialized scan.  Returns `null` when `maxRows` would be exceeded.
     */
    protected async fetchKeyed(
        operation: "lookup" | "expand",
        native: boolean,
        field: string,
        ids: any[],
        terms: PushTerm[],
        args: Record<string, any> | null,
        extra: Record<string, any>,
        maxRows: number = Infinity
    ): Promise<Map<string, SourceRow[]> | null> {
        const predicate = predicateFor(this.caps.predicates, terms);
        const result: Map<string, SourceRow[]> = new Map();
        const pending: any[] = [];
        for (const id of ids) {
            const key = this.cacheable
                ? this.cacheKey(operation, predicate, args, { ...extra, id })
                : null;
            const cached = key !== null ? this.ctx.cacheGet(key) : undefined;
            if (cached !== undefined) {
                result.set(canonicalKey(id), cached);
            } else {
                result.set(canonicalKey(id), []);
                pending.push(id);
            }
        }
        const wanted = new Set(pending.map(canonicalKey));
        if (pending.length === 0) return result;
        let total = 0;
        const add = (row: SourceRow): boolean => {
            const k = canonicalKey(row[field]);
            if (!wanted.has(k)) return true;
            result.get(k)!.push(this.enrich(row));
            total++;
            return total <= maxRows;
        };
        const useNative = native && !this._unsupported.has(operation);
        if (useNative) {
            try {
                for (const batch of chunk(pending, this.batchSize)) {
                    this.ctx.stats.batches++;
                    for await (const page of this.ctx.call(
                        this.provider,
                        operation,
                        this.name,
                        this.kind,
                        {
                            operation,
                            ...this.base(),
                            ...extra,
                            ids: batch,
                            predicate,
                            args,
                            pageSize: this.ctx.options.pageSize,
                        }
                    )) {
                        for (const row of page) {
                            if (!add(row)) return null;
                        }
                        this.ctx.notePeakBuffered(total);
                    }
                }
            } catch (e) {
                if (!(e instanceof SourceUnsupportedError) || total > 0) throw e;
                this._unsupported.add(operation);
                return this.fetchKeyed(operation, false, field, ids, terms, args, extra, maxRows);
            }
        } else {
            this.ctx.stats.fallbacks++;
            if (supportsKeyIn(this.caps.predicates, field)) {
                for (const batch of chunk(pending, this.batchSize)) {
                    this.ctx.stats.batches++;
                    const keyed = combine([
                        ...(predicate === null ? [] : [predicate]),
                        { op: "in", property: field, values: batch },
                    ]);
                    for await (const page of this.scanWith(keyed, args)) {
                        for (const row of page) {
                            if (!wanted.has(canonicalKey(row[field]))) continue;
                            result.get(canonicalKey(row[field]))!.push(row);
                            if (++total > maxRows) return null;
                        }
                    }
                }
            } else {
                const index = indexRows(await this.materializeAll(args), field);
                for (const id of pending) {
                    const rows = index.get(canonicalKey(id)) ?? [];
                    result.set(canonicalKey(id), rows);
                    total += rows.length;
                }
                if (total > maxRows) return null;
            }
        }
        if (this.cacheable) {
            for (const id of pending) {
                this.ctx.cacheSet(
                    this.cacheKey(operation, predicate, args, { ...extra, id }),
                    result.get(canonicalKey(id))!
                );
            }
        }
        return result;
    }
}

class NodeEntry extends SourceEntry {
    constructor(
        ctx: SourceContext,
        provider: NodeSourceProvider,
        public readonly label: string | null,
        namespace: string = VIRTUAL_NAMESPACE,
        /** Labels a graph node must all carry (`(n:A:B)`). */
        public readonly labels: string[] | null = null
    ) {
        super(ctx, provider, labels?.join(":") ?? label ?? "", "node", namespace);
    }
    protected base(): Record<string, any> {
        return this.labels !== null
            ? { label: this.label, labels: this.labels }
            : { label: this.label };
    }
    protected enrich(row: SourceRow): SourceRow {
        return this.label !== null ? { ...row, _label: this.label } : { ...row };
    }
    public get nativeLookup(): boolean {
        return (this.provider as NodeSourceProvider).capabilities.lookup === true;
    }
    public lookup(
        ids: any[],
        terms: PushTerm[],
        args: Record<string, any> | null
    ): Promise<Map<string, SourceRow[]>> {
        return this.fetchKeyed("lookup", this.nativeLookup, "id", ids, terms, args, {}) as Promise<
            Map<string, SourceRow[]>
        >;
    }
    public estimate(terms: PushTerm[], args: Record<string, any> | null): number | undefined {
        const provider = this.provider as NodeSourceProvider;
        if (typeof provider.estimate !== "function") return undefined;
        return provider.estimate({
            version: 1,
            operation: "scan",
            label: this.label as string,
            predicate: predicateFor(this.caps.predicates, terms),
            args,
            pageSize: this.ctx.options.pageSize,
        });
    }
    public pushes(terms: PushTerm[]): boolean {
        return predicateFor(this.caps.predicates, terms) !== null;
    }
}

class RelationshipEntry extends SourceEntry {
    constructor(
        ctx: SourceContext,
        provider: RelationshipSourceProvider,
        public readonly type: string | null,
        public readonly sourceLabel: string | null,
        public readonly targetLabel: string | null,
        namespace: string = VIRTUAL_NAMESPACE,
        /** Namespace of the left endpoints (definitions; graphs: any). */
        public readonly leftNamespace: string = namespace,
        /** Namespace of the right endpoints (definitions; graphs: any). */
        public readonly rightNamespace: string = namespace
    ) {
        super(
            ctx,
            provider,
            `(:${sourceLabel ?? ""})-[:${type ?? ""}]->(:${targetLabel ?? ""})`,
            "relationship",
            namespace
        );
    }
    protected base(): Record<string, any> {
        return { type: this.type, sourceLabel: this.sourceLabel, targetLabel: this.targetLabel };
    }
    protected enrich(row: SourceRow): SourceRow {
        if (this.isGraph) return { ...row, _type: this.type ?? row._type };
        return withEndpointNamespaces(
            { ...row, _type: this.type ?? row._type },
            this.leftNamespace,
            this.rightNamespace
        );
    }
    /** Rows of this entry can have their `side` endpoint in namespace `origin`. */
    public reaches(side: "left" | "right", origin: string | undefined): boolean {
        if (origin === undefined || this.isGraph) return true;
        return (side === "left" ? this.leftNamespace : this.rightNamespace) === origin;
    }
    /** Request additions of an expansion from anchors in namespace `origin`. */
    private expandExtra(side: "left" | "right", origin: string | undefined): Record<string, any> {
        return this.isGraph && origin !== undefined ? { side, anchorGraph: origin } : { side };
    }
    public nativeExpand(side: "left" | "right"): boolean {
        return (this.provider as RelationshipSourceProvider).capabilities.expand?.[side] === true;
    }
    public expandBatch(
        side: "left" | "right",
        ids: any[],
        terms: PushTerm[],
        args: Record<string, any> | null,
        maxRows: number,
        origin?: string
    ): Promise<Map<string, SourceRow[]> | null> {
        return this.fetchKeyed(
            "expand",
            this.nativeExpand(side),
            `${side}_id`,
            ids,
            terms,
            args,
            this.expandExtra(side, origin),
            maxRows
        );
    }
    /** Stream the relationships of one anchor without buffering. */
    public async *expandOne(
        side: "left" | "right",
        id: any,
        terms: PushTerm[],
        args: Record<string, any> | null,
        origin?: string
    ): AsyncGenerator<SourceRow[]> {
        const field = `${side}_id`;
        const predicate = predicateFor(this.caps.predicates, terms);
        const keyed = this.expandExtra(side, origin);
        const extra = { ...keyed, id };
        const key = this.cacheable ? this.cacheKey("expand", predicate, args, extra) : null;
        if (key !== null) {
            const cached = this.ctx.cacheGet(key);
            if (cached !== undefined) {
                yield cached;
                return;
            }
        }
        if (!this.nativeExpand(side) || this._unsupported.has("expand")) {
            const rows = await this.fetchKeyed("expand", false, field, [id], terms, args, keyed);
            yield rows!.get(canonicalKey(id)) ?? [];
            return;
        }
        const want = canonicalKey(id);
        const collected: SourceRow[] | null = key !== null ? [] : null;
        let overflow = false;
        let yielded = false;
        try {
            for await (const page of this.ctx.call(this.provider, "expand", this.name, this.kind, {
                operation: "expand",
                ...this.base(),
                ...keyed,
                ids: [id],
                predicate,
                args,
                pageSize: this.ctx.options.pageSize,
            })) {
                const rows = page
                    .filter((r) => canonicalKey(r[field]) === want)
                    .map((r) => this.enrich(r));
                if (collected !== null && !overflow) {
                    if (collected.length + rows.length > this.ctx.options.cacheCapacity)
                        overflow = true;
                    else collected.push(...rows);
                }
                yielded = true;
                yield rows;
            }
        } catch (e) {
            if (!(e instanceof SourceUnsupportedError) || yielded) throw e;
            this._unsupported.add("expand");
            yield* this.expandOne(side, id, terms, args, origin);
            return;
        }
        if (key !== null && collected !== null && !overflow) this.ctx.cacheSet(key, collected);
    }
}

/**
 * Common node access used by deferred traversal.
 *
 * `origin` constrains a step reached through a relationship to one
 * namespace: the name of a graph, or `"virtual"` for definition
 * entities; `undefined` keeps every namespace.  Ids never join across
 * namespaces.
 */
export interface NodeAccess {
    readonly deferred: boolean;
    scan(terms: PushTerm[], args: Record<string, any> | null): AsyncIterable<SourceRow[]>;
    lookup(
        id: any,
        terms: PushTerm[],
        args: Record<string, any> | null,
        origin?: string
    ): Promise<SourceRow[]>;
    prefetch(
        ids: any[],
        terms: PushTerm[],
        args: Record<string, any> | null,
        origin?: string
    ): Promise<void>;
    /** Selectivity hints for start-point selection. */
    canLookup(): boolean;
    pushes(terms: PushTerm[]): boolean;
    estimate(terms: PushTerm[], args: Record<string, any> | null): number | undefined;
}

/** Common relationship access used by deferred traversal. */
export interface RelationshipAccess {
    readonly deferred: boolean;
    /** Relationships whose `${side}_id` equals `anchor`, as pages. */
    expand(
        anchor: any,
        side: "left" | "right",
        terms: PushTerm[],
        args: Record<string, any> | null,
        origin?: string
    ): AsyncIterable<SourceRow[]>;
    /**
     * Batch-fetch relationships for many anchors.  Returns the buffered
     * rows, or null when nothing was prefetched (not batch-capable or the
     * buffer limit was exceeded).
     */
    prefetch(
        anchors: any[],
        side: "left" | "right",
        terms: PushTerm[],
        args: Record<string, any> | null,
        origin?: string
    ): Promise<SourceRow[] | null>;
}

function forOrigin(entries: NodeEntry[], origin: string | undefined): NodeEntry[] {
    return origin === undefined ? entries : entries.filter((e) => e.namespace === origin);
}

function rowsForOrigin(rows: SourceRow[], origin: string | undefined): SourceRow[] {
    return origin === undefined ? rows : rows.filter((row) => originMatches(row, origin));
}

/** Relationship rows whose `side` endpoint is in namespace `origin`. */
function rowsAnchored(
    rows: SourceRow[],
    side: "left" | "right",
    origin: string | undefined
): SourceRow[] {
    return origin === undefined ? rows : rows.filter((row) => endpointMatches(row, side, origin));
}

/** A prefetch buffer built for `built` can serve a step constrained to `origin`. */
function bufferServes(built: string | undefined, origin: string | undefined): boolean {
    return built === undefined || built === origin;
}

/** Provider-backed node access across one or more labels. */
export class NodeSourceAccess implements NodeAccess {
    public readonly deferred = true;
    private _entries: NodeEntry[];
    private _buffer: Map<string, SourceRow[]> | null = null;
    private _bufferOrigin: string | undefined = undefined;
    constructor(
        private readonly ctx: SourceContext,
        entries: {
            label: string | null;
            provider: NodeSourceProvider;
            /** Graph name; omitted for definitions. */
            graph?: string | null;
            labels?: string[] | null;
        }[]
    ) {
        this._entries = entries.map(
            (e) =>
                new NodeEntry(
                    ctx,
                    e.provider,
                    e.label,
                    e.graph ?? VIRTUAL_NAMESPACE,
                    e.labels ?? null
                )
        );
    }
    public async *scan(
        terms: PushTerm[],
        args: Record<string, any> | null
    ): AsyncGenerator<SourceRow[]> {
        for (const entry of this._entries) yield* entry.scan(terms, args);
    }
    public async prefetch(
        ids: any[],
        terms: PushTerm[],
        args: Record<string, any> | null,
        origin?: string
    ): Promise<void> {
        const unique = distinct(ids);
        const previous = bufferServes(this._bufferOrigin, origin) ? this._buffer : null;
        const buffer: Map<string, SourceRow[]> = new Map();
        const missing: any[] = [];
        for (const id of unique) {
            const key = canonicalKey(id);
            const kept = previous?.get(key);
            if (kept !== undefined) {
                buffer.set(key, rowsForOrigin(kept, origin));
            } else {
                buffer.set(key, []);
                missing.push(id);
            }
        }
        if (missing.length > 0) {
            for (const entry of forOrigin(this._entries, origin)) {
                const rows = await entry.lookup(missing, terms, args);
                for (const [key, list] of rows) buffer.get(key)!.push(...list);
            }
        }
        this._buffer = buffer;
        this._bufferOrigin = origin;
    }
    public async lookup(
        id: any,
        terms: PushTerm[],
        args: Record<string, any> | null,
        origin?: string
    ): Promise<SourceRow[]> {
        if (id === null || id === undefined) return [];
        const key = canonicalKey(id);
        const buffered = bufferServes(this._bufferOrigin, origin)
            ? this._buffer?.get(key)
            : undefined;
        if (buffered !== undefined) return rowsForOrigin(buffered, origin);
        const out: SourceRow[] = [];
        for (const entry of forOrigin(this._entries, origin)) {
            const rows = await entry.lookup([id], terms, args);
            out.push(...(rows.get(key) ?? []));
        }
        return out;
    }
    public canLookup(): boolean {
        return this._entries.every((e) => e.nativeLookup);
    }
    public pushes(terms: PushTerm[]): boolean {
        return this._entries.every((e) => e.pushes(terms));
    }
    public estimate(terms: PushTerm[], args: Record<string, any> | null): number | undefined {
        let total = 0;
        for (const entry of this._entries) {
            const e = entry.estimate(terms, args);
            if (e === undefined) return undefined;
            total += e;
        }
        return total;
    }
}

/** Provider-backed relationship access across one or more types/endpoints. */
export class RelationshipSourceAccess implements RelationshipAccess {
    public readonly deferred = true;
    private _entries: RelationshipEntry[];
    private _buffer: Map<string, SourceRow[]> | null = null;
    private _bufferSide: "left" | "right" | null = null;
    private _bufferOrigin: string | undefined = undefined;
    constructor(
        private readonly ctx: SourceContext,
        entries: {
            type: string | null;
            sourceLabel: string | null;
            targetLabel: string | null;
            provider: RelationshipSourceProvider;
            /** Graph name; omitted for definitions. */
            graph?: string | null;
            /** Definitions: namespaces of the endpoints (default: definitions). */
            leftNamespace?: string;
            rightNamespace?: string;
        }[]
    ) {
        this._entries = entries.map((e) => {
            const namespace = e.graph ?? VIRTUAL_NAMESPACE;
            return new RelationshipEntry(
                ctx,
                e.provider,
                e.type,
                e.sourceLabel,
                e.targetLabel,
                namespace,
                e.leftNamespace ?? namespace,
                e.rightNamespace ?? namespace
            );
        });
    }
    private entriesFor(side: "left" | "right", origin: string | undefined): RelationshipEntry[] {
        return this._entries.filter((e) => e.reaches(side, origin));
    }
    public async *expand(
        anchor: any,
        side: "left" | "right",
        terms: PushTerm[],
        args: Record<string, any> | null,
        origin?: string
    ): AsyncGenerator<SourceRow[]> {
        if (anchor === null || anchor === undefined) return;
        const buffered =
            this._bufferSide === side && bufferServes(this._bufferOrigin, origin)
                ? this._buffer?.get(canonicalKey(anchor))
                : undefined;
        if (buffered !== undefined) {
            yield rowsAnchored(buffered, side, origin);
            return;
        }
        for (const entry of this.entriesFor(side, origin)) {
            for await (const page of entry.expandOne(side, anchor, terms, args, origin)) {
                yield rowsAnchored(page, side, origin);
            }
        }
    }
    public async prefetch(
        anchors: any[],
        side: "left" | "right",
        terms: PushTerm[],
        args: Record<string, any> | null,
        origin?: string
    ): Promise<SourceRow[] | null> {
        this._buffer = null;
        this._bufferSide = null;
        this._bufferOrigin = undefined;
        const unique = distinct(anchors);
        const entries = this.entriesFor(side, origin);
        if (unique.length < 2 || !entries.every((e) => e.nativeExpand(side))) return null;
        // Graph expansions are keyed by the anchors' namespace: anchors of
        // mixed namespaces are expanded one by one instead.
        if (origin === undefined && entries.some((e) => e.isGraph)) return null;
        const buffer: Map<string, SourceRow[]> = new Map();
        for (const id of unique) buffer.set(canonicalKey(id), []);
        let remaining = this.ctx.options.maxPrefetchRows;
        const all: SourceRow[] = [];
        for (const entry of entries) {
            const rows = await entry.expandBatch(side, unique, terms, args, remaining, origin);
            if (rows === null) return null;
            for (const [key, fetched] of rows) {
                const list = rowsAnchored(fetched, side, origin);
                buffer.get(key)!.push(...list);
                all.push(...list);
                remaining -= list.length;
            }
        }
        this.ctx.notePeakBuffered(all.length);
        this._buffer = buffer;
        this._bufferSide = side;
        this._bufferOrigin = origin;
        return all;
    }
}

/** In-memory node access over materialized legacy records (used by reversed plans). */
export class MemoryNodeAccess implements NodeAccess {
    public readonly deferred = false;
    constructor(private readonly _records: SourceRow[]) {}
    public async *scan(): AsyncGenerator<SourceRow[]> {
        yield this._records;
    }
    public async lookup(
        id: any,
        _terms?: PushTerm[],
        _args?: Record<string, any> | null,
        origin?: string
    ): Promise<SourceRow[]> {
        return rowsForOrigin(indexRows(this._records, "id").get(canonicalKey(id)) ?? [], origin);
    }
    public async prefetch(): Promise<void> {}
    public canLookup(): boolean {
        return true;
    }
    public pushes(): boolean {
        return false;
    }
    public estimate(): number | undefined {
        return this._records.length;
    }
}

/** In-memory relationship access over materialized legacy records (used by reversed plans). */
export class MemoryRelationshipAccess implements RelationshipAccess {
    public readonly deferred = false;
    constructor(private readonly _records: SourceRow[]) {}
    public async *expand(
        anchor: any,
        side: "left" | "right",
        _terms?: PushTerm[],
        _args?: Record<string, any> | null,
        origin?: string
    ): AsyncGenerator<SourceRow[]> {
        yield rowsAnchored(
            indexRows(this._records, `${side}_id`).get(canonicalKey(anchor)) ?? [],
            side,
            origin
        );
    }
    public async prefetch(): Promise<SourceRow[] | null> {
        return null;
    }
}
