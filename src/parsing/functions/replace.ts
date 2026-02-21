import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Replaces occurrences of a pattern in a string",
    category: "scalar",
    parameters: [
        { name: "text", description: "Source string", type: "string" },
        { name: "pattern", description: "Pattern to find", type: "string" },
        { name: "replacement", description: "Replacement string", type: "string" },
    ],
    output: { description: "String with replacements", type: "string", example: "hello world" },
    examples: ["WITH 'hello there' AS s RETURN replace(s, 'there', 'world')"],
})
class Replace extends Function {
    constructor() {
        super("replace");
        this._expectedParameterCount = 3;
    }
    public value(): any {
        const str = this.getChildren()[0].value();
        const search = this.getChildren()[1].value();
        const replacement = this.getChildren()[2].value();
        if (str === null || str === undefined) {
            return null;
        }
        if (
            typeof str !== "string" ||
            typeof search !== "string" ||
            typeof replacement !== "string"
        ) {
            throw new Error("Invalid arguments for replace function");
        }
        return str.replace(new RegExp(search, "g"), replacement);
    }
}

export default Replace;
