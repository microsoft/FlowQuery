import { RowProvenance } from "../../compute/provenance";
import Union from "./union";

/**
 * Represents a UNION ALL operation that concatenates results from two sub-queries
 * without removing duplicates.
 */
class UnionAll extends Union {
    protected combineWithProvenance(
        left: Record<string, any>[],
        right: Record<string, any>[]
    ): { rows: Record<string, any>[]; provenance: RowProvenance[] } {
        const wantProv = this._provenanceSink !== null;
        const leftProv = this._leftProvenance;
        const rightProv = this._rightProvenance;
        const provenance: RowProvenance[] = wantProv
            ? [...(leftProv ?? []), ...(rightProv ?? [])]
            : [];
        return { rows: [...left, ...right], provenance };
    }
}

export default UnionAll;
