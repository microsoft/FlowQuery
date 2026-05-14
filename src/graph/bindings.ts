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
     * Merge `incoming` rows into an existing array-binding keyed by
     * `key`.  Rows in the existing binding with a matching key value
     * are *replaced entirely* by the incoming row; rows whose key is
     * not present in the existing binding are appended.
     *
     * If the existing binding is missing or is not an array of objects,
     * it is replaced with the incoming rows wholesale (so a first-ever
     * MERGE behaves like an insert).
     */
    public merge(name: string, key: string, incoming: any[]): void {
        if (!Array.isArray(incoming)) {
            throw new Error(
                `UPDATE ... MERGE ON ${key} requires the right-hand side to evaluate to a list of rows`
            );
        }
        const existing = this._values.get(name);
        if (!Array.isArray(existing)) {
            this._values.set(name, incoming.slice());
            return;
        }
        const indexByKey: Map<any, number> = new Map();
        existing.forEach((row, i) => {
            if (row !== null && typeof row === "object" && key in row) {
                indexByKey.set(row[key], i);
            }
        });
        const result = existing.slice();
        for (const row of incoming) {
            if (row !== null && typeof row === "object" && key in row) {
                const matched = indexByKey.get(row[key]);
                if (matched !== undefined) {
                    result[matched] = row;
                } else {
                    indexByKey.set(row[key], result.length);
                    result.push(row);
                }
            } else {
                result.push(row);
            }
        }
        this._values.set(name, result);
    }
}

export default Bindings;
