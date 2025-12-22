import AggregateFunction from "./aggregate_function";
import ASTNode from "../ast_node";
import ReducerElement from "./reducer_element";
import { FunctionDef } from "./function_metadata";

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

@FunctionDef({
    description: "Calculates the average of numeric values across grouped rows",
    category: "aggregate",
    parameters: [
        { name: "value", description: "Numeric value to average", type: "number" }
    ],
    output: { description: "Average of all values", type: "number", example: 50 },
    examples: ["WITH [10, 20, 30] AS nums UNWIND nums AS n RETURN avg(n)"]
})
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