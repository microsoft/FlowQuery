import ASTNode from "../parsing/ast_node";
import Expression from "../parsing/expressions/expression";
import {
    commonNamespace,
    endpointMatches,
    endpointNamespace,
    hasProperty,
    isGraphRecord,
    namespaceOf,
    propertyOf,
} from "./graph_records";
import Hops from "./hops";
import Node from "./node";
import RelationshipData, { RelationshipRecord } from "./relationship_data";
import RelationshipMatchCollector, {
    RelationshipMatchRecord,
} from "./relationship_match_collector";
import { RelationshipAccess, SourceTerms, buildTerms } from "./source_access";
import { canonicalKey } from "./source_context";

/**
 * Relationship uniqueness scope (openCypher "relationship isomorphism"):
 * within one MATCH clause, including comma-separated patterns and
 * variable-length hops, each relationship is bound at most once.
 * Relationships are identified by type plus their `id` column when the
 * definition returns one (plus the graph for graph relationships, whose
 * ids are scoped to their graph), otherwise by type plus the whole row.
 */
export class RelationshipScope {
    private _members: Relationship[] = [];
    private _used: Set<string> = new Set();
    private _enforced: boolean | null = null;

    public register(relationship: Relationship): void {
        if (!this._members.includes(relationship)) this._members.push(relationship);
        this._enforced = null;
    }
    /** Uniqueness only matters when a binding can reuse a relationship. */
    public get enforced(): boolean {
        if (this._enforced === null) {
            this._enforced =
                this._members.length > 1 || this._members.some((r) => r.hops?.multi() === true);
        }
        return this._enforced;
    }
    public claim(key: string): boolean {
        if (this._used.has(key)) return false;
        this._used.add(key);
        return true;
    }
    public release(key: string): void {
        this._used.delete(key);
    }
}

/** Claim result for relationships that need no uniqueness tracking. */
const UNTRACKED = "";

/** Uniqueness keys of relationship rows (rows are reused across traversal steps). */
const keyCache: WeakMap<object, string> = new WeakMap();

class Relationship extends ASTNode {
    protected _identifier: string | null = null;
    protected _types: string[] = [];
    /** Graph named by a qualified type, `[:hr.KNOWS]`; `null` when unqualified. */
    protected _graph: string | null = null;
    protected _properties: Map<string, Expression> = new Map();
    protected _hops: Hops = new Hops();

    protected _value: RelationshipMatchRecord | RelationshipMatchRecord[] | null = null;
    protected _matches: RelationshipMatchCollector = new RelationshipMatchCollector();

    protected _source: Node | null = null;
    protected _target: Node | null = null;
    protected _direction: "left" | "right" = "right";

    private _data: RelationshipData | null = null;
    private _access: RelationshipAccess | null = null;
    private _frames: Map<number, RelationshipRecord> = new Map();
    private _scope: RelationshipScope | null = null;

    constructor(identifier: string | null = null, type: string | null = null) {
        super();
        this._identifier = identifier;
        if (type !== null) {
            this._types = [type];
        }
    }
    /** @internal The uniqueness scope (the enclosing MATCH or pattern). */
    public set scope(scope: RelationshipScope) {
        this._scope = scope;
        scope.register(this);
    }
    public get scope(): RelationshipScope {
        if (this._scope === null) this.scope = new RelationshipScope();
        return this._scope!;
    }
    /** Identity of a bound row for uniqueness checks. */
    public uniquenessKey(record: RelationshipRecord): string {
        const cached =
            record !== null && typeof record === "object" ? keyCache.get(record) : undefined;
        if (cached !== undefined) return cached;
        const type = record?._type ?? this.type ?? "";
        let key: string;
        if (record?.id !== undefined && record.id !== null) {
            // Ids are scoped to their namespace: graphs on other backends reuse them.
            const ns = isGraphRecord(record) ? `${namespaceOf(record)}\u0000` : "";
            key = `${ns}${type}\u0000#${canonicalKey(record.id)}`;
        } else {
            const { _type, ...row } = record ?? {};
            key = `${type}\u0000${canonicalKey(row)}`;
        }
        if (record !== null && typeof record === "object") keyCache.set(record, key);
        return key;
    }
    /**
     * @internal Claim `record` for the current binding.  Returns the key
     * to release on backtrack, or `null` when the relationship is already
     * bound elsewhere in the same MATCH.
     */
    public claim(record: RelationshipRecord): string | null {
        const scope = this.scope;
        if (!scope.enforced) return UNTRACKED;
        const key = this.uniquenessKey(record);
        return scope.claim(key) ? key : null;
    }
    /** @internal Release a key returned by {@link claim}. */
    public release(key: string): void {
        if (key !== UNTRACKED) this.scope.release(key);
    }
    public set identifier(identifier: string) {
        this._identifier = identifier;
    }
    public get identifier(): string | null {
        return this._identifier;
    }
    public set type(type: string) {
        this._types = [type];
    }
    public get type(): string | null {
        return this._types.length > 0 ? this._types[0] : null;
    }
    public set types(types: string[]) {
        this._types = types;
    }
    public get types(): string[] {
        return this._types;
    }
    public get graph(): string | null {
        return this._graph;
    }
    public set graph(value: string | null) {
        this._graph = value;
    }
    public get properties(): Map<string, Expression> {
        return this._properties;
    }
    public set properties(properties: Map<string, Expression>) {
        this._properties = properties;
    }
    private _matchesProperties(hop: number = 0): boolean {
        const data: RelationshipData = this._data!;
        for (const [key, expression] of this._properties) {
            const record: RelationshipRecord = data.current(hop)!;
            if (record === null) {
                throw new Error("No current relationship data available");
            }
            if (!hasProperty(record, key)) {
                // Graph relationships have no fixed columns.
                if (isGraphRecord(record)) return false;
                throw new Error("Relationship does not have property");
            }
            if (propertyOf(record, key) !== expression.value()) {
                return false;
            }
        }
        return true;
    }
    public setProperty(key: string, value: Expression): void {
        this._properties.set(key, value);
    }
    public getProperty(key: string): Expression | null {
        return this._properties.get(key) || null;
    }
    public set hops(hops: Hops) {
        this._hops = hops;
    }
    public get hops(): Hops | null {
        return this._hops;
    }
    public setValue(relationship: Relationship, traversalId: string = ""): void {
        const match: RelationshipMatchRecord = this._matches.push(relationship, traversalId);
        this._value = this._matches.value();
    }
    public set source(node: Node | null) {
        this._source = node;
    }
    public get source(): Node | null {
        return this._source;
    }
    public set target(node: Node | null) {
        this._target = node;
    }
    public get target(): Node | null {
        return this._target;
    }
    public set direction(direction: "left" | "right") {
        this._direction = direction;
    }
    public get direction(): "left" | "right" {
        return this._direction;
    }
    public value(): RelationshipMatchRecord | RelationshipMatchRecord[] | null {
        return this._value;
    }
    /** @internal Rebind the variable's value (write clauses). */
    public overrideValue(value: RelationshipMatchRecord | null): void {
        this._value = value;
    }
    /**
     * @internal Row of a relationship created or merged by a write clause
     * in the current row (`{id: "$n", left_id, right_id, ...}`), if any.
     */
    public createdRecord: RelationshipRecord | null = null;
    public get matches(): RelationshipMatchRecord[] {
        return this._matches.matches;
    }
    public setData(data: RelationshipData | null): void {
        this._data = data;
    }
    public getData(): RelationshipData | null {
        return this._data;
    }
    /** @internal Provider-backed access; when set, rows are fetched on demand. */
    public setAccess(access: RelationshipAccess | null): void {
        this._access = access;
        this._frames.clear();
    }
    public get access(): RelationshipAccess | null {
        return this._access;
    }
    public sourceTerms(): SourceTerms {
        return buildTerms(this._properties, []);
    }
    /** Stored endpoint matched against the traversal's current node id. */
    public get anchorSide(): "left" | "right" {
        return this._direction === "left" ? "right" : "left";
    }
    /** Stored endpoint of the next node in traversal order. */
    public get nextSide(): "left" | "right" {
        return this._direction === "left" ? "left" : "right";
    }
    /** Stored endpoint holding the id of the next node in traversal order. */
    public get nextField(): "left_id" | "right_id" {
        return this._direction === "left" ? "left_id" : "right_id";
    }
    /** The relationship row bound at `hop` (deferred frames or legacy data cursor). */
    public currentRecord(hop: number = 0): RelationshipRecord | null {
        const frame = this._frames.get(hop) as RelationshipRecord | undefined;
        if (frame !== undefined || this._access !== null) {
            return frame ?? null;
        }
        return this._data?.current(hop) ?? null;
    }
    /** @internal Bind a row for `hop` (used by reversed plans). */
    public setFrame(hop: number, record: RelationshipRecord): void {
        this._frames.set(hop, record);
    }
    /** @internal Unbind the row for `hop` (end of a reversed match). */
    public clearFrame(hop: number): void {
        this._frames.delete(hop);
    }
    /** @internal Push a match for an explicitly supplied row. */
    public pushMatch(record: RelationshipRecord, traversalId: string): void {
        this._matches.push(this, traversalId, record);
        this._value = this._matches.value();
    }
    /** @internal Pop the most recent match. */
    public popMatch(): void {
        this._matches.pop();
        this._value = this._matches.value();
    }
    public setEndNode(node: Node): void {
        this._matches.endNode = node;
    }
    public _left_id_or_right_id(): string {
        return this._direction === "left" ? "left_id" : "right_id";
    }
    /**
     * Traverse the relationships anchored at node `left_id`.  `origin`
     * is the graph provenance of that node: relationships of the other
     * graph never join it (see {@link NodeAccess}).
     */
    public async *find(left_id: string, hop: number = 0, origin?: string): AsyncGenerator<void> {
        if (this._access !== null) {
            yield* this._deferredFind(left_id, hop, origin);
            return;
        }
        // Save original source node
        const original = this._source;
        if (hop > 0) {
            // For hops greater than 0, the source becomes the target of the previous hop
            this._source = this._target;
        }
        try {
            if (hop === 0) {
                this._data?.reset();

                // Handle zero-hop case: when min is 0 on a variable-length relationship,
                // match source node as target (no traversal)
                if (this.hops?.multi() && this.hops.min === 0 && this._target) {
                    // For zero-hop, target finds the same node as source (left_id)
                    // No relationship match is pushed since no edge is traversed
                    yield* this._target.find(left_id, hop, origin);
                }
            }
            while (this._data!.find(left_id, hop, this._direction)) {
                const data: RelationshipRecord = this._data?.current(hop) as RelationshipRecord;
                if (!endpointMatches(data, this.anchorSide, origin)) continue;
                const next = endpointNamespace(data, this.nextSide);
                const id = data[this._left_id_or_right_id()];
                if (hop + 1 >= this.hops!.min) {
                    this.setValue(this, left_id);
                    if (!this._matchesProperties(hop)) {
                        continue;
                    }
                    const claimed = this.claim(data);
                    if (claimed === null) {
                        this._matches.pop();
                        continue;
                    }
                    try {
                        yield* this._target!.find(id, hop, next);
                        if (hop + 1 < this.hops!.max && !this._matches.isCircular(id)) {
                            yield* this.find(id, hop + 1, next);
                        }
                    } finally {
                        this.release(claimed);
                    }
                    this._matches.pop();
                } else {
                    // Below minimum hops: traverse the edge without yielding a match
                    const claimed = this.claim(data);
                    if (claimed === null) {
                        continue;
                    }
                    try {
                        yield* this.find(id, hop + 1, next);
                    } finally {
                        this.release(claimed);
                    }
                }
            }
        } finally {
            // Restore original source node
            this._source = original;
        }
    }
    private async *_deferredFind(
        left_id: string,
        hop: number,
        origin: string | undefined
    ): AsyncGenerator<void> {
        const original = this._source;
        if (hop > 0) {
            this._source = this._target;
        }
        try {
            if (hop === 0 && this.hops?.multi() && this.hops.min === 0 && this._target) {
                yield* this._target.find(left_id, hop, origin);
            }
            const { terms: allTerms, args } = this.sourceTerms();
            // Hops below the minimum are traversed without a property check,
            // so their edges must not be filtered by the source either.
            const terms = hop + 1 >= this.hops!.min ? allTerms : [];
            const target = this._target;
            for await (const page of this._access!.expand(
                left_id,
                this.anchorSide,
                terms,
                args,
                origin
            )) {
                if (
                    target !== null &&
                    target.access !== null &&
                    target.access.deferred &&
                    page.length > 1
                ) {
                    const targetTerms = target.sourceTerms();
                    await target.access.prefetch(
                        page.map((row) => row[this.nextField]),
                        targetTerms.terms,
                        targetTerms.args,
                        commonNamespace(page, (row) => endpointNamespace(row, this.nextSide))
                    );
                }
                for (const row of page) {
                    yield* this._visit(row as RelationshipRecord, left_id, hop);
                }
            }
        } finally {
            this._source = original;
        }
    }
    private async *_visit(
        record: RelationshipRecord,
        left_id: string,
        hop: number
    ): AsyncGenerator<void> {
        this._frames.set(hop, record);
        const id = record[this.nextField];
        const next = endpointNamespace(record, this.nextSide);
        if (hop + 1 >= this.hops!.min) {
            if (!this.matchesRecord(record)) {
                return;
            }
            const claimed = this.claim(record);
            if (claimed === null) {
                return;
            }
            this.pushMatch(record, left_id);
            try {
                yield* this._target!.find(id, hop, next);
                if (hop + 1 < this.hops!.max && !this._matches.isCircular(id)) {
                    yield* this.find(id, hop + 1, next);
                }
            } finally {
                this._matches.pop();
                this.release(claimed);
            }
        } else {
            const claimed = this.claim(record);
            if (claimed === null) {
                return;
            }
            try {
                yield* this.find(id, hop + 1, next);
            } finally {
                this.release(claimed);
            }
        }
    }
    public matchesRecord(record: RelationshipRecord): boolean {
        for (const [key, expression] of this._properties) {
            if (!hasProperty(record, key)) {
                if (isGraphRecord(record)) return false;
                throw new Error("Relationship does not have property");
            }
            if (propertyOf(record, key) !== expression.value()) {
                return false;
            }
        }
        return true;
    }
}

export default Relationship;
