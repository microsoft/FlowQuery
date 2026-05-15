import type Runner from "../compute/runner";
import ASTNode from "../parsing/ast_node";
import { attachVirtualSource } from "./virtual_sources";

/**
 * Backing statement of a virtual node or relationship: owns the AST that
 * synthesises the records and the optional in-memory cache around its
 * execution.
 *
 * Used by {@link PhysicalNode} and {@link PhysicalRelationship} via
 * composition so both physical kinds share a single caching + execution
 * implementation.
 */
class VirtualStatement {
    private _statement: ASTNode | null = null;
    private _isStatic: boolean = false;
    private _refreshEveryMs: number | null = null;
    private _cache: Record<string, any>[] | null = null;
    private _cachedAt: number = 0;

    public set statement(statement: ASTNode | null) {
        this._statement = statement;
        this.invalidateCache();
    }
    public get statement(): ASTNode | null {
        return this._statement;
    }

    public set isStatic(value: boolean) {
        this._isStatic = value;
    }
    public get isStatic(): boolean {
        return this._isStatic;
    }

    public set refreshEveryMs(value: number | null) {
        this._refreshEveryMs = value;
    }
    public get refreshEveryMs(): number | null {
        return this._refreshEveryMs;
    }

    public invalidateCache(): void {
        this._cache = null;
        this._cachedAt = 0;
    }

    /** True if the cached payload (if any) is still within its refresh window. */
    private isCacheFresh(): boolean {
        return this._refreshEveryMs === null || Date.now() - this._cachedAt < this._refreshEveryMs;
    }

    /**
     * Execute the backing statement and return its records, using the
     * persistent cache when it is safe to do so.
     *
     * @param args        Pass-down filter arguments; bypasses the cache.
     * @param provenance  Run the inner statement with provenance enabled
     *                    so each emitted record carries a weak-map link to
     *                    the inner row that produced it.  Also bypasses the
     *                    cache (the weak-map binding must be re-established
     *                    each call).
     */
    public async data(
        args: Record<string, any> | null = null,
        provenance: boolean = false
    ): Promise<Record<string, any>[]> {
        if (this._statement === null) {
            throw new Error("Statement is null");
        }
        // Filter pass-down queries (with args) and provenance mode bypass
        // the persistent cache: arg-bound results depend on runtime values,
        // and provenance mode needs fresh records to back the lineage
        // weak-map.
        const cacheable = !provenance && args === null && this._isStatic;
        if (cacheable && this._cache !== null && this.isCacheFresh()) {
            return this._cache;
        }
        const result = await this.runInner(args, provenance);
        if (cacheable) {
            this._cache = result;
            this._cachedAt = Date.now();
        }
        return result;
    }

    private async runInner(
        args: Record<string, any> | null,
        provenance: boolean
    ): Promise<Record<string, any>[]> {
        // Lazy dynamic import to avoid a load-time cycle:
        // virtual_statement -> runner -> parsing -> graph (back to here).
        // Python uses the same idiom (function-local import).
        const RunnerCtor: typeof Runner = (await import("../compute/runner")).default;
        const runner = new RunnerCtor(null, this._statement, args, { provenance });
        await runner.run();
        const result = runner.results;
        if (provenance) {
            const prov = runner.provenance;
            const len = Math.min(prov.length, result.length);
            for (let i = 0; i < len; i++) {
                attachVirtualSource(result[i], prov[i]);
            }
        }
        return result;
    }
}

export default VirtualStatement;
