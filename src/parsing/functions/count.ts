import AggregateFunction from "./aggregate_function";
import { FunctionDef } from "./function_metadata";
import ReducerElement from "./reducer_element";

class CountReducerElement extends ReducerElement {
    private _value: number = 0;
    public get value(): any {
        return this._value;
    }
    public set value(value: any) {
        this._value += 1;
    }
}

class DistinctCountReducerElement extends ReducerElement {
    private _seen: Set<string> = new Set();
    public get value(): any {
        return this._seen.size;
    }
    public set value(value: any) {
        const key: string = JSON.stringify(value);
        this._seen.add(key);
    }
}

@FunctionDef({
    description: "Counts the number of values across grouped rows",
    category: "aggregate",
    parameters: [{ name: "value", description: "Value to count", type: "any" }],
    output: { description: "Number of values", type: "number", example: 3 },
    examples: [
        "WITH [1, 2, 3] AS nums UNWIND nums AS n RETURN count(n)",
        "WITH [1, 2, 2, 3] AS nums UNWIND nums AS n RETURN count(distinct n)",
    ],
})
class Count extends AggregateFunction {
    private _distinct: boolean = false;
    constructor() {
        super("count");
        this._expectedParameterCount = 1;
        this._supports_distinct = true;
    }
    public reduce(element: CountReducerElement | DistinctCountReducerElement): void {
        element.value = this.firstChild().value();
    }
    public element(): CountReducerElement | DistinctCountReducerElement {
        return this._distinct ? new DistinctCountReducerElement() : new CountReducerElement();
    }
    public set distinct(distinct: boolean) {
        this._distinct = distinct;
    }
}

export default Count;
