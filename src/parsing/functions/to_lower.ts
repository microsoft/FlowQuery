import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Converts a string to lowercase",
    category: "scalar",
    parameters: [{ name: "text", description: "String to convert to lowercase", type: "string" }],
    output: { description: "Lowercase string", type: "string", example: "hello world" },
    examples: ["WITH 'Hello World' AS s RETURN toLower(s)", "WITH 'FOO' AS s RETURN toLower(s)"],
})
class ToLower extends Function {
    constructor() {
        super("tolower");
        this._expectedParameterCount = 1;
    }
    public value(): any {
        const val = this.getChildren()[0].value();
        if (typeof val !== "string") {
            throw new Error("Invalid argument for toLower function: expected a string");
        }
        return val.toLowerCase();
    }
}

export default ToLower;
