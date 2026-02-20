import Operation from "./operation";

export interface SortField {
    field: string;
    direction: "asc" | "desc";
}

/**
 * Represents an ORDER BY operation that sorts results.
 *
 * Can be attached to a RETURN operation (sorting its results),
 * or used as a standalone accumulating operation after a non-aggregate WITH.
 *
 * @example
 * ```
 * RETURN x ORDER BY x DESC
 * ```
 */
class OrderBy extends Operation {
    private _fields: SortField[];
    private _results: Record<string, any>[] = [];

    constructor(fields: SortField[]) {
        super();
        this._fields = fields;
    }

    public get fields(): SortField[] {
        return this._fields;
    }

    /**
     * Sorts an array of records according to the sort fields.
     */
    public sort(records: Record<string, any>[]): Record<string, any>[] {
        return records.sort((a, b) => {
            for (const { field, direction } of this._fields) {
                const aVal = a[field];
                const bVal = b[field];
                let cmp = 0;
                if (aVal == null && bVal == null) cmp = 0;
                else if (aVal == null) cmp = -1;
                else if (bVal == null) cmp = 1;
                else if (aVal < bVal) cmp = -1;
                else if (aVal > bVal) cmp = 1;
                if (cmp !== 0) {
                    return direction === "desc" ? -cmp : cmp;
                }
            }
            return 0;
        });
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
        await this.next?.initialize();
    }

    public get results(): Record<string, any>[] {
        return this._results;
    }
}

export default OrderBy;
