import Function from "./function";

class Size extends Function {
    constructor() {
        super("size");
        this._expectedParameterCount = 1;
    }
    public value(): any {
        const arr = this.getChildren()[0].value();
        if (!Array.isArray(arr)) {
            throw new Error("Invalid argument for size function");
        }
        return arr.length;
    }
}

export default Size;