import type Runner from "../compute/runner";
import ASTNode from "../parsing/ast_node";
import Node from "./node";
import { attachVirtualSource } from "./virtual_sources";

class PhysicalNode extends Node {
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
    public get isStatic(): boolean {
        return this._isStatic;
    }
    public set isStatic(value: boolean) {
        this._isStatic = value;
    }
    public get refreshEveryMs(): number | null {
        return this._refreshEveryMs;
    }
    public set refreshEveryMs(value: number | null) {
        this._refreshEveryMs = value;
    }
    public invalidateCache(): void {
        this._cache = null;
        this._cachedAt = 0;
    }
    public async data(
        args: Record<string, any> | null = null,
        deep: boolean = false
    ): Promise<Record<string, any>[]> {
        if (this._statement === null) {
            throw new Error("Statement is null");
        }
        // Filter pass-down queries (with args) bypass the persistent cache
        // because results depend on runtime parameter values.  Deep mode
        // also bypasses the cache so each invocation produces fresh records
        // with up-to-date weak-map back-links.
        if (!deep && args === null && this._isStatic && this._cache !== null) {
            const isFresh =
                this._refreshEveryMs === null || Date.now() - this._cachedAt < this._refreshEveryMs;
            if (isFresh) {
                return this._cache;
            }
        }
        // Lazy dynamic import to avoid a load-time cycle:
        // physical_node -> runner -> parsing -> graph (back to here).
        // Python uses the same idiom (function-local import).
        const RunnerCtor: typeof Runner = (await import("../compute/runner")).default;
        const runner = new RunnerCtor(
            null,
            this._statement,
            args,
            deep ? { provenance: true, deep: true } : {}
        );
        await runner.run();
        const result = runner.results;
        if (deep) {
            const prov = runner.provenance;
            const len = Math.min(prov.length, result.length);
            for (let i = 0; i < len; i++) {
                attachVirtualSource(result[i], prov[i]);
            }
        }
        if (!deep && args === null && this._isStatic) {
            this._cache = result;
            this._cachedAt = Date.now();
        }
        return result;
    }
}

export default PhysicalNode;
