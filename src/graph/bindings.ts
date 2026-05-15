import type Runner from "../compute/runner";
import type ASTNode from "../parsing/ast_node";
import { attachVirtualSource } from "./virtual_sources";

/**
 * One entry in the {@link Bindings} singleton.  Plain bindings store
 * their materialised `value` directly; refreshable bindings (created
 * by `LET name = { ... } REFRESH EVERY n unit`) additionally store
 * the backing `statement` and TTL so the value can be re-evaluated on
 * read once stale.
 */
class BindingEntry {
    public value: any = undefined;
    public statement: ASTNode | null = null;
    public isRefreshable: boolean = false;
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
 * `LET name = { ... } REFRESH EVERY n unit` registers a refreshable
 * binding: the sub-query is evaluated eagerly and the result is
 * cached, but the TTL causes the next read after expiry to re-execute
 * the sub-query.  Refreshable bindings cannot be silently overwritten
 * by another `LET`, `UPDATE`, or `MERGE`; callers must `DROP BINDING`
 * first.
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

    /**
     * Eager set, used by plain `LET`, `UPDATE`, and `MERGE INTO`.
     * Throws if the name is currently bound to a refreshable binding;
     * the caller must `DROP BINDING` first.
     */
    public set(name: string, value: any): void {
        const existing = this._entries.get(name);
        if (existing !== undefined && existing.isRefreshable) {
            throw new Error(`Binding '${name}' is refreshable; DROP BINDING ${name} first`);
        }
        let entry = existing;
        if (entry === undefined) {
            entry = new BindingEntry();
            this._entries.set(name, entry);
        }
        entry.value = value;
        entry.statement = null;
        entry.isRefreshable = false;
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

    public isRefreshable(name: string): boolean {
        return this._entries.get(name)?.isRefreshable === true;
    }

    /**
     * Register a refreshable binding with an eagerly evaluated value
     * and a backing sub-query that is re-executed when the TTL has
     * elapsed.  Throws if a binding with the same name already exists;
     * callers must `DROP BINDING` first.
     */
    public registerRefreshable(
        name: string,
        value: any,
        statement: ASTNode,
        refreshEveryMs: number
    ): void {
        if (this._entries.has(name)) {
            throw new Error(`Binding '${name}' already exists; DROP BINDING ${name} first`);
        }
        const entry = new BindingEntry();
        entry.value = value;
        entry.statement = statement;
        entry.isRefreshable = true;
        entry.refreshEveryMs = refreshEveryMs;
        entry.primed = true;
        entry.cachedAt = Date.now();
        this._entries.set(name, entry);
    }

    /**
     * Clear the cached value of a refreshable binding so the next
     * {@link materialize} call re-executes the backing sub-query.
     * No-op for plain bindings.
     */
    public invalidate(name: string): void {
        const entry = this._entries.get(name);
        if (entry === undefined || !entry.isRefreshable) {
            return;
        }
        entry.value = undefined;
        entry.primed = false;
        entry.cachedAt = 0;
    }

    /**
     * Re-evaluate a refreshable binding's backing sub-query if the
     * cached value is stale (TTL elapsed or invalidated).  No-op for
     * plain bindings or for refreshable bindings that are still fresh.
     */
    public async materialize(name: string): Promise<void> {
        const entry = this._entries.get(name);
        if (entry === undefined || !entry.isRefreshable || entry.statement === null) {
            return;
        }
        const isFresh =
            entry.primed &&
            entry.refreshEveryMs !== null &&
            Date.now() - entry.cachedAt < entry.refreshEveryMs;
        if (isFresh) {
            return;
        }
        if (this._materializing.has(name)) {
            throw new Error(
                `Cyclic refreshable binding dependency detected while materialising '${name}'`
            );
        }
        this._materializing.add(name);
        try {
            // Lazy dynamic import to avoid a load-time cycle:
            // bindings -> runner -> parsing -> graph (back to here).
            const RunnerCtor: typeof Runner = (await import("../compute/runner")).default;
            // Capture provenance on refresh so downstream readers can
            // chase lineage back through this LET binding (symmetric to
            // initial materialisation in `Let.run`).
            const runner = new RunnerCtor(null, entry.statement, null, { provenance: true });
            await runner.run();
            entry.value = runner.results;
            const prov = runner.provenance;
            if (Array.isArray(entry.value)) {
                const len = Math.min(prov.length, entry.value.length);
                for (let i = 0; i < len; i++) {
                    const row = entry.value[i];
                    if (row !== null && typeof row === "object") {
                        attachVirtualSource(row, prov[i]);
                    }
                }
            }
            entry.primed = true;
            entry.cachedAt = Date.now();
        } finally {
            this._materializing.delete(name);
        }
    }
}

export default Bindings;
export { BindingEntry };
