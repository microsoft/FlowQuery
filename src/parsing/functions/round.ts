import Function from "./function";

class Round extends Function {
    constructor() {
        super("round");
        this._expectedParameterCount = 1;
    }
    public value(): any {
        const value = this.getChildren()[0].value();
        if (typeof value !== "number") {
            throw new Error("Invalid argument for round function");
        }
        return Math.round(value);
    }
}

export default Round;