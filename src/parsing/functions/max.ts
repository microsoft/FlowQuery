import AggregateFunction from "./aggregate_function";
import { FunctionDef } from "./function_metadata";
import ReducerElement from "./reducer_element";

class MaxReducerElement extends ReducerElement {
    private _value: any = null;
    public get value(): any {
        return this._value;
    }
    public set value(value: any) {
        if (this._value === null || value > this._value) {
            this._value = value;
        }
    }
}

@FunctionDef({
    description: "Returns the maximum value across grouped rows",
    category: "aggregate",
    parameters: [{ name: "value", description: "Value to compare", type: "number" }],
    output: { description: "Maximum value", type: "number", example: 10 },
    examples: ["WITH [3, 1, 2] AS nums UNWIND nums AS n RETURN max(n)"],
})
class Max extends AggregateFunction {
    constructor() {
        super("max");
        this._expectedParameterCount = 1;
    }
    public reduce(element: MaxReducerElement): void {
        element.value = this.firstChild().value();
    }
    public element(): MaxReducerElement {
        return new MaxReducerElement();
    }
}

export default Max;
