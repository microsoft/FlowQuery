import AggregateFunction from "./aggregate_function";
import ReducerElement from "./reducer_element";

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