import AggregateFunction from "./aggregate_function";
import ASTNode from "../ast_node";
import ReducerElement from "./reducer_element";

class AvgReducerElement extends ReducerElement {
    private _count: number = 0;
    private _sum: number | null = null;
    public get value(): number | null {
        if(this._sum === null) {
            return null;
        }
        return this._sum / this._count;
    }
    public set value(value: number) {
        this._count += 1;
        if(this._sum !== null) {
            this._sum += value;
        } else {
            this._sum = value;
        }
    }
}

class Avg extends AggregateFunction {
    constructor() {
        super("avg");
        this._expectedParameterCount = 1;
    }
    public reduce(element: AvgReducerElement): void {
        element.value = this.firstChild().value();
    }
    public element(): AvgReducerElement {
        return new AvgReducerElement();
    }
}

export default Avg;