import { ProvenanceSource, RowProvenance } from "../../compute/provenance";
import Expression from "../expressions/expression";
import GroupBy from "./group_by";
import Operation from "./operation";
import Return from "./return";

class AggregatedReturn extends Return {
    private _group_by: GroupBy = new GroupBy(this.children as Expression[]);
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
        if (this._where !== null) {
            this._group_by.where = this._where;
        }
        const results: Record<string, any>[] = [];
        const provenance: RowProvenance[] = [];
        // Emit a provenance entry per result row whenever a sink is
        // registered, even if no provenance sources were attached (e.g.
        // `RETURN count(*)` over no MATCH).  This keeps
        // `runner.provenance.length === runner.results.length`.
        const wantProvenance = this._provenanceSink !== null;
        if (wantProvenance) {
            const recordIter = this._group_by.generate_results();
            const provIter = this._group_by.generate_provenance();
            while (true) {
                const r = recordIter.next();
                const p = provIter.next();
                if (r.done || p.done) break;
                results.push(r.value);
                provenance.push(p.value);
            }
        } else {
            for (const r of this._group_by.generate_results()) results.push(r);
        }
        if (this._orderBy !== null) {
            const indices = this._orderBy.sortIndices(results);
            const sorted = indices.map((i) => results[i]);
            const sortedProv = wantProvenance ? indices.map((i) => provenance[i]) : provenance;
            return { results: sorted, provenance: sortedProv };
        }
        return { results, provenance };
    }
}

export default AggregatedReturn;
