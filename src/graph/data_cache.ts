import PhysicalNode from "./physical_node";
import PhysicalRelationship from "./physical_relationship";

/**
 * Per-query cache for virtual graph data.
 *
 * Each top-level Runner creates its own DataCache instance,
 * ensuring thread-safety when multiple queries run concurrently.
 * Filter pass-down queries (with args) bypass the cache since
 * their results depend on runtime parameter values.
 */
class DataCache {
    private _cache: Map<string, Record<string, any>[]> = new Map();
    private _provenance: boolean;

    constructor(provenance: boolean = false) {
        this._provenance = provenance;
    }

    /** Whether sub-queries should be run with provenance enabled. */
    public get provenance(): boolean {
        return this._provenance;
    }

    public async get(
        key: string,
        physical: PhysicalNode | PhysicalRelationship,
        args: Record<string, any> | null
    ): Promise<Record<string, any>[]> {
        if (args !== null) {
            return physical.data(args, this._provenance);
        }
        // Provenance mode must re-run the inner query each invocation
        // because the virtual-source weak map is populated only on the
        // freshly produced records.  Static caches store inert records
        // with no back-links.
        if (this._provenance) {
            return physical.data(null, true);
        }
        const cached = this._cache.get(key);
        if (cached !== undefined) {
            return cached;
        }
        const data = await physical.data(null, false);
        this._cache.set(key, data);
        return data;
    }
}

export default DataCache;
