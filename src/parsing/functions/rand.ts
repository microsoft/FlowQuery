import Function from "./function";

class Rand extends Function {
    constructor() {
        super("rand");
        this._expectedParameterCount = 0;
    }
    public value(): any {
        return Math.random();
    }
}

export default Rand;