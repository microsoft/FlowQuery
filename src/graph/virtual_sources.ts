/**
 * Module-level back-reference from a virtual node / relationship record
 * (or `RelationshipMatchRecord`) to the inner-runner `RowProvenance` that
 * produced it.
 *
 * Used by deep-mode provenance to thread lineage from a `CREATE VIRTUAL
 * (:X) AS { ... }` sub-query into the outer query's row-level bindings.
 *
 * Decoupled from `compute/provenance` to keep the graph layer free of
 * compute imports — the value is typed as `unknown` here and re-cast by
 * the snapshot code that consumes it.
 */
const virtualSources: WeakMap<object, unknown> = new WeakMap();

/** Register a virtual-sourced record with its inner provenance row. */
export function attachVirtualSource(record: object, prov: unknown): void {
    virtualSources.set(record, prov);
}

/**
 * Look up the inner provenance for a record / match object.  Returns
 * `undefined` if the value did not originate from a deep-mode virtual.
 */
export function getVirtualSource(record: object | null | undefined): unknown | undefined {
    if (record == null) return undefined;
    return virtualSources.get(record);
}
