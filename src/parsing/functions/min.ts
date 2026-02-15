import AggregateFunction from "./aggregate_function";
import { FunctionDef } from "./function_metadata";
import ReducerElement from "./reducer_element";

class MinReducerElement extends ReducerElement {
    private _value: any = null;
    public get value(): any {
        return this._value;
    }
    public set value(value: any) {
        if (this._value === null || value < this._value) {
            this._value = value;
        }
    }
}

@FunctionDef({
    description: "Returns the minimum value across grouped rows",
    category: "aggregate",
    parameters: [{ name: "value", description: "Value to compare", type: "number" }],
    output: { description: "Minimum value", type: "number", example: 1 },
    examples: ["WITH [3, 1, 2] AS nums UNWIND nums AS n RETURN min(n)"],
})
class Min extends AggregateFunction {
    constructor() {
        super("min");
        this._expectedParameterCount = 1;
    }
    public reduce(element: MinReducerElement): void {
        element.value = this.firstChild().value();
    }
    public element(): MinReducerElement {
        return new MinReducerElement();
    }
}

export default Min;
