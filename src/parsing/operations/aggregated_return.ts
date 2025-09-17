import Return from "./return";
import GroupBy from "./group_by";
import Expression from "../expressions/expression";

class AggregatedReturn extends Return {
    private _group_by: GroupBy = new GroupBy(this.children as Expression[]);
    public async run(): Promise<void> {
        await this._group_by.run();
    }
    public get results(): Record<string, any>[] {
        if(this._where !== null) {
            this._group_by.where = this._where;
        }
        return Array.from(this._group_by.generate_results());
    }
}

export default AggregatedReturn;