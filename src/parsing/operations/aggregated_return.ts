import Expression from "../expressions/expression";
import GroupBy from "./group_by";
import Return from "./return";

class AggregatedReturn extends Return {
    private _group_by: GroupBy = new GroupBy(this.children as Expression[]);
    public async run(): Promise<void> {
        await this._group_by.run();
    }
    public get results(): Record<string, any>[] {
        if (this._where !== null) {
            this._group_by.where = this._where;
        }
        const results = Array.from(this._group_by.generate_results());
        if (this._orderBy !== null) {
            return this._orderBy.sort(results);
        }
        return results;
    }
}

export default AggregatedReturn;
