/**
 * In-memory graph store behind the built-in `memorygraph` function.
 *
 * A schema-free property graph: nodes with any number of labels,
 * relationships with one type, graph-wide integer ids.  It answers the
 * default-graph request protocol (`graph: true` reads returning
 * `{id, labels, properties}` / `{id, type, left_id, right_id, properties}`
 * rows, and write change sets).
 *
 * A committed store is never mutated: a transaction works on a copy that
 * replaces the store when it commits, so readers keep a consistent
 * snapshot.
 */
import { canonicalKey } from "./source_context";
import { SourceRow, matchesPredicate } from "./source_provider";

interface StoredNode {
    id: number;
    labels: string[];
    properties: Record<string, any>;
}

interface StoredRelationship {
    id: number;
    type: string;
    start: number;
    end: number;
    properties: Record<string, any>;
}

export interface WriteOutcome {
    ids: Record<string, any>;
    stats: Record<string, number>;
}

function copyNode(n: StoredNode): StoredNode {
    return { id: n.id, labels: [...n.labels], properties: { ...n.properties } };
}

function copyRelationship(r: StoredRelationship): StoredRelationship {
    return { ...r, properties: { ...r.properties } };
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

export class MemoryGraphStore {
    private _nodes: Map<number, StoredNode> = new Map();
    private _relationships: Map<number, StoredRelationship> = new Map();
    /** Relationship ids by endpoint node id. */
    private _adjacent: Map<number, Set<number>> = new Map();
    private _nextId: number = 1;

    public clone(): MemoryGraphStore {
        const copy = new MemoryGraphStore();
        for (const [id, n] of this._nodes) copy._nodes.set(id, copyNode(n));
        for (const [id, r] of this._relationships) copy._relationships.set(id, copyRelationship(r));
        for (const [id, set] of this._adjacent) copy._adjacent.set(id, new Set(set));
        copy._nextId = this._nextId;
        return copy;
    }

    public get nodeCount(): number {
        return this._nodes.size;
    }
    public get relationshipCount(): number {
        return this._relationships.size;
    }

    /** Answer a `scan`, `lookup` or `expand` request of the default-graph protocol. */
    public read(request: Record<string, any>): SourceRow[] {
        const ids: any[] | null = Array.isArray(request.ids) ? request.ids : null;
        if (request.type !== undefined) return this.readRelationships(request, ids);
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
            if (!wanted.every((label) => n.labels.includes(label))) continue;
            if (!matchesPredicate(request.predicate ?? null, { ...n.properties, id: n.id }))
                continue;
            out.push({ id: n.id, labels: [...n.labels], properties: { ...n.properties } });
        }
        return out;
    }

    private readRelationships(request: Record<string, any>, ids: any[] | null): SourceRow[] {
        let candidates: StoredRelationship[];
        if (ids !== null) {
            const field = request.side === "right" ? "end" : "start";
            const seen = new Set<number>();
            candidates = [];
            for (const id of ids) {
                for (const rid of this._adjacent.get(id) ?? []) {
                    const r = this._relationships.get(rid)!;
                    if (r[field] === id && !seen.has(rid)) {
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
            if (request.type !== null && r.type !== request.type) continue;
            const flat = { ...r.properties, id: r.id, left_id: r.start, right_id: r.end };
            if (!matchesPredicate(request.predicate ?? null, flat)) continue;
            out.push({
                id: r.id,
                type: r.type,
                left_id: r.start,
                right_id: r.end,
                properties: { ...r.properties },
            });
        }
        return out;
    }

    private link(r: StoredRelationship): void {
        for (const id of [r.start, r.end]) {
            let set = this._adjacent.get(id);
            if (set === undefined) {
                set = new Set();
                this._adjacent.set(id, set);
            }
            set.add(r.id);
        }
    }
    private unlink(r: StoredRelationship): void {
        this._adjacent.get(r.start)?.delete(r.id);
        this._adjacent.get(r.end)?.delete(r.id);
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
        const node = (target: any): StoredNode => {
            const n = this._nodes.get(resolve(target));
            if (n === undefined) throw new Error(`Unknown node ${JSON.stringify(target)}`);
            return n;
        };
        const relationship = (target: any): StoredRelationship => {
            const id = resolve(target);
            const r =
                id !== null && typeof id === "object"
                    ? [...this._relationships.values()].find(
                          (x) => same(x.start, id.left_id) && same(x.end, id.right_id)
                      )
                    : this._relationships.get(id);
            if (r === undefined) throw new Error(`Unknown relationship ${JSON.stringify(target)}`);
            return r;
        };
        const createNode = (ref: string, labels: string[], properties: Record<string, any>) => {
            const n: StoredNode = { id: this._nextId++, labels: [], properties: {} };
            for (const label of labels ?? []) if (!n.labels.includes(label)) n.labels.push(label);
            stats.propertiesSet += assign(n.properties, properties);
            this._nodes.set(n.id, n);
            ids[ref] = n.id;
            stats.nodesCreated++;
        };
        const createRelationship = (
            ref: string,
            type: string,
            start: number,
            end: number,
            properties: Record<string, any>
        ) => {
            if (typeof type !== "string") throw new Error("A relationship needs exactly one type");
            const r: StoredRelationship = { id: this._nextId++, type, start, end, properties: {} };
            stats.propertiesSet += assign(r.properties, properties);
            this._relationships.set(r.id, r);
            this.link(r);
            ids[ref] = r.id;
            stats.relationshipsCreated++;
        };
        const isDeleted = (kind: string, target: any) =>
            deleted.has(`${kind}:${canonicalKey(resolve(target))}`);
        for (const change of changes) {
            const isRelationship = change.type !== undefined && change.label === undefined;
            switch (change.op) {
                case "createNode":
                    createNode(change.ref, change.labels, change.properties);
                    break;
                case "createRelationship":
                    createRelationship(
                        change.ref,
                        change.type,
                        node(change.start).id,
                        node(change.end).id,
                        change.properties
                    );
                    break;
                case "mergeNode": {
                    const labels: string[] =
                        change.labels ?? (change.label != null ? [change.label] : []);
                    const existing = [...this._nodes.values()].find(
                        (n) =>
                            labels.every((l) => n.labels.includes(l)) &&
                            Object.entries(change.key ?? {}).every(([k, v]) =>
                                same(n.properties[k], v)
                            )
                    );
                    if (existing !== undefined) {
                        stats.propertiesSet += assign(existing.properties, change.onMatch);
                        ids[change.ref] = existing.id;
                    } else {
                        createNode(change.ref, labels, { ...change.key, ...change.onCreate });
                    }
                    break;
                }
                case "mergeRelationship": {
                    const start = node(change.start).id;
                    const end = node(change.end).id;
                    const existing = [...(this._adjacent.get(start) ?? [])]
                        .map((rid) => this._relationships.get(rid)!)
                        .find(
                            (r) =>
                                r.type === change.type &&
                                r.start === start &&
                                r.end === end &&
                                Object.entries(change.key ?? {}).every(([k, v]) =>
                                    same(r.properties[k], v)
                                )
                        );
                    if (existing !== undefined) {
                        stats.propertiesSet += assign(existing.properties, change.onMatch);
                        ids[change.ref] = existing.id;
                    } else {
                        createRelationship(change.ref, change.type, start, end, {
                            ...change.key,
                            ...change.onCreate,
                        });
                    }
                    break;
                }
                case "setProperties": {
                    const target = isRelationship
                        ? relationship(change.target)
                        : node(change.target);
                    stats.propertiesSet += assign(target.properties, change.properties);
                    break;
                }
                case "replaceProperties": {
                    const target = isRelationship
                        ? relationship(change.target)
                        : node(change.target);
                    target.properties = {};
                    stats.propertiesSet += assign(target.properties, change.properties);
                    break;
                }
                case "addLabels": {
                    const n = node(change.target);
                    for (const label of change.labels ?? []) {
                        if (!n.labels.includes(label)) {
                            n.labels.push(label);
                            stats.labelsAdded++;
                        }
                    }
                    break;
                }
                case "removeLabels": {
                    const n = node(change.target);
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
                    if (isDeleted("relationship", change.target)) break;
                    const r = relationship(change.target);
                    this.unlink(r);
                    deleted.add(`relationship:${canonicalKey(r.id)}`);
                    stats.relationshipsDeleted++;
                    break;
                }
                case "deleteNode": {
                    if (isDeleted("node", change.target)) break;
                    const n = node(change.target);
                    const attached = [...(this._adjacent.get(n.id) ?? [])];
                    if (attached.length > 0 && change.detach !== true) {
                        throw new Error(
                            `Cannot delete node ${JSON.stringify(n.id)}: it still has relationships`
                        );
                    }
                    for (const rid of attached) {
                        const r = this._relationships.get(rid);
                        if (r === undefined) continue;
                        this.unlink(r);
                        deleted.add(`relationship:${canonicalKey(rid)}`);
                        stats.relationshipsDeleted++;
                    }
                    this._adjacent.delete(n.id);
                    this._nodes.delete(n.id);
                    deleted.add(`node:${canonicalKey(n.id)}`);
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
