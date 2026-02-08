import Union from "./union";

/**
 * Represents a UNION ALL operation that concatenates results from two sub-queries
 * without removing duplicates.
 */
class UnionAll extends Union {
    protected combine(
        left: Record<string, any>[],
        right: Record<string, any>[]
    ): Record<string, any>[] {
        return [...left, ...right];
    }
}

export default UnionAll;
