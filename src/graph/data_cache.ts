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
    private _deep: boolean;
    private _properties: boolean;

    constructor(deep: boolean = false, properties: boolean = false) {
        this._deep = deep;
        this._properties = properties;
    }

    /** Whether sub-queries should be run with deep-mode provenance. */
    public get deep(): boolean {
        return this._deep;
    }

    /** Whether sub-queries should capture property values in their provenance. */
    public get properties(): boolean {
        return this._properties;
    }

    public async get(
        key: string,
        physical: PhysicalNode | PhysicalRelationship,
        args: Record<string, any> | null
    ): Promise<Record<string, any>[]> {
        if (args !== null) {
            return physical.data(args, this._deep, this._properties);
        }
        // Deep mode must re-run the inner query each invocation because the
        // virtual-source weak map is populated only on the freshly produced
        // records.  Static caches store inert records with no back-links.
        if (this._deep) {
            return physical.data(null, true, this._properties);
        }
        const cached = this._cache.get(key);
        if (cached !== undefined) {
            return cached;
        }
        const data = await physical.data(null, false, this._properties);
        this._cache.set(key, data);
        return data;
    }
}

export default DataCache;
