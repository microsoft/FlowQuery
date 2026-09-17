import { ProvenanceSource, RowProvenance } from "../../compute/provenance";
import Expression from "../expressions/expression";
import GroupBy from "./group_by";
import Operation from "./operation";
import Return from "./return";

class AggregatedReturn extends Return {
    private _group_by: GroupBy = new GroupBy(this.children as Expression[], () => this._where);
    public async run(): Promise<void> {
        await this._group_by.run();
    }
    /**
     * Provenance sources registered on an aggregate RETURN are folded
     * into the active group's dedup maps rather than snapshotted per
     * row, because each output row corresponds to a *group* of upstream
     * matches.  Override to route through the embedded `GroupBy`.
     */
    public addProvenanceSource(source: ProvenanceSource): void {
        this._group_by.addProvenanceSource(source);
    }
    public get results(): Record<string, any>[] {
        const { results } = this._buildAggregateOutput();
        return results;
    }
    public async finish(): Promise<void> {
        if (this._provenanceSink !== null) {
            const { provenance } = this._buildAggregateOutput();
            this._provenanceSink.length = 0;
            for (const p of provenance) this._provenanceSink.push(p);
        }
        // Skip Return.finish() because it would re-materialise provenance
        // from the empty per-row `_results` array; chain straight to the
        // next operation instead.
        await Operation.prototype.finish.call(this);
    }
    private _buildAggregateOutput(): {
        results: Record<string, any>[];
        provenance: RowProvenance[];
    } {
        const results: Record<string, any>[] = [];
        const provenance: RowProvenance[] = [];
        // Emit a provenance entry per result row whenever a sink is
        // registered, even if no provenance sources were attached (e.g.
        // `RETURN count(*)` over no MATCH).  This keeps
        // `runner.provenance.length === runner.results.length`.
        const wantProvenance = this._provenanceSink !== null;
        // Re-emission re-walks the group tree, so drop stale keys first.
        this._orderBy?.resetSortKeys();
        if (wantProvenance) {
            const recordIter = this._group_by.generate_results();
            const provIter = this._group_by.generate_provenance();
            while (true) {
                const r = recordIter.next();
                const p = provIter.next();
                if (r.done || p.done) break;
                // Evaluated while this group's overrides are live, so ORDER BY
                // supports arbitrary expressions and not just bare aliases.
                this._orderBy?.captureSortKeys();
                results.push(r.value);
                provenance.push(p.value);
            }
        } else {
            for (const r of this._group_by.generate_results()) {
                this._orderBy?.captureSortKeys();
                results.push(r);
            }
        }
        let sorted = results;
        let sortedProv = provenance;
        if (this._orderBy !== null) {
            const indices = this._orderBy.sortIndices(results);
            sorted = indices.map((i) => results[i]);
            if (wantProvenance) {
                sortedProv = indices.map((i) => provenance[i]);
            }
        }
        if (this._limit !== null) {
            // Groups are never counted during accumulation, unlike per-row
            // RETURN, so LIMIT can only be applied here.
            sorted = sorted.slice(0, this._limit.limitValue);
            sortedProv = sortedProv.slice(0, this._limit.limitValue);
        }
        return { results: sorted, provenance: sortedProv };
    }
}

export default AggregatedReturn;
