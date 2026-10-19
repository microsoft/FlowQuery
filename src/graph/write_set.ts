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
 * - `{op: "addLabels" | "removeLabels", target, label, labels}`
 * - `{op: "deleteRelationship", target, type}`
 * - `{op: "deleteNode", target, label, detach}`
 *
 * A relationship `target` is the row's `id` column when the definition
 * returns one, otherwise `{left_id, right_id}`.
 */
export const WRITE_CONTRACT_VERSION = 1;

export type WriteChange = Record<string, any> & { op: string };

export interface WriteRequest {
    version: number;
    operation: "write";
    changes: WriteChange[];
}

export interface WriteResult {
    /** Final ids of the temporary refs (`"$1"` → backend id). */
    ids: Record<string, any>;
    /** Backend-reported counters (`nodesCreated`, `propertiesSet`, ...). */
    stats: Record<string, number>;
    /** The change set that was sent. */
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
}

/** Query-scoped collector of write changes. */
export class WriteSet {
    public readonly changes: WriteChange[] = [];
    public backend: WriteBackend | null = null;
    private _next: number = 1;

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
    }
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
