import { ProvenanceSource, RowProvenance, mergeProvenanceSegment } from "../../compute/provenance";
import Limit from "./limit";
import OrderBy from "./order_by";
import Projection from "./projection";
import Where from "./where";

/**
 * Represents a RETURN operation that produces the final query results.
 *
 * The RETURN operation evaluates expressions and collects them into result records.
 * It can optionally have a WHERE clause to filter results.
 *
 * @example
 * ```typescript
 * // RETURN x, y WHERE x > 0
 * ```
 */
class Return extends Projection {
    protected _where: Where | null = null;
    protected _results: Record<string, any>[] = [];
    private _limit: Limit | null = null;
    protected _orderBy: OrderBy | null = null;
    protected _provenanceSources: ProvenanceSource[] | null = null;
    protected _provenanceSink: RowProvenance[] | null = null;
    protected _provenanceRows: RowProvenance[] = [];
    public set where(where: Where) {
        this._where = where;
    }
    public get where(): boolean {
        if (this._where === null) {
            return true;
        }
        return this._where.value();
    }
    public set limit(limit: Limit) {
        this._limit = limit;
    }
    public set orderBy(orderBy: OrderBy) {
        this._orderBy = orderBy;
    }
    /**
     * Direct the runner-owned sink that receives the post-sorted,
     * post-limited provenance rows.  Once a sink is registered, every
     * emit captures a snapshot from the registered provenance sources.
     */
    public enableProvenance(sink: RowProvenance[]): void {
        this._provenanceSink = sink;
    }
    /**
     * Append a provenance source.  Sources are snapshotted per emitted
     * row and their segments are concatenated in registration order.
     * Multiple MATCHes downstream of the last aggregation register their
     * `ProvenanceSites` here; upstream aggregations register themselves
     * as virtual sources that replay the current group's accumulated
     * provenance.
     */
    public addProvenanceSource(source: ProvenanceSource): void {
        if (this._provenanceSources === null) {
            this._provenanceSources = [];
        }
        this._provenanceSources.push(source);
    }
    public async run(): Promise<void> {
        if (!this.where) {
            return;
        }
        // When ORDER BY is present, skip limit during accumulation;
        // limit will be applied after sorting in get results()
        if (this._orderBy === null && this._limit !== null && this._limit.isLimitReached) {
            return;
        }
        const record: Map<string, any> = new Map();
        for (const [expression, alias] of this.expressions()) {
            for (const sq of expression.subqueries()) {
                await sq.evaluate();
            }
            const raw = expression.value();
            let value: any = typeof raw === "object" && raw !== null ? structuredClone(raw) : raw;
            // `_label` is an internal property attached to node records by
            // the data resolver (consumed by the labels() function).  Strip
            // it from the projected value so it doesn't leak into results.
            if (value && typeof value === "object" && !Array.isArray(value) && "_label" in value) {
                delete value._label;
            }
            record.set(alias, value);
        }
        // Capture sort-key values while expression bindings are still live.
        if (this._orderBy !== null) {
            this._orderBy.captureSortKeys();
        }
        this._results.push(Object.fromEntries(record));
        if (this._provenanceSink !== null) {
            this._provenanceRows.push(this._snapshotProvenance());
        }
        if (this._orderBy === null && this._limit !== null) {
            this._limit.increment();
        }
    }
    /**
     * Concatenate all registered provenance sources into a single
     * `RowProvenance`.  Called once per emitted row.
     */
    protected _snapshotProvenance(): RowProvenance {
        const merged: RowProvenance = { nodes: [], relationships: [] };
        if (this._provenanceSources !== null) {
            for (const src of this._provenanceSources) {
                mergeProvenanceSegment(merged, src.snapshot());
            }
        }
        return merged;
    }
    public async initialize(): Promise<void> {
        this._results = [];
        this._provenanceRows = [];
    }
    public get results(): Record<string, any>[] {
        const { results } = this._buildOutput();
        return results;
    }
    public async finish(): Promise<void> {
        // Materialise final, sort-/limit-aligned provenance into the runner's
        // sink (when enabled) so `Runner.provenance` reads cheaply.
        if (this._provenanceSink !== null) {
            const { provenance } = this._buildOutput();
            this._provenanceSink.length = 0;
            for (const p of provenance) this._provenanceSink.push(p);
        }
        await super.finish();
    }
    /**
     * Apply ORDER BY permutation and LIMIT slicing to both the result rows
     * and the parallel provenance array in lockstep.  Provenance is
     * computed only when a sink is registered.
     */
    private _buildOutput(): { results: Record<string, any>[]; provenance: RowProvenance[] } {
        let results = this._results;
        let provenance = this._provenanceRows;
        const wantProvenance = this._provenanceSink !== null;
        if (this._orderBy !== null) {
            const indices = this._orderBy.sortIndices(results);
            results = indices.map((i) => results[i]);
            if (wantProvenance) {
                provenance = indices.map((i) => provenance[i]);
            }
        }
        if (this._orderBy !== null && this._limit !== null) {
            results = results.slice(0, this._limit.limitValue);
            if (wantProvenance) {
                provenance = provenance.slice(0, this._limit.limitValue);
            }
        }
        return { results, provenance };
    }
    /** @internal Direct accessor used by UNION to merge child provenance. */
    public get provenanceRows(): RowProvenance[] {
        return this._buildOutput().provenance;
    }
}

export default Return;
