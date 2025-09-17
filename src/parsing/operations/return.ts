import Projection from "./projection";
import Where from "./where";

class Return extends Projection {
    protected _where: Where | null = null;
    protected _results: Record<string, any>[] = [];
    public set where(where: Where) {
        this._where = where;
    }
    public get where(): boolean {
        if(this._where === null) {
            return true;
        }
        return this._where.value();
    }
    public async run(): Promise<void> {
        if(!this.where) {
            return;
        }
        const record: Map<string, any> = new Map();
        for(const [expression, alias] of this.expressions()) {
            const value: any = expression.value();
            record.set(alias, value);
        }
        this._results.push(Object.fromEntries(record));
    }
    public get results(): Record<string, any>[] {
        return this._results;
    }
}

export default Return;