import With from "./return";
import GroupBy from "./group_by";
import Expression from "../expressions/expression";

class AggregatedWith extends With {
    private _group_by: GroupBy = new GroupBy(this.children as Expression[]);
    public async run(): Promise<void> {
        await this._group_by.run();
    }
    public async finish(): Promise<void> {
        for(const _ of this._group_by.generate_results()) {
            await this.next?.run();
        }
        await super.finish();
    }
}

export default AggregatedWith;