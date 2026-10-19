/**
 * In-memory graph store behind the built-in `memorygraph` function.
 *
 * A schema-free property graph store holding any number of graphs:
 * nodes with any number of labels, relationships with one type, and
 * integer ids unique across the whole store.  It answers the graph
 * request protocol (`graph: true` reads returning
 * `{id, labels, properties}` / `{id, type, left_id, right_id, properties}`
 * rows, and write change sets), selecting the graph by `graphName`
 * (`"default"` when absent).
 *
 * A relationship belongs to one graph but may connect nodes of other
 * graphs of the store, or nodes it does not hold (definition nodes, or
 * nodes of graphs bound to other backends); every endpoint is stored as
 * a `(graph, id)` reference.  Within the store, references are checked:
 * an endpoint in a graph the store holds must exist, a plain delete of a
 * node with relationships in any of its graphs fails, and a detach
 * delete removes them all, atomically with the rest of the change set.
 *
 * A committed store is never mutated: a transaction works on a copy that
 * replaces the store when it commits, so readers keep a consistent
 * snapshot.
 */
import { DEFAULT_GRAPH } from "./graph_records";
import { canonicalKey } from "./source_context";
import { SourceRow, matchesPredicate } from "./source_provider";

/** A node reference: its namespace (graph name, or `"virtual"`) and id. */
interface Ref {
    graph: string;
    id: any;
}

interface StoredNode {
    id: number;
    graph: string;
    labels: string[];
    properties: Record<string, any>;
}

interface StoredRelationship {
    id: number;
    graph: string;
    type: string;
    start: Ref;
    end: Ref;
    properties: Record<string, any>;
}

export interface WriteOutcome {
    ids: Record<string, any>;
    stats: Record<string, number>;
}

function refKey(ref: Ref): string {
    return canonicalKey([ref.graph, ref.id]);
}

function same(a: any, b: any): boolean {
    return canonicalKey(a) === canonicalKey(b);
}

/** Apply `properties` to `target`; `null` removes a key.  Returns the number of keys set. */
function assign(
    target: Record<string, any>,
    properties: Record<string, any> | null | undefined
): number {
    let count = 0;
    for (const [k, v] of Object.entries(properties ?? {})) {
        if (v === null || v === undefined) delete target[k];
        else target[k] = v;
        count++;
    }
    return count;
}

function graphOf(request: Record<string, any>): string {
    return typeof request.graphName === "string" ? request.graphName : DEFAULT_GRAPH;
}

export class MemoryGraphStore {
    private _nodes: Map<number, StoredNode> = new Map();
    private _relationships: Map<number, StoredRelationship> = new Map();
    /** Relationship ids by endpoint reference. */
    private _adjacent: Map<string, Set<number>> = new Map();
    /** Graphs that have held nodes in this store (their references are checked). */
    private _graphs: Set<string> = new Set();
    private _nextId: number = 1;

    public clone(): MemoryGraphStore {
        const copy = new MemoryGraphStore();
        for (const [id, n] of this._nodes) {
            copy._nodes.set(id, { ...n, labels: [...n.labels], properties: { ...n.properties } });
        }
        for (const [id, r] of this._relationships) {
            copy._relationships.set(id, { ...r, properties: { ...r.properties } });
        }
        for (const [key, set] of this._adjacent) copy._adjacent.set(key, new Set(set));
        copy._graphs = new Set(this._graphs);
        copy._nextId = this._nextId;
        return copy;
    }

    /** Number of nodes, in `graph` or in the whole store. */
    public nodeCount(graph?: string): number {
        if (graph === undefined) return this._nodes.size;
        let count = 0;
        for (const n of this._nodes.values()) if (n.graph === graph) count++;
        return count;
    }
    /** Number of relationships, in `graph` or in the whole store. */
    public relationshipCount(graph?: string): number {
        if (graph === undefined) return this._relationships.size;
        let count = 0;
        for (const r of this._relationships.values()) if (r.graph === graph) count++;
        return count;
    }

    /** Answer a `scan`, `lookup` or `expand` request of the graph protocol. */
    public read(request: Record<string, any>): SourceRow[] {
        const graph = graphOf(request);
        const ids: any[] | null = Array.isArray(request.ids) ? request.ids : null;
        if (request.type !== undefined) return this.readRelationships(request, graph, ids);
        const wanted: string[] = Array.isArray(request.labels)
            ? request.labels
            : request.label != null
              ? [request.label]
              : [];
        const candidates =
            ids !== null
                ? ids
                      .map((id) => this._nodes.get(id))
                      .filter((n): n is StoredNode => n !== undefined)
                : [...this._nodes.values()];
        const out: SourceRow[] = [];
        for (const n of candidates) {
            if (n.graph !== graph) continue;
            if (!wanted.every((label) => n.labels.includes(label))) continue;
            if (!matchesPredicate(request.predicate ?? null, n.properties)) {
                continue;
            }
            out.push({ id: n.id, labels: [...n.labels], properties: { ...n.properties } });
        }
        return out;
    }

    private readRelationships(
        request: Record<string, any>,
        graph: string,
        ids: any[] | null
    ): SourceRow[] {
        let candidates: StoredRelationship[];
        if (ids !== null) {
            const side = request.side === "right" ? "end" : "start";
            const anchorGraph =
                typeof request.anchorGraph === "string" ? request.anchorGraph : graph;
            const seen = new Set<number>();
            candidates = [];
            for (const id of ids) {
                const anchor: Ref = { graph: anchorGraph, id };
                for (const rid of this._adjacent.get(refKey(anchor)) ?? []) {
                    const r = this._relationships.get(rid)!;
                    if (refKey(r[side]) === refKey(anchor) && !seen.has(rid)) {
                        seen.add(rid);
                        candidates.push(r);
                    }
                }
            }
        } else {
            candidates = [...this._relationships.values()];
        }
        const out: SourceRow[] = [];
        for (const r of candidates) {
            if (r.graph !== graph) continue;
            if (request.type !== null && r.type !== request.type) continue;
            if (!matchesPredicate(request.predicate ?? null, r.properties)) continue;
            const row: SourceRow = {
                id: r.id,
                type: r.type,
                left_id: r.start.id,
                right_id: r.end.id,
                properties: { ...r.properties },
            };
            if (r.start.graph !== graph) row.left_graph = r.start.graph;
            if (r.end.graph !== graph) row.right_graph = r.end.graph;
            out.push(row);
        }
        return out;
    }

    private link(r: StoredRelationship): void {
        for (const ref of [r.start, r.end]) {
            const key = refKey(ref);
            let set = this._adjacent.get(key);
            if (set === undefined) {
                set = new Set();
                this._adjacent.set(key, set);
            }
            set.add(r.id);
        }
    }
    private unlink(r: StoredRelationship): void {
        this._adjacent.get(refKey(r.start))?.delete(r.id);
        this._adjacent.get(refKey(r.end))?.delete(r.id);
        this._relationships.delete(r.id);
    }

    /**
     * Apply a change set in place.  Callers apply it to a copy so that a
     * failing change leaves the published store untouched.
     */
    public apply(changes: Record<string, any>[]): WriteOutcome {
        const ids: Record<string, any> = {};
        const deleted: Set<string> = new Set();
        const stats: Record<string, number> = {
            nodesCreated: 0,
            nodesDeleted: 0,
            relationshipsCreated: 0,
            relationshipsDeleted: 0,
            propertiesSet: 0,
            labelsAdded: 0,
            labelsRemoved: 0,
        };
        const resolve = (value: any) =>
            typeof value === "string" && value in ids ? ids[value] : value;
        const node = (target: any, graph: string): StoredNode => {
            const n = this._nodes.get(resolve(target));
            if (n === undefined || n.graph !== graph) {
                throw new Error(`Unknown node ${JSON.stringify(target)} in graph ${graph}`);
            }
            return n;
        };
        /** An endpoint reference; endpoints in graphs this store holds must exist. */
        const endpoint = (target: any, graph: string): Ref => {
            const ref: Ref = { graph, id: resolve(target) };
            const n = this._nodes.get(ref.id);
            if (this._graphs.has(graph) && (n === undefined || n.graph !== graph)) {
                throw new Error(`Unknown node ${JSON.stringify(target)} in graph ${graph}`);
            }
            return ref;
        };
        const relationship = (target: any, graph: string): StoredRelationship => {
            const id = resolve(target);
            const r =
                id !== null && typeof id === "object"
                    ? [...this._relationships.values()].find(
                          (x) =>
                              x.graph === graph &&
                              same(x.start.id, id.left_id) &&
                              same(x.end.id, id.right_id)
                      )
                    : this._relationships.get(id);
            if (r === undefined || r.graph !== graph) {
                throw new Error(`Unknown relationship ${JSON.stringify(target)} in graph ${graph}`);
            }
            return r;
        };
        const createNode = (
            ref: string,
            graph: string,
            labels: string[],
            properties: Record<string, any>
        ) => {
            const n: StoredNode = { id: this._nextId++, graph, labels: [], properties: {} };
            for (const label of labels ?? []) if (!n.labels.includes(label)) n.labels.push(label);
            stats.propertiesSet += assign(n.properties, properties);
            this._nodes.set(n.id, n);
            this._graphs.add(graph);
            ids[ref] = n.id;
            stats.nodesCreated++;
        };
        const createRelationship = (
            ref: string,
            graph: string,
            type: string,
            start: Ref,
            end: Ref,
            properties: Record<string, any>
        ) => {
            if (typeof type !== "string") throw new Error("A relationship needs exactly one type");
            const r: StoredRelationship = {
                id: this._nextId++,
                graph,
                type,
                start,
                end,
                properties: {},
            };
            stats.propertiesSet += assign(r.properties, properties);
            this._relationships.set(r.id, r);
            this.link(r);
            ids[ref] = r.id;
            stats.relationshipsCreated++;
        };
        const deletedKey = (kind: string, graph: string, target: any) =>
            `${kind}:${graph}:${canonicalKey(resolve(target))}`;
        for (const change of changes) {
            const graph = graphOf(change);
            const isRelationship = change.type !== undefined && change.label === undefined;
            switch (change.op) {
                case "createNode":
                    createNode(change.ref, graph, change.labels, change.properties);
                    break;
                case "createRelationship":
                    createRelationship(
                        change.ref,
                        graph,
                        change.type,
                        endpoint(change.start, change.startGraph ?? graph),
                        endpoint(change.end, change.endGraph ?? graph),
                        change.properties
                    );
                    break;
                case "mergeNode": {
                    const labels: string[] =
                        change.labels ?? (change.label != null ? [change.label] : []);
                    const existing = [...this._nodes.values()].find(
                        (n) =>
                            n.graph === graph &&
                            labels.every((l) => n.labels.includes(l)) &&
                            Object.entries(change.key ?? {}).every(([k, v]) =>
                                same(n.properties[k], v)
                            )
                    );
                    if (existing !== undefined) {
                        stats.propertiesSet += assign(existing.properties, change.onMatch);
                        ids[change.ref] = existing.id;
                    } else {
                        createNode(change.ref, graph, labels, {
                            ...change.key,
                            ...change.onCreate,
                        });
                    }
                    break;
                }
                case "mergeRelationship": {
                    const start = endpoint(change.start, change.startGraph ?? graph);
                    const end = endpoint(change.end, change.endGraph ?? graph);
                    const existing = [...(this._adjacent.get(refKey(start)) ?? [])]
                        .map((rid) => this._relationships.get(rid)!)
                        .find(
                            (r) =>
                                r.graph === graph &&
                                r.type === change.type &&
                                refKey(r.start) === refKey(start) &&
                                refKey(r.end) === refKey(end) &&
                                Object.entries(change.key ?? {}).every(([k, v]) =>
                                    same(r.properties[k], v)
                                )
                        );
                    if (existing !== undefined) {
                        stats.propertiesSet += assign(existing.properties, change.onMatch);
                        ids[change.ref] = existing.id;
                    } else {
                        createRelationship(change.ref, graph, change.type, start, end, {
                            ...change.key,
                            ...change.onCreate,
                        });
                    }
                    break;
                }
                case "setProperties": {
                    const target = isRelationship
                        ? relationship(change.target, graph)
                        : node(change.target, graph);
                    stats.propertiesSet += assign(target.properties, change.properties);
                    break;
                }
                case "replaceProperties": {
                    const target = isRelationship
                        ? relationship(change.target, graph)
                        : node(change.target, graph);
                    target.properties = {};
                    stats.propertiesSet += assign(target.properties, change.properties);
                    break;
                }
                case "addLabels": {
                    const n = node(change.target, graph);
                    for (const label of change.labels ?? []) {
                        if (!n.labels.includes(label)) {
                            n.labels.push(label);
                            stats.labelsAdded++;
                        }
                    }
                    break;
                }
                case "removeLabels": {
                    const n = node(change.target, graph);
                    for (const label of change.labels ?? []) {
                        const i = n.labels.indexOf(label);
                        if (i >= 0) {
                            n.labels.splice(i, 1);
                            stats.labelsRemoved++;
                        }
                    }
                    break;
                }
                case "deleteRelationship": {
                    if (deleted.has(deletedKey("relationship", graph, change.target))) break;
                    const r = relationship(change.target, graph);
                    this.unlink(r);
                    deleted.add(deletedKey("relationship", graph, r.id));
                    stats.relationshipsDeleted++;
                    break;
                }
                case "deleteNode": {
                    if (deleted.has(deletedKey("node", graph, change.target))) break;
                    const n = node(change.target, graph);
                    const key = refKey({ graph, id: n.id });
                    const attached = [...(this._adjacent.get(key) ?? [])];
                    if (attached.length > 0 && change.detach !== true) {
                        throw new Error(
                            `Cannot delete node ${JSON.stringify(n.id)}: it still has relationships`
                        );
                    }
                    for (const rid of attached) {
                        const r = this._relationships.get(rid);
                        if (r === undefined) continue;
                        this.unlink(r);
                        deleted.add(deletedKey("relationship", r.graph, rid));
                        stats.relationshipsDeleted++;
                    }
                    this._adjacent.delete(key);
                    this._nodes.delete(n.id);
                    deleted.add(deletedKey("node", graph, n.id));
                    stats.nodesDeleted++;
                    break;
                }
                default:
                    throw new Error(`Unsupported change ${JSON.stringify(change.op)}`);
            }
        }
        return { ids, stats };
    }
}

export default MemoryGraphStore;
