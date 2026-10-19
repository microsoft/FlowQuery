/**
 * Write change sets (`CREATE` / `MERGE` / `SET` / `REMOVE` / `DELETE`
 * against statement-backed definitions).
 *
 * While a query runs, write clauses append changes here instead of
 * applying them.  When the query succeeds FlowQuery sends the whole list
 * to the definitions' backend function in one call:
 *
 * ```
 * { version: 1, operation: "write", changes: [...] }
 * ```
 *
 * and the backend applies it atomically and answers
 * `{ ids: { "$1": 1001, ... }, stats: { nodesCreated, ... } }`.  New nodes
 * and relationships get temporary refs (`"$1"`, `"$2"`, ...) that later
 * changes in the same list may refer to.
 *
 * Change entries (node targets carry `label`, relationship targets `type`):
 *
 * - `{op: "createNode", ref, labels, properties}`
 * - `{op: "createRelationship", ref, type, start, end, properties}`
 * - `{op: "mergeNode", ref, label, key, onCreate, onMatch}`
 * - `{op: "mergeRelationship", ref, type, start, end, key, onCreate, onMatch}`
 * - `{op: "setProperties", target, label | type, properties}` — `null` removes
 * - `{op: "replaceProperties", target, label | type, properties}` — `SET x = {...}`
 * - `{op: "addLabels" | "removeLabels", target, label, labels}`
 * - `{op: "deleteRelationship", target, type}`
 * - `{op: "deleteNode", target, label, detach}`
 *
 * A relationship `target` is the row's `id` column when the definition
 * returns one, otherwise `{left_id, right_id}`.
 *
 * **Default graph.**  Writes to labels and types without a definition go
 * to the default graph (`USE GRAPH fn($request)`); its requests carry
 * `graph: true`.  Targets are graph-wide entity ids, `createNode.labels`
 * may hold zero or several labels, `mergeNode` adds `labels` (all of
 * them; `label` is the first), and relationship changes carry the stored
 * `type` of the relationship.
 *
 * **Transactions.**  Backends declaring `transactions: true` (with
 * `writes: true`) run each query in one transaction, opened by the
 * function's `openReadContext()` and shared by reads and writes.  Change
 * sets are then sent as the query goes (before a read that follows a
 * write, and at the end of every statement) so later clauses and
 * statements read the query's own writes, and the query ends with
 * `{version: 1, operation: "commit"}`, or `{operation: "rollback"}` when
 * it fails or is cancelled.
 */
import { canonicalKey } from "./source_context";

export const WRITE_CONTRACT_VERSION = 1;

export type WriteChange = Record<string, any> & { op: string };

export interface WriteRequest {
    version: number;
    operation: "write";
    changes: WriteChange[];
}

/** Ends a transactional query (`transactions: true`). */
export interface TransactionRequest {
    version: number;
    operation: "commit" | "rollback";
}

export interface WriteResult {
    /** Final ids of the temporary refs (`"$1"` → backend id). */
    ids: Record<string, any>;
    /** Backend-reported counters (`nodesCreated`, `propertiesSet`, ...). */
    stats: Record<string, number>;
    /** Every change that was sent, in order. */
    changes: WriteChange[];
}

/** The backend function a query writes to. */
export interface WriteBackend {
    name: string;
    functionClass: any;
    /** Position of the `$request` argument in the definition's call. */
    requestIndex: number;
    /** The other arguments, evaluated from the definition's call. */
    args: any[];
    /** The backend is the default graph (requests carry `graph: true`). */
    graph?: boolean;
}

/** Where a write goes: the backend function and whether it is transactional. */
export interface WriteRoute {
    backend: WriteBackend;
    transactions: boolean;
}

function describeBackend(backend: WriteBackend): string {
    const name = backend.graph === true ? `default graph ${backend.name}` : backend.name;
    const args = backend.args.filter((_, i) => i !== backend.requestIndex);
    return args.length > 0 ? `${name}(${args.map((a) => JSON.stringify(a)).join(", ")})` : name;
}

/** Query-scoped collector of write changes. */
export class WriteSet {
    /** Every change recorded by the query, in order. */
    public readonly changes: WriteChange[] = [];
    public backend: WriteBackend | null = null;
    /** True when every target declares `transactions: true`. */
    public transactional: boolean = true;
    /** Send changes after each write-clause row (reads follow the writes). */
    public perRow: boolean = false;
    /** Changes were sent inside the backend's transaction. */
    public sent: boolean = false;
    /** The transaction was committed. */
    public committed: boolean = false;
    /** Final ids of temporary refs, merged across sends. */
    public readonly ids: Record<string, any> = {};
    /** Backend counters, summed across sends. */
    public readonly stats: Record<string, number> = {};
    /** @internal Routes resolved for this query, by target key. */
    public readonly routes: Map<string, WriteRoute> = new Map();
    private _pending: WriteChange[] = [];
    private _deleted: Set<string> = new Set();
    private _bindings: Map<string, (id: any) => void> = new Map();
    private _next: number = 1;

    /**
     * Pin the query to `route`'s backend.  A query writes through one
     * backend function, so a second one is rejected; nothing has been
     * applied at that point unless a transactional backend already
     * received changes, which are then rolled back.
     */
    public route(route: WriteRoute): void {
        const current = this.backend;
        if (current === null) {
            this.backend = route.backend;
        } else if (
            current.functionClass !== route.backend.functionClass ||
            (current.graph === true) !== (route.backend.graph === true) ||
            canonicalKey(current.args) !== canonicalKey(route.backend.args)
        ) {
            throw new Error(
                `A query can only write through one backend function (${describeBackend(current)} and ${describeBackend(route.backend)})`
            );
        }
        this.transactional &&= route.transactions;
    }
    /**
     * Record that the query deletes `target` (`kind` scopes the id: a
     * definition's label or type, or the default graph).  Returns false when it was
     * already deleted earlier in the query, so repeated deletes (the same
     * entity bound in several rows) are sent once.
     */
    public markDeleted(kind: string, target: any): boolean {
        const key = `${kind}:${canonicalKey(target)}`;
        if (this._deleted.has(key)) return false;
        this._deleted.add(key);
        return true;
    }
    /** A fresh temporary ref for a new node or relationship. */
    public ref(): string {
        return `$${this._next++}`;
    }
    public get refs(): Set<string> {
        const out = new Set<string>();
        for (let i = 1; i < this._next; i++) out.add(`$${i}`);
        return out;
    }
    public add(change: WriteChange): void {
        this.changes.push(change);
        this._pending.push(change);
    }
    public get pending(): number {
        return this._pending.length;
    }
    /**
     * Take the changes not sent yet, with refs resolved by earlier sends
     * replaced by their final ids.
     */
    public takePending(): WriteChange[] {
        const out = this._pending.map((c) => replaceRefs(structuredCopy(c), this.ids, this.refs));
        this._pending = [];
        return out;
    }
    /** Rebind a variable once the backend has assigned `ref` an id. */
    public bind(ref: string, rebind: (id: any) => void): void {
        this._bindings.set(ref, rebind);
    }
    /** Record a backend response: final ids (rebinding variables) and stats. */
    public absorb(response: { ids?: Record<string, any>; stats?: Record<string, number> }): void {
        for (const [ref, id] of Object.entries(response.ids ?? {})) {
            this.ids[ref] = id;
            const rebind = this._bindings.get(ref);
            if (rebind !== undefined) {
                this._bindings.delete(ref);
                rebind(id);
            }
        }
        for (const [key, value] of Object.entries(response.stats ?? {})) {
            if (typeof value === "number") this.stats[key] = (this.stats[key] ?? 0) + value;
        }
    }
}

function structuredCopy<T>(value: T): T {
    if (Array.isArray(value)) return value.map(structuredCopy) as any;
    if (value !== null && typeof value === "object" && !(value instanceof Date)) {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(value)) out[k] = structuredCopy(v);
        return out as T;
    }
    return value;
}

/**
 * Replace temporary refs by their final ids, in place, throughout
 * `value` (result rows, nested maps and lists).  Returns the new value.
 */
export function replaceRefs(value: any, ids: Record<string, any>, refs: Set<string>): any {
    if (typeof value === "string") {
        return refs.has(value) && value in ids ? ids[value] : value;
    }
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) value[i] = replaceRefs(value[i], ids, refs);
        return value;
    }
    if (value !== null && typeof value === "object" && !(value instanceof Date)) {
        for (const key of Object.keys(value)) value[key] = replaceRefs(value[key], ids, refs);
        return value;
    }
    return value;
}
