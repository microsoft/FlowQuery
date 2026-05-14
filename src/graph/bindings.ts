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
 * `UPDATE` statement replaces an existing binding wholesale, while
 * `MERGE INTO … USING …` upserts per row.
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
}

export default Bindings;
