import { ProvenanceSource, RowProvenance } from "../../compute/provenance";
import Expression from "../expressions/expression";
import GroupBy from "./group_by";
import With from "./return";

class AggregatedWith extends With {
    private _group_by: GroupBy = new GroupBy(this.children as Expression[]);
    /**
     * Iterator over the per-group provenance produced by `_group_by`.
     * Advanced in lockstep with `generate_results()` inside `finish()` so
     * that `_currentGroupProvenance` always reflects the group whose row
     * the downstream pipeline is about to project.
     */
    private _currentGroupProvenance: RowProvenance | null = null;
    public async run(): Promise<void> {
        await this._group_by.run();
    }
    /**
     * Forward upstream provenance sources into the embedded `GroupBy`
     * so each group accumulates the union of contributing bindings.
     */
    public addProvenanceSource(source: ProvenanceSource): void {
        this._group_by.addProvenanceSource(source);
    }
    /**
     * Expose this aggregation as a downstream provenance source.  When
     * the downstream pipeline projects a row, it snapshots us and
     * receives the pre-computed provenance for the group currently being
     * flushed by `finish()`.
     */
    public asProvenanceSource(): ProvenanceSource {
        return {
            snapshot: (): RowProvenance =>
                this._currentGroupProvenance ?? { nodes: [], relationships: [], rows: [] },
        };
    }
    public async finish(): Promise<void> {
        const wantProvenance = this._group_by.provenanceEnabled;
        const provIter = wantProvenance ? this._group_by.generate_provenance() : null;
        for (const _ of this._group_by.generate_results()) {
            if (provIter !== null) {
                const next = provIter.next();
                this._currentGroupProvenance = next.done ? null : next.value;
            }
            await this.next?.run();
        }
        this._currentGroupProvenance = null;
        await super.finish();
    }
}

export default AggregatedWith;
