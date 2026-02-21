import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Converts a value to its string representation",
    category: "scalar",
    parameters: [{ name: "value", description: "Value to convert to a string", type: "any" }],
    output: { description: "String representation of the value", type: "string", example: "42" },
    examples: [
        "WITH 42 AS n RETURN toString(n)",
        "WITH true AS b RETURN toString(b)",
        "WITH [1, 2, 3] AS arr RETURN toString(arr)",
    ],
})
class ToString extends Function {
    constructor() {
        super("tostring");
        this._expectedParameterCount = 1;
    }
    public value(): any {
        const val = this.getChildren()[0].value();
        if (val === null || val === undefined) {
            return null;
        }
        if (typeof val === "object") {
            return JSON.stringify(val);
        }
        return String(val);
    }
}

export default ToString;
