/**
 * Test utilities: ready-made in-memory source providers.
 *
 * These are not part of the public API.  They back FlowQuery's own test
 * suites (and the `mockbackend` test function); applications define
 * sources declaratively instead, e.g.
 * `CREATE VIRTUAL (:Person) WITH CAPABILITIES {lookup: true} AS { UNWIND $people AS p RETURN p.id AS id, p.name AS name }`.
 *
 * @internal
 */
import {
    NodeSourceCapabilities,
    NodeSourceProvider,
    PREDICATE_OPERATORS,
    RelationshipSourceCapabilities,
    RelationshipSourceProvider,
    SOURCE_CONTRACT_VERSION,
    SourcePredicate,
    SourceRow,
    matchesPredicate,
} from "./source_provider";

/** Options for {@link inMemoryNodeSource} and {@link inMemoryRelationshipSource}. */
export interface InMemorySourceOptions {
    /** Declare the source cacheable (default `true`). */
    cacheable?: boolean;
    /** Maximum ids per lookup/expand request (default: unlimited). */
    maxBatchSize?: number;
}

function* pagesOf(rows: SourceRow[], pageSize: number): Iterable<SourceRow[]> {
    const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : rows.length || 1;
    for (let i = 0; i < rows.length; i += size) {
        yield rows.slice(i, i + size);
    }
}

function filterRows(
    rows: SourceRow[],
    predicate: SourcePredicate | null,
    field: string | null,
    ids: any[] | null
): SourceRow[] {
    const wanted = ids === null ? null : new Set(ids);
    return rows.filter(
        (row) =>
            (wanted === null || (field !== null && wanted.has(row[field]))) &&
            matchesPredicate(predicate, row)
    );
}

function inMemoryCapabilities(options: InMemorySourceOptions): Record<string, any> {
    const caps: Record<string, any> = {
        version: SOURCE_CONTRACT_VERSION,
        cacheable: options.cacheable ?? true,
        streaming: true,
        predicates: { operators: [...PREDICATE_OPERATORS], stringOrdering: "binary" },
    };
    if (options.maxBatchSize !== undefined) caps.maxBatchSize = options.maxBatchSize;
    return caps;
}

/**
 * A ready-made node source over an in-memory array of rows (each with an
 * `id`).  It supports lookup, every predicate operator and paging, which
 * makes it handy for tests.  The
 * array is read on every request, so later mutations are visible.
 *
 * @example
 * ```typescript
 * Database.getInstance().registerNodeSource("Person", inMemoryNodeSource([{ id: 1, name: "Ada" }]));
 * ```
 */
export function inMemoryNodeSource(
    rows: SourceRow[],
    options: InMemorySourceOptions = {}
): NodeSourceProvider {
    return {
        capabilities: { ...inMemoryCapabilities(options), lookup: true } as NodeSourceCapabilities,
        scan: (req) => pagesOf(filterRows(rows, req.predicate, null, null), req.pageSize),
        lookup: (req) => pagesOf(filterRows(rows, req.predicate, "id", req.ids), req.pageSize),
    };
}

/**
 * A ready-made relationship source over an in-memory array of rows (each
 * with `left_id` and `right_id`), supporting expansion from both sides.
 *
 * @example
 * ```typescript
 * Database.getInstance().registerRelationshipSource(
 *     "KNOWS", "Person", "Person",
 *     inMemoryRelationshipSource([{ left_id: 1, right_id: 2, since: 2020 }])
 * );
 * ```
 */
export function inMemoryRelationshipSource(
    rows: SourceRow[],
    options: InMemorySourceOptions = {}
): RelationshipSourceProvider {
    return {
        capabilities: {
            ...inMemoryCapabilities(options),
            expand: { left: true, right: true },
        } as RelationshipSourceCapabilities,
        scan: (req) => pagesOf(filterRows(rows, req.predicate, null, null), req.pageSize),
        expand: (req) =>
            pagesOf(
                filterRows(
                    rows,
                    req.predicate,
                    req.side === "left" ? "left_id" : "right_id",
                    req.ids
                ),
                req.pageSize
            ),
    };
}
