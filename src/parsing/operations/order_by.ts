import Expression from "../expressions/expression";
import Reference from "../expressions/reference";
import Operation from "./operation";

export interface SortField {
    direction: "asc" | "desc";
    /** The parsed expression to evaluate for this sort field. */
    expression: Expression;
}

/**
 * Represents an ORDER BY operation that sorts results.
 *
 * Can be attached to a RETURN operation (sorting its results),
 * or used as a standalone accumulating operation after a non-aggregate WITH.
 *
 * Supports both simple field references and arbitrary expressions:
 * @example
 * ```
 * RETURN x ORDER BY x DESC
 * RETURN x ORDER BY toLower(x.name) ASC
 * RETURN x ORDER BY string_distance(toLower(x.name), toLower('Thomas')) ASC
 * ```
 */
class OrderBy extends Operation {
    private _fields: SortField[];
    private _results: Record<string, any>[] = [];
    /**
     * Parallel array of pre-computed sort-key tuples, one entry per
     * accumulated result row.  Each inner array has one value per sort
     * field, in the same order as `_fields`.
     */
    private _sortKeys: any[][] = [];

    constructor(fields: SortField[]) {
        super();
        this._fields = fields;
    }

    public get fields(): SortField[] {
        return this._fields;
    }

    /**
     * Evaluates every sort-field expression against the current runtime
     * context and stores the resulting values.  Must be called once per
     * accumulated row (from `Return.run()`).
     */
    public captureSortKeys(): void {
        this._sortKeys.push(this._fields.map((f) => f.expression.value()));
    }

    /**
     * Sorts an array of records using the pre-computed sort keys captured
     * during accumulation.  When no keys have been captured (e.g.
     * aggregated returns), falls back to looking up simple reference
     * identifiers in each record.
     */
    public sort(records: Record<string, any>[]): Record<string, any>[] {
        const useKeys = this._sortKeys.length === records.length;
        // Build an index array so we can sort records and keys together.
        const indices = records.map((_, i) => i);
        const keys = this._sortKeys;

        // Pre-compute fallback field names for when sort keys aren't
        // available (aggregated returns).  Simple references like `x`
        // map to the column name; complex expressions have no fallback.
        const fallbackFields: (string | null)[] = this._fields.map((f) => {
            const root = f.expression.firstChild();
            if (root instanceof Reference && f.expression.childCount() === 1) {
                return (root as Reference).identifier;
            }
            return null;
        });

        indices.sort((ai, bi) => {
            for (let f = 0; f < this._fields.length; f++) {
                let aVal: any;
                let bVal: any;
                if (useKeys) {
                    aVal = keys[ai][f];
                    bVal = keys[bi][f];
                } else if (fallbackFields[f] !== null) {
                    aVal = records[ai][fallbackFields[f]!];
                    bVal = records[bi][fallbackFields[f]!];
                } else {
                    continue;
                }
                let cmp = 0;
                if (aVal == null && bVal == null) cmp = 0;
                else if (aVal == null) cmp = -1;
                else if (bVal == null) cmp = 1;
                else if (aVal < bVal) cmp = -1;
                else if (aVal > bVal) cmp = 1;
                if (cmp !== 0) {
                    return this._fields[f].direction === "desc" ? -cmp : cmp;
                }
            }
            return 0;
        });
        return indices.map((i) => records[i]);
    }

    /**
     * When used as a standalone operation (after non-aggregate WITH),
     * accumulates records to sort later.
     */
    public async run(): Promise<void> {
        const record: Record<string, any> = {};
        // Collect current variable values from the context
        // This gets called per-row, and then finish() sorts and emits
        await this.next?.run();
    }

    public async initialize(): Promise<void> {
        this._results = [];
        this._sortKeys = [];
        await this.next?.initialize();
    }

    public get results(): Record<string, any>[] {
        return this._results;
    }
}

export default OrderBy;
