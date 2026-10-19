/**
 * `mockbackend($request)`: a small mock async function for tests of
 * statement-backed definitions.  It serves scan / lookup / expand
 * requests from in-memory sources over a tiny graph store, records every
 * request with its query context (signal, snapshot), and applies write
 * change sets atomically so tests can read the result back.
 *
 * Like FlowQuery, the store scopes node ids to their label: each label
 * has its own table.  A node with several labels is one stored object
 * listed in several tables.  Relationships have ids and are exposed per
 * type as `{id, left_id, right_id, ...properties}` rows.
 */
import { SourceRow } from "../../src/graph/source_provider";
import { inMemoryNodeSource, inMemoryRelationshipSource } from "../../src/graph/testing";
import AsyncFunction from "../../src/parsing/functions/async_function";
import { FunctionDef } from "../../src/parsing/functions/function_metadata";

export interface StoredNode {
    id: any;
    labels: Set<string>;
    properties: Record<string, any>;
}
export interface StoredRelationship {
    id: any;
    type: string;
    start: any;
    end: any;
    properties: Record<string, any>;
}

const key = (id: any) => JSON.stringify(id);

class Store {
    public labels: Map<string, Map<string, StoredNode>> = new Map();
    public relationships: Map<string, StoredRelationship> = new Map();
    public nextId = 1000;

    public table(label: string): Map<string, StoredNode> {
        let table = this.labels.get(label);
        if (table === undefined) {
            table = new Map();
            this.labels.set(label, table);
        }
        return table;
    }
    public place(node: StoredNode, label: string): void {
        node.labels.add(label);
        this.table(label).set(key(node.id), node);
    }
    /** Find a node by id, within `label` when given. */
    public find(id: any, label?: string | null): StoredNode | undefined {
        if (label !== undefined && label !== null) return this.labels.get(label)?.get(key(id));
        for (const table of this.labels.values()) {
            const node = table.get(key(id));
            if (node !== undefined) return node;
        }
        return undefined;
    }
    public remove(node: StoredNode): void {
        for (const label of node.labels) this.labels.get(label)?.delete(key(node.id));
    }
    public clone(): Store {
        const copy = new Store();
        const copies = new Map<StoredNode, StoredNode>();
        for (const [label, table] of this.labels) {
            const target = copy.table(label);
            for (const [k, n] of table) {
                let c = copies.get(n);
                if (c === undefined) {
                    c = { id: n.id, labels: new Set(n.labels), properties: { ...n.properties } };
                    copies.set(n, c);
                }
                target.set(k, c);
            }
        }
        for (const [k, r] of this.relationships) {
            copy.relationships.set(k, { ...r, properties: { ...r.properties } });
        }
        copy.nextId = this.nextId;
        return copy;
    }
}

export interface MockLogEntry {
    request: any;
    signal: AbortSignal | null;
    snapshot: unknown;
}

export const mock = {
    store: new Store(),
    log: [] as MockLogEntry[],
    changeSets: [] as any[][],
    yielded: 0,
    opened: 0,
    closed: 0,
    failOn: null as string | null,
    /** Requests of the current log. */
    get requests(): any[] {
        return this.log.map((e) => e.request);
    },
    /** Clear logs and counters (keeps the data). */
    reset(): void {
        this.log = [];
        this.changeSets = [];
        this.yielded = 0;
        this.opened = 0;
        this.closed = 0;
        this.failOn = null;
    },
    /** Drop all data. */
    clear(): void {
        this.store = new Store();
    },
    /** Add rows (each with an `id`) to the table of `label`. */
    addNodes(label: string, rows: SourceRow[]): void {
        for (const row of rows) {
            const { id, ...properties } = row;
            this.store.place({ id, labels: new Set(), properties: { ...properties } }, label);
        }
    },
    /** Add rows (`left_id`, `right_id`, optional `id`) of relationship `type`. */
    addRelationships(type: string, rows: SourceRow[]): void {
        for (const row of rows) {
            const { id, left_id, right_id, ...properties } = row;
            const rid = id ?? `${type}:${this.store.nextId++}`;
            this.store.relationships.set(key(rid), {
                id: rid,
                type,
                start: left_id,
                end: right_id,
                properties: { ...properties },
            });
        }
    },
    /** Current rows of a node label (definition shape). */
    nodeRows(label: string): SourceRow[] {
        return [...(this.store.labels.get(label)?.values() ?? [])].map((n) => ({
            id: n.id,
            ...n.properties,
        }));
    },
    /** Current rows of a relationship type (definition shape). */
    relationshipRows(type: string): SourceRow[] {
        const out: SourceRow[] = [];
        for (const r of this.store.relationships.values()) {
            if (r.type === type) {
                out.push({ id: r.id, left_id: r.start, right_id: r.end, ...r.properties });
            }
        }
        return out;
    },
    node(id: any, label?: string): StoredNode | undefined {
        return this.store.find(id, label);
    },
};

function resolve(value: any, ids: Record<string, any>): any {
    return typeof value === "string" && value in ids ? ids[value] : value;
}

function findRelationship(store: Store, change: any, ids: Record<string, any>): StoredRelationship {
    const target = resolve(change.target, ids);
    if (target !== null && typeof target === "object") {
        for (const r of store.relationships.values()) {
            if (
                r.type === change.type &&
                key(r.start) === key(target.left_id) &&
                key(r.end) === key(target.right_id)
            ) {
                return r;
            }
        }
    } else {
        const r = store.relationships.get(key(target));
        if (r !== undefined) return r;
    }
    throw new Error(`Unknown relationship ${JSON.stringify(change.target)}`);
}

function setProperties(target: Record<string, any>, properties: Record<string, any>): number {
    let count = 0;
    for (const [k, v] of Object.entries(properties ?? {})) {
        if (v === null || v === undefined) delete target[k];
        else target[k] = v;
        count++;
    }
    return count;
}

/** Apply a change set to a copy of the store; commit only if every change succeeds. */
function applyChanges(changes: any[]): { ids: Record<string, any>; stats: Record<string, number> } {
    const store = mock.store.clone();
    const ids: Record<string, any> = {};
    const created: Map<string, StoredNode> = new Map();
    const stats = {
        nodesCreated: 0,
        nodesDeleted: 0,
        relationshipsCreated: 0,
        relationshipsDeleted: 0,
        propertiesSet: 0,
        labelsAdded: 0,
        labelsRemoved: 0,
    };
    const node = (target: any, label?: string | null): StoredNode => {
        const n =
            (typeof target === "string" ? created.get(target) : undefined) ??
            store.find(resolve(target, ids), label);
        if (n === undefined) throw new Error(`Unknown node ${JSON.stringify(target)}`);
        return n;
    };
    const create = (ref: string, labels: string[], properties: Record<string, any>) => {
        const n: StoredNode = { id: store.nextId++, labels: new Set(), properties: {} };
        stats.propertiesSet += setProperties(n.properties, properties);
        for (const label of labels) store.place(n, label);
        ids[ref] = n.id;
        created.set(ref, n);
        stats.nodesCreated++;
        return n;
    };
    for (const change of changes) {
        switch (change.op) {
            case "createNode":
                create(change.ref, change.labels, change.properties);
                break;
            case "createRelationship": {
                const id = store.nextId++;
                store.relationships.set(key(id), {
                    id,
                    type: change.type,
                    start: node(change.start).id,
                    end: node(change.end).id,
                    properties: { ...change.properties },
                });
                ids[change.ref] = id;
                stats.relationshipsCreated++;
                stats.propertiesSet += Object.keys(change.properties ?? {}).length;
                break;
            }
            case "setProperties": {
                const target =
                    change.type !== undefined
                        ? findRelationship(store, change, ids)
                        : node(change.target, change.label);
                stats.propertiesSet += setProperties(target.properties, change.properties);
                break;
            }
            case "addLabels": {
                const n = node(change.target, change.label);
                for (const label of change.labels) {
                    if (!n.labels.has(label)) stats.labelsAdded++;
                    store.place(n, label);
                }
                break;
            }
            case "removeLabels": {
                const n = node(change.target, change.label);
                for (const label of change.labels) {
                    if (n.labels.delete(label)) {
                        store.labels.get(label)?.delete(key(n.id));
                        stats.labelsRemoved++;
                    }
                }
                break;
            }
            case "deleteRelationship": {
                const r = findRelationship(store, change, ids);
                store.relationships.delete(key(r.id));
                stats.relationshipsDeleted++;
                break;
            }
            case "deleteNode": {
                const n = node(change.target, change.label);
                const attached = [...store.relationships.values()].filter(
                    (r) => key(r.start) === key(n.id) || key(r.end) === key(n.id)
                );
                if (attached.length > 0 && change.detach !== true) {
                    throw new Error(
                        `Cannot delete node ${JSON.stringify(n.id)}: it still has relationships`
                    );
                }
                for (const r of attached) {
                    store.relationships.delete(key(r.id));
                    stats.relationshipsDeleted++;
                }
                store.remove(n);
                stats.nodesDeleted++;
                break;
            }
            case "mergeNode": {
                const existing = [...store.table(change.label).values()].find((n) =>
                    Object.entries(change.key).every(([k, v]) => n.properties[k] === v)
                );
                if (existing !== undefined) {
                    stats.propertiesSet += setProperties(existing.properties, change.onMatch);
                    ids[change.ref] = existing.id;
                    created.set(change.ref, existing);
                } else {
                    create(change.ref, [change.label], { ...change.key, ...change.onCreate });
                }
                break;
            }
            case "mergeRelationship": {
                const start = node(change.start).id;
                const end = node(change.end).id;
                const existing = [...store.relationships.values()].find(
                    (r) =>
                        r.type === change.type &&
                        key(r.start) === key(start) &&
                        key(r.end) === key(end) &&
                        Object.entries(change.key ?? {}).every(([k, v]) => r.properties[k] === v)
                );
                if (existing !== undefined) {
                    stats.propertiesSet += setProperties(existing.properties, change.onMatch);
                    ids[change.ref] = existing.id;
                } else {
                    const id = store.nextId++;
                    const properties: Record<string, any> = {};
                    stats.propertiesSet += setProperties(properties, {
                        ...change.key,
                        ...change.onCreate,
                    });
                    store.relationships.set(key(id), {
                        id,
                        type: change.type,
                        start,
                        end,
                        properties,
                    });
                    ids[change.ref] = id;
                    stats.relationshipsCreated++;
                }
                break;
            }
            default:
                throw new Error(`Unknown change ${change.op}`);
        }
    }
    mock.store = store;
    return { ids, stats };
}

function* rowsOf(pages: Iterable<SourceRow[]>): Iterable<SourceRow> {
    for (const page of pages) yield* page;
}

@FunctionDef({
    description: "Mock backend for statement-backed definitions (tests only)",
    category: "async",
    parameters: [],
    output: { description: "rows or write result", type: "object" },
})
export class MockBackend extends AsyncFunction {
    static capabilities: any = {
        lookup: true,
        expand: true,
        streaming: true,
        cacheable: true,
        predicates: true,
        writes: true,
    };
    static openReadContext() {
        mock.opened++;
        return { snapshot: mock.opened };
    }
    static closeReadContext() {
        mock.closed++;
    }
    constructor(name: string = "mockbackend") {
        super(name);
    }
    /**
     * `request` is the source request (`null` in eager definitions, which
     * then pass `fallback`: a label, or `rel:TYPE` for relationships).
     */
    public async *generate(request: any, fallback?: string): AsyncGenerator<any> {
        mock.log.push({
            request,
            signal: this.context?.signal ?? null,
            snapshot: this.context?.snapshot,
        });
        if (mock.failOn !== null && request?.operation === mock.failOn) {
            throw new Error("backend failure");
        }
        if (request?.operation === "write") {
            mock.changeSets.push(request.changes);
            yield applyChanges(request.changes);
            return;
        }
        const req = request ?? { operation: "scan", predicate: null, pageSize: 1000 };
        const isRelationship =
            request !== null ? request.type !== undefined : (fallback ?? "").startsWith("rel:");
        let pages: any;
        if (!isRelationship) {
            const source = inMemoryNodeSource(mock.nodeRows(request?.label ?? fallback));
            pages =
                req.operation === "lookup"
                    ? source.lookup!(req, null as any)
                    : source.scan(req, null as any);
        } else {
            const type = request?.type ?? fallback!.substring(4);
            const source = inMemoryRelationshipSource(mock.relationshipRows(type));
            pages =
                req.operation === "expand"
                    ? source.expand!(req, null as any)
                    : source.scan(req, null as any);
        }
        for (const row of rowsOf(pages)) {
            mock.yielded++;
            yield row;
        }
    }
}
