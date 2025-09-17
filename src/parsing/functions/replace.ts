import Function from "./function";

class Replace extends Function {
    constructor() {
        super("replace");
        this._expectedParameterCount = 3;
    }
    public value(): any {
        const str = this.getChildren()[0].value();
        const search = this.getChildren()[1].value();
        const replacement = this.getChildren()[2].value();
        if (typeof str !== "string" || typeof search !== "string" || typeof replacement !== "string") {
            throw new Error("Invalid arguments for replace function");
        }
        return str.replace(new RegExp(search, "g"), replacement);
    }
}

export default Replace;