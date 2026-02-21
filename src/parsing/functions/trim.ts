import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Removes leading and trailing whitespace from a string",
    category: "scalar",
    parameters: [{ name: "text", description: "String to trim", type: "string" }],
    output: { description: "Trimmed string", type: "string", example: "hello" },
    examples: ["WITH '  hello  ' AS s RETURN trim(s)", "WITH '\\tfoo\\n' AS s RETURN trim(s)"],
})
class Trim extends Function {
    constructor() {
        super("trim");
        this._expectedParameterCount = 1;
    }
    public value(): any {
        const val = this.getChildren()[0].value();
        if (val === null || val === undefined) {
            return null;
        }
        if (typeof val !== "string") {
            throw new Error("Invalid argument for trim function: expected a string");
        }
        return val.trim();
    }
}

export default Trim;
