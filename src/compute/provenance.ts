import Node from "../graph/node";
import NodeReference from "../graph/node_reference";
import Relationship from "../graph/relationship";
import RelationshipReference from "../graph/relationship_reference";

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
}

/**
 * Row-level lineage: the concrete node ids and relationship hops that
 * contributed to a single row of `Runner.results`.  Aligned by index with
 * `Runner.results` when provenance is enabled.
 */
export interface RowProvenance {
    nodes: NodeBinding[];
    relationships: RelationshipBinding[];
}

/**
 * Anything that can produce a `RowProvenance` segment for the row currently
 * being emitted.  Two implementations exist today:
 *
 *  - {@link ProvenanceSites} — snapshots the live bindings of a MATCH's
 *    `Node` / `Relationship` slots at the moment of the emit.
 *  - `AggregatedWith` (in `aggregated_with.ts`) — replays the pre-computed
 *    provenance of the group it is currently flushing downstream.
 *
 * The terminal `Return` (and intermediate `AggregatedWith` /
 * `AggregatedReturn` operations) iterate their registered sources per row
 * and concatenate the segments into a single `RowProvenance`.
 */
export interface ProvenanceSource {
    snapshot(): RowProvenance;
}

/**
 * Concatenate one segment into a destination row.  Lives here so the
 * merge order and dedup behaviour stay consistent across consumers
 * (`Return`, `GroupBy`, `AggregatedWith`).
 */
export function mergeProvenanceSegment(into: RowProvenance, segment: RowProvenance): void {
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
    public snapshot(): RowProvenance {
        const nodes: NodeBinding[] = new Array(this.nodes.length);
        for (let i = 0; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            const v = node.value();
            nodes[i] = {
                alias: node.identifier,
                label: node.label,
                id: v === null || v === undefined ? null : (v.id ?? null),
            };
        }
        const relationships: RelationshipBinding[] = new Array(this.relationships.length);
        for (let i = 0; i < this.relationships.length; i++) {
            const rel = this.relationships[i];
            const matches = rel.matches;
            const hops: RelationshipHop[] = new Array(matches.length);
            for (let j = 0; j < matches.length; j++) {
                const m = matches[j];
                hops[j] = {
                    left_id: m.startNode == null ? null : (m.startNode.id ?? null),
                    right_id: m.endNode == null ? null : (m.endNode.id ?? null),
                    type: m.type,
                };
            }
            relationships[i] = {
                alias: rel.identifier,
                type: rel.type,
                hops,
            };
        }
        return { nodes, relationships };
    }
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
