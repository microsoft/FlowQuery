import Function from "./function";

class Range extends Function {
    constructor() {
        super("range");
        this._expectedParameterCount = 2;
    }
    public value(): any {
        const start = this.getChildren()[0].value();
        const end = this.getChildren()[1].value();
        if (typeof start !== "number" || typeof end !== "number") {
            throw new Error("Invalid arguments for range function");
        }
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }
}

export default Range;