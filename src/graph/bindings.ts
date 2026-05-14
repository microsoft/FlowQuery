import type Runner from "../compute/runner";
import type ASTNode from "../parsing/ast_node";

/**
 * One entry in the {@link Bindings} singleton.  Eager (non-STATIC)
 * bindings store their materialised `value` directly; STATIC bindings
 * additionally store the backing `statement` and refresh metadata so
 * the value can be (re)computed lazily on read.
 */
class BindingEntry {
    public value: any = undefined;
    public statement: ASTNode | null = null;
    public isStatic: boolean = false;
    public refreshEveryMs: number | null = null;
    public cachedAt: number = 0;
    public primed: boolean = false;
}

/**
 * Singleton store for `LET`-bound values.
 *
 * Bindings live alongside virtual node/relationship definitions in
 * {@link Database}: they are persistent across `Runner` invocations
 * for the lifetime of the process.
 *
 * A binding's value may be any JSON-serialisable value: a primitive, an
 * array, or a map.  Bindings are referenced by name inside virtual
 * definitions and inside `LOAD JSON FROM <name>` expressions; the
 * `UPDATE` statement replaces an existing binding wholesale, while
 * `MERGE INTO ... USING ...` upserts per row.
 *
 * `LET STATIC name = { ... } [REFRESH EVERY n unit]` registers a
 * deferred provider: the sub-query is stored, not the value, and is
 * (re)evaluated lazily by {@link materialize} on first access or after
 * the TTL elapses.
 */
class Bindings {
    private static instance: Bindings;
    private _entries: Map<string, BindingEntry> = new Map();
    private _materializing: Set<string> = new Set();

    public static getInstance(): Bindings {
        if (!Bindings.instance) {
            Bindings.instance = new Bindings();
        }
        return Bindings.instance;
    }

    /** Eager set, used by non-STATIC `LET`, `UPDATE`, and `MERGE INTO`. */
    public set(name: string, value: any): void {
        let entry = this._entries.get(name);
        if (entry === undefined) {
            entry = new BindingEntry();
            this._entries.set(name, entry);
        }
        entry.value = value;
        entry.statement = null;
        entry.isStatic = false;
        entry.refreshEveryMs = null;
        entry.cachedAt = Date.now();
        entry.primed = true;
    }

    public get(name: string): any {
        const entry = this._entries.get(name);
        return entry === undefined ? undefined : entry.value;
    }

    public has(name: string): boolean {
        return this._entries.has(name);
    }

    public delete(name: string): void {
        this._entries.delete(name);
    }

    /** Replace all entries (test/teardown helper). */
    public clear(): void {
        this._entries.clear();
    }

    /** Inspect the underlying entry without materialising it. */
    public getEntry(name: string): BindingEntry | undefined {
        return this._entries.get(name);
    }

    public isStatic(name: string): boolean {
        return this._entries.get(name)?.isStatic === true;
    }

    /**
     * Register a STATIC binding with a deferred sub-query.  Throws if a
     * binding with the same name already exists; callers must
     * `DROP BINDING` first.
     */
    public registerStatic(name: string, statement: ASTNode, refreshEveryMs: number | null): void {
        if (this._entries.has(name)) {
            throw new Error(`Binding '${name}' already exists; DROP BINDING ${name} first`);
        }
        const entry = new BindingEntry();
        entry.statement = statement;
        entry.isStatic = true;
        entry.refreshEveryMs = refreshEveryMs;
        entry.primed = false;
        this._entries.set(name, entry);
    }

    /**
     * Clear the cached value for a STATIC binding so the next
     * {@link materialize} call re-executes the backing sub-query.
     * No-op for non-STATIC bindings.
     */
    public invalidate(name: string): void {
        const entry = this._entries.get(name);
        if (entry === undefined || !entry.isStatic) {
            return;
        }
        entry.value = undefined;
        entry.primed = false;
        entry.cachedAt = 0;
    }

    /**
     * Lazily evaluate a STATIC binding's backing sub-query if it has
     * never been primed or the TTL has elapsed.  No-op for non-STATIC
     * bindings or for STATIC bindings that are still fresh.
     */
    public async materialize(name: string): Promise<void> {
        const entry = this._entries.get(name);
        if (entry === undefined || !entry.isStatic || entry.statement === null) {
            return;
        }
        const isFresh =
            entry.primed &&
            (entry.refreshEveryMs === null || Date.now() - entry.cachedAt < entry.refreshEveryMs);
        if (isFresh) {
            return;
        }
        if (this._materializing.has(name)) {
            throw new Error(
                `Cyclic STATIC binding dependency detected while materialising '${name}'`
            );
        }
        this._materializing.add(name);
        try {
            // Lazy dynamic import to avoid a load-time cycle:
            // bindings -> runner -> parsing -> graph (back to here).
            const RunnerCtor: typeof Runner = (await import("../compute/runner")).default;
            const runner = new RunnerCtor(null, entry.statement, null);
            await runner.run();
            entry.value = runner.results;
            entry.primed = true;
            entry.cachedAt = Date.now();
        } finally {
            this._materializing.delete(name);
        }
    }
}

export default Bindings;
export { BindingEntry };
