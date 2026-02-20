import Limit from "./limit";
import OrderBy from "./order_by";
import Projection from "./projection";
import Where from "./where";

/**
 * Represents a RETURN operation that produces the final query results.
 *
 * The RETURN operation evaluates expressions and collects them into result records.
 * It can optionally have a WHERE clause to filter results.
 *
 * @example
 * ```typescript
 * // RETURN x, y WHERE x > 0
 * ```
 */
class Return extends Projection {
    protected _where: Where | null = null;
    protected _results: Record<string, any>[] = [];
    private _limit: Limit | null = null;
    protected _orderBy: OrderBy | null = null;
    public set where(where: Where) {
        this._where = where;
    }
    public get where(): boolean {
        if (this._where === null) {
            return true;
        }
        return this._where.value();
    }
    public set limit(limit: Limit) {
        this._limit = limit;
    }
    public set orderBy(orderBy: OrderBy) {
        this._orderBy = orderBy;
    }
    public async run(): Promise<void> {
        if (!this.where) {
            return;
        }
        // When ORDER BY is present, skip limit during accumulation;
        // limit will be applied after sorting in get results()
        if (this._orderBy === null && this._limit !== null && this._limit.isLimitReached) {
            return;
        }
        const record: Map<string, any> = new Map();
        for (const [expression, alias] of this.expressions()) {
            const raw = expression.value();
            const value: any = typeof raw === "object" && raw !== null ? structuredClone(raw) : raw;
            record.set(alias, value);
        }
        this._results.push(Object.fromEntries(record));
        if (this._orderBy === null && this._limit !== null) {
            this._limit.increment();
        }
    }
    public async initialize(): Promise<void> {
        this._results = [];
    }
    public get results(): Record<string, any>[] {
        let results = this._results;
        if (this._orderBy !== null) {
            results = this._orderBy.sort(results);
        }
        if (this._orderBy !== null && this._limit !== null) {
            results = results.slice(0, this._limit.limitValue);
        }
        return results;
    }
}

export default Return;
