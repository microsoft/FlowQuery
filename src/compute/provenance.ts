import Node from "../graph/node";
import NodeReference from "../graph/node_reference";
import Relationship from "../graph/relationship";
import RelationshipReference from "../graph/relationship_reference";
import { getVirtualSource } from "../graph/virtual_sources";

/**
 * One observation that a particular alias was bound to a particular node id
 * while a result row was being projected.  For non-aggregate rows there is
 * exactly one `NodeBinding` per registered node slot; aggregate rows may
 * carry multiple observations under the same alias when distinct ids fed the
 * group.
 *
 * `id` preserves the original scalar type from the underlying record (string,
 * number, etc.).  `id === null` indicates an OPTIONAL MATCH miss.
 */
export interface NodeBinding {
    /** The node identifier from the query (e.g. `a`), or `null` if anonymous. */
    alias: string | null;
    /** The matched label from the query (the first declared label), or `null`. */
    label: string | null;
    /** The concrete `id` value of the matched node, preserving scalar type. */
    id: any;
    /**
     * Shallow snapshot of the matched record's property values (excluding
     * `id` and internal `_label`).  Present whenever the runner was
     * constructed with `{ provenance: true }`.
     */
    properties?: Record<string, any>;
    /**
     * When the matched node came from a virtual
     * `CREATE VIRTUAL (:X) AS { ... }` sub-query, this is the inner
     * runner's `RowProvenance` row that produced the record.  Omitted
     * when the source is not a virtual.
     */
    source?: RowProvenance;
}

/**
 * One traversed edge in a relationship binding.  Variable-length matches
 * (`[:T*m..n]`) contribute multiple hops; single-hop matches contribute one.
 */
export interface RelationshipHop {
    left_id: any;
    right_id: any;
    /** Resolved relationship type (may differ from the declared type when a
     *  virtual relationship spans multiple underlying types). */
    type: string;
    /**
     * Shallow snapshot of the relationship record's property values.
     * Present whenever the runner was constructed with
     * `{ provenance: true }`.
     */
    properties?: Record<string, any>;
    /**
     * When the traversed edge came from a virtual
     * relationship's inner sub-query, this is the inner runner's row
     * provenance for the contributing record.  Omitted otherwise.
     */
    source?: RowProvenance;
}

/**
 * One observation that a particular relationship alias was bound to a
 * concrete path of one or more hops while a result row was being projected.
 */
export interface RelationshipBinding {
    /** The relationship identifier from the query (e.g. `r`), or `null`. */
    alias: string | null;
    /** The declared relationship type from the query, or `null` when omitted. */
    type: string | null;
    /** The traversed edges in path order. */
    hops: RelationshipHop[];
    /**
     * The ordered chain of node ids visited along the relationship match:
     * `[hops[0].left_id, ...hops.map(h => h.right_id)]`.  Always present.
     * Empty for OPTIONAL-MATCH misses and zero-hop variable-length matches.
     */
    path: any[];
}

/**
 * One flat slice of bindings — either a single non-aggregate row's
 * contribution, or one input row's contribution to an aggregate group.
 * Sources (`ProvenanceSource.snapshot`) and the entries in
 * `RowProvenance.rows` are all `RowSegment`s.
 */
export interface RowSegment {
    nodes: NodeBinding[];
    relationships: RelationshipBinding[];
}

/**
 * Row-level lineage aligned by index with `Runner.results`.  Extends a
 * single segment (the union of contributing bindings) with `rows`, the
 * ordered per-input-row segments.  For non-aggregate rows `rows.length`
 * is 1; for aggregates it equals the number of input rows that fed the
 * group, so `result.collectField[k]` aligns positionally with
 * `provenance.rows[k]`.
 */
export interface RowProvenance extends RowSegment {
    rows: RowSegment[];
}

/**
 * Anything that can produce a `RowSegment` for the row currently being
 * emitted.  Two implementations exist today:
 *
 *  - {@link ProvenanceSites} — snapshots the live bindings of a MATCH's
 *    `Node` / `Relationship` slots at the moment of the emit.
 *  - `AggregatedWith` (in `aggregated_with.ts`) — replays the pre-computed
 *    segment of the group it is currently flushing downstream.
 *
 * The terminal `Return` (and intermediate `AggregatedWith` /
 * `AggregatedReturn` operations) iterate their registered sources per row
 * and concatenate the segments into a single `RowSegment`.
 */
export interface ProvenanceSource {
    snapshot(): RowSegment;
}

/**
 * Concatenate one segment into a destination segment.  Lives here so the
 * merge order stays consistent across consumers (`Return`, `GroupBy`,
 * `AggregatedWith`).
 */
export function mergeProvenanceSegment(into: RowSegment, segment: RowSegment): void {
    for (const n of segment.nodes) into.nodes.push(n);
    for (const r of segment.relationships) into.relationships.push(r);
}

/**
 * Holds the set of `Node` and `Relationship` slots discovered in a query's
 * MATCH operations.  These are stable references; their live state is read
 * synchronously on each `snapshot()` call to capture the bindings active at
 * that moment.
 *
 * The collector is opt-in via the `provenance` Runner option and zero-cost
 * when disabled.
 */
export class ProvenanceSites {
    public readonly nodes: Node[] = [];
    public readonly relationships: Relationship[] = [];
    private readonly _seenNodeIdentifiers: Set<string> = new Set();
    private readonly _seenRelationshipIdentifiers: Set<string> = new Set();
    private _captureProperties: boolean = false;

    /**
     * Enable property-level capture for snapshots produced by this collector.
     * Set by the Runner when constructed with `{ provenance: true }`.
     */
    public set captureProperties(value: boolean) {
        this._captureProperties = value;
    }

    /**
     * Register a node slot.  `NodeReference`s (re-bindings of a previously
     * matched identifier) and duplicate named identifiers are skipped so the
     * same alias does not produce multiple bindings.
     */
    public addNode(node: Node): void {
        if (node instanceof NodeReference) return;
        const id = node.identifier;
        if (id !== null) {
            if (this._seenNodeIdentifiers.has(id)) return;
            this._seenNodeIdentifiers.add(id);
        }
        this.nodes.push(node);
    }

    /**
     * Register a relationship slot.  `RelationshipReference`s and duplicate
     * named identifiers are skipped.  Anonymous relationships are always
     * added since each represents an independent traversal slot.
     */
    public addRelationship(rel: Relationship): void {
        if (rel instanceof RelationshipReference) return;
        const id = rel.identifier;
        if (id !== null) {
            if (this._seenRelationshipIdentifiers.has(id)) return;
            this._seenRelationshipIdentifiers.add(id);
        }
        this.relationships.push(rel);
    }

    public get isEmpty(): boolean {
        return this.nodes.length === 0 && this.relationships.length === 0;
    }

    /**
     * Capture the currently-bound id / hop values for every registered slot.
     * Returns `null` for ids of slots that are not currently matched (e.g.
     * OPTIONAL MATCH misses).
     */
    public snapshot(): RowSegment {
        const captureProps = this._captureProperties;
        const nodes: NodeBinding[] = new Array(this.nodes.length);
        for (let i = 0; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            const v = node.value();
            const binding: NodeBinding = {
                alias: node.identifier,
                label: node.label,
                id: v === null || v === undefined ? null : (v.id ?? null),
            };
            if (captureProps && v !== null && v !== undefined) {
                binding.properties = extractNodeProperties(v);
            }
            const src = v == null ? undefined : (getVirtualSource(v) as RowProvenance | undefined);
            if (src !== undefined) binding.source = src;
            nodes[i] = binding;
        }
        const relationships: RelationshipBinding[] = new Array(this.relationships.length);
        for (let i = 0; i < this.relationships.length; i++) {
            const rel = this.relationships[i];
            const matches = rel.matches;
            const hops: RelationshipHop[] = new Array(matches.length);
            for (let j = 0; j < matches.length; j++) {
                const m = matches[j];
                const hop: RelationshipHop = {
                    left_id: m.startNode == null ? null : (m.startNode.id ?? null),
                    right_id: m.endNode == null ? null : (m.endNode.id ?? null),
                    type: m.type,
                };
                if (captureProps) {
                    hop.properties = extractRelationshipProperties(m);
                }
                const src = getVirtualSource(m) as RowProvenance | undefined;
                if (src !== undefined) hop.source = src;
                hops[j] = hop;
            }
            const path: any[] = hops.length === 0 ? [] : new Array(hops.length + 1);
            if (hops.length > 0) {
                path[0] = hops[0].left_id;
                for (let k = 0; k < hops.length; k++) {
                    path[k + 1] = hops[k].right_id;
                }
            }
            relationships[i] = {
                alias: rel.identifier,
                type: rel.type,
                hops,
                path,
            };
        }
        return { nodes, relationships };
    }
}

/**
 * Shallow-copy a node record's user-visible property values, stripping
 * `id` and the internal `_label` injected by `DataResolver`.
 */
function extractNodeProperties(record: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {};
    for (const key of Object.keys(record)) {
        if (key === "id" || key === "_label") continue;
        out[key] = record[key];
    }
    return out;
}

/**
 * Shallow-copy a relationship match record's property values, stripping
 * the structural fields (`type`, `startNode`, `endNode`, `properties`,
 * `left_id`, `right_id`, `_type`) so what remains are the user-declared
 * edge properties.
 */
function extractRelationshipProperties(match: Record<string, any>): Record<string, any> {
    // The match's nested `properties` field already holds the user-declared
    // edge properties (set in `RelationshipMatchCollector.push`).  Prefer
    // that source when present; otherwise filter the structural fields.
    if (match.properties && typeof match.properties === "object") {
        return { ...match.properties };
    }
    const out: Record<string, any> = {};
    for (const key of Object.keys(match)) {
        if (
            key === "type" ||
            key === "startNode" ||
            key === "endNode" ||
            key === "properties" ||
            key === "left_id" ||
            key === "right_id" ||
            key === "_type"
        ) {
            continue;
        }
        out[key] = match[key];
    }
    return out;
}

/**
 * Stable canonical key for deduplicating a `NodeBinding` within an aggregate
 * group.  Uses `JSON.stringify` to preserve scalar type distinctions
 * (`1` vs `"1"`).
 */
export function nodeBindingKey(b: NodeBinding): string {
    return `${b.alias ?? ""}\x00${JSON.stringify(b.id)}`;
}

/**
 * Stable canonical key for deduplicating a `RelationshipBinding` within an
 * aggregate group.  Includes every hop so variable-length paths with the
 * same alias but different traversals are treated as distinct.
 */
export function relationshipBindingKey(b: RelationshipBinding): string {
    let s = `${b.alias ?? ""}\x00`;
    for (let i = 0; i < b.hops.length; i++) {
        const h = b.hops[i];
        s += `${JSON.stringify(h.left_id)}|${JSON.stringify(h.right_id)}|${h.type};`;
    }
    return s;
}
