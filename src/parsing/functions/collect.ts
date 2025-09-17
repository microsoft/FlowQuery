import AggregateFunction from "./aggregate_function";
import ReducerElement from "./reducer_element";

class CollectReducerElement extends ReducerElement {
    private _value: any[] = [];
    public get value(): any {
        return this._value;
    }
    public set value(value: any) {
        this._value.push(value);
    }
}

class DistinctCollectReducerElement extends ReducerElement {
    private _value: Map<any, any> = new Map();
    public get value(): any {
        return Array.from(this._value.values());
    }
    public set value(value: any) {
        const key: string = JSON.stringify(value);
        if (!this._value.has(key)) {
            this._value.set(key, value);
        }
    }
}

class Collect extends AggregateFunction {
    private _distinct: boolean = false;
    constructor() {
        super("collect");
        this._expectedParameterCount = 1;
    }
    public reduce(element: CollectReducerElement): void {
        element.value = this.firstChild().value();
    }
    public element(): CollectReducerElement | DistinctCollectReducerElement {
        return this._distinct ? new DistinctCollectReducerElement() : new CollectReducerElement();
    }
    public set distinct(distinct: boolean) {
        this._distinct = distinct;
    }
}

export default Collect;