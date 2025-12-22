import AggregateFunction from "./aggregate_function";
import ReducerElement from "./reducer_element";
import { FunctionDef } from "./function_metadata";

class SumReducerElement extends ReducerElement {
    private _value: any = null;
    public get value(): any {
        return this._value;
    }
    public set value(value: any) {
        if(this._value !== null) {
            this._value += value;
        } else {
            this._value = value;
        }
    }
}

@FunctionDef({
    description: "Calculates the sum of numeric values across grouped rows",
    category: "aggregate",
    parameters: [
        { name: "value", description: "Numeric value to sum", type: "number" }
    ],
    output: { description: "Sum of all values", type: "number", example: 150 },
    examples: ["WITH [1, 2, 3] AS nums UNWIND nums AS n RETURN sum(n)"]
})
class Sum extends AggregateFunction {
    constructor() {
        super("sum");
        this._expectedParameterCount = 1;
    }
    public reduce(element: SumReducerElement): void {
        element.value = this.firstChild().value();
    }
    public element(): SumReducerElement {
        return new SumReducerElement();
    }
}

export default Sum;