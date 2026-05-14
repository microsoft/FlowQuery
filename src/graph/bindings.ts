/**
 * Singleton store for `LET`-bound values.
 *
 * Bindings live alongside virtual node/relationship definitions in
 * {@link Database} — they are persistent across statements within a
 * top-level Runner invocation, and are reset by the top-level Runner
 * at the start of each `.run()`.
 *
 * A binding's value may be any JSON-serialisable value: a primitive, an
 * array, or a map.  Bindings are referenced by name inside virtual
 * definitions and inside `LOAD JSON FROM <name>` expressions; the
 * `UPDATE` statement replaces or merges into an existing binding.
 */

/**
 * Options controlling the behaviour of {@link Bindings.merge}.
 */
export interface MergeOptions {
    /**
     * One or more keys used to match rows in the existing binding
     * against rows in the incoming list.  Composite keys are matched
     * positionally.
     */
    keys: string[];
    /**
     * If set, only the listed fields from a matched incoming row
     * overwrite the corresponding fields of the existing row (a
     * partial / "field-level" merge).  When omitted, a matched row is
     * replaced entirely by the incoming row.
     */
    setFields?: string[] | null;
    /**
     * When `false`, incoming rows that match an existing row are
     * skipped (insert-only behaviour, mirroring SQL
     * `WHEN NOT MATCHED THEN INSERT`).  Defaults to `true`.
     */
    whenMatched?: boolean;
    /**
     * When `false`, incoming rows that do not match any existing row
     * are skipped (update-only behaviour, mirroring SQL
     * `WHEN MATCHED THEN UPDATE`).  Defaults to `true`.
     */
    whenNotMatched?: boolean;
}

class Bindings {
    private static instance: Bindings;
    private _values: Map<string, any> = new Map();

    public static getInstance(): Bindings {
        if (!Bindings.instance) {
            Bindings.instance = new Bindings();
        }
        return Bindings.instance;
    }

    public set(name: string, value: any): void {
        this._values.set(name, value);
    }

    public get(name: string): any {
        return this._values.get(name);
    }

    public has(name: string): boolean {
        return this._values.has(name);
    }

    public delete(name: string): void {
        this._values.delete(name);
    }

    /** Replace all entries with the given map (used by Runner reset). */
    public clear(): void {
        this._values.clear();
    }

    /**
     * Merge `incoming` rows into an existing array-binding using one or
     * more keys.
     *
     * For every incoming row whose key tuple matches an existing row,
     * the existing row is replaced (or partially updated when
     * `setFields` is provided).  Incoming rows with no match are
     * appended to the end (preserving the existing order of matched
     * rows).  Rows that aren't objects or are missing one of the keys
     * are appended unconditionally.
     *
     * The `whenMatched` / `whenNotMatched` flags suppress the
     * corresponding branch, mirroring SQL `MERGE`'s `WHEN MATCHED` /
     * `WHEN NOT MATCHED` clauses.
     */
    public merge(name: string, incoming: any[], options: MergeOptions): void {
        const { keys, setFields = null, whenMatched = true, whenNotMatched = true } = options;
        if (keys.length === 0) {
            throw new Error("UPDATE ... MERGE requires at least one key");
        }
        const keyLabel = keys.length === 1 ? keys[0] : `(${keys.join(", ")})`;
        if (!Array.isArray(incoming)) {
            throw new Error(
                `UPDATE ... MERGE ON ${keyLabel} requires the right-hand side to evaluate to a list of rows`
            );
        }
        const existing = this._values.get(name);
        if (!Array.isArray(existing)) {
            // First-ever MERGE on a missing / non-list binding inserts the
            // incoming rows wholesale (filtered by whenNotMatched).
            this._values.set(name, whenNotMatched ? incoming.slice() : []);
            return;
        }
        const rowKey = (row: any): string | null => {
            if (row === null || typeof row !== "object") {
                return null;
            }
            const parts: any[] = [];
            for (const k of keys) {
                if (!(k in row)) {
                    return null;
                }
                parts.push(row[k]);
            }
            return JSON.stringify(parts);
        };
        const indexByKey: Map<string, number> = new Map();
        existing.forEach((row, i) => {
            const k = rowKey(row);
            if (k !== null) {
                indexByKey.set(k, i);
            }
        });
        const result = existing.slice();
        for (const row of incoming) {
            const k = rowKey(row);
            if (k === null) {
                // Rows without a key always append (no possible match).
                if (whenNotMatched) {
                    result.push(row);
                }
                continue;
            }
            const matched = indexByKey.get(k);
            if (matched !== undefined) {
                if (!whenMatched) {
                    continue;
                }
                if (setFields !== null) {
                    const updated = { ...result[matched] };
                    for (const f of setFields) {
                        if (f in row) {
                            updated[f] = row[f];
                        }
                    }
                    result[matched] = updated;
                } else {
                    result[matched] = row;
                }
            } else {
                if (!whenNotMatched) {
                    continue;
                }
                indexByKey.set(k, result.length);
                result.push(row);
            }
        }
        this._values.set(name, result);
    }
}

export default Bindings;
