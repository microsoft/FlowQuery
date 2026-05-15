import { ProvenanceSites, RowProvenance } from "../../compute/provenance";
import Expression from "../expressions/expression";
import GroupBy from "./group_by";
import Operation from "./operation";
import Return from "./return";

class AggregatedReturn extends Return {
    private _group_by: GroupBy = new GroupBy(this.children as Expression[]);
    public async run(): Promise<void> {
        await this._group_by.run();
    }
    public enableProvenance(sites: ProvenanceSites, sink: RowProvenance[]): void {
        super.enableProvenance(sites, sink);
        this._group_by.enableProvenance(sites);
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
        const wantProvenance = this._group_by.provenanceEnabled;
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
