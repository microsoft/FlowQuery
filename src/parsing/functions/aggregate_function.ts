import Function from "./function";
import ReducerElement from "./reducer_element";

class AggregateFunction extends Function {
    private _overridden: any | null = null;
    constructor(name: string) {
        super(name);
    }
    public reduce(value: ReducerElement): void {
        throw new Error("Method not implemented.");
    }
    public element(): ReducerElement {
        throw new Error("Method not implemented.");
    }
    public get overridden(): any | null {
        return this._overridden;
    }
    public set overridden(value: any | null) {
        this._overridden = value;
    }
    public value(): any {
        return this._overridden;
    }
}

export default AggregateFunction;