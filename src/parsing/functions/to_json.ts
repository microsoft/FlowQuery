import Function from "./function";

class ToJson extends Function {
    constructor() {
        super("tojson");
        this._expectedParameterCount = 1;
    }
    public value(): any {
        const str = this.getChildren()[0].value();
        if (typeof str !== "string") {
            throw new Error("Invalid arguments for tojson function");
        }
        return JSON.parse(str);
    }
}

export default ToJson;