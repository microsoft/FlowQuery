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
    public set where(where: Where) {
        this._where = where;
    }
    public get where(): boolean {
        if (this._where === null) {
            return true;
        }
        return this._where.value();
    }
    public async run(): Promise<void> {
        if (!this.where) {
            return;
        }
        const record: Map<string, any> = new Map();
        for (const [expression, alias] of this.expressions()) {
            const raw = expression.value();
            const value: any = typeof raw === "object" && raw !== null ? structuredClone(raw) : raw;
            record.set(alias, value);
        }
        this._results.push(Object.fromEntries(record));
    }
    public async initialize(): Promise<void> {
        this._results = [];
    }
    public get results(): Record<string, any>[] {
        return this._results;
    }
}

export default Return;
