import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Converts a value to an integer",
    category: "scalar",
    parameters: [
        {
            name: "value",
            description: "The value to convert to an integer",
            type: "any",
        },
    ],
    output: {
        description: "The integer representation of the value",
        type: "number",
        example: "42",
    },
    examples: ['RETURN toInteger("42")', "RETURN toInteger(3.14)", "RETURN toInteger(true)"],
})
class ToInteger extends Function {
    constructor() {
        super("tointeger");
        this._expectedParameterCount = 1;
    }

    public value(): any {
        const val = this.getChildren()[0].value();
        if (val === null || val === undefined) {
            return null;
        }
        if (typeof val === "boolean") {
            return val ? 1 : 0;
        }
        if (typeof val === "number") {
            return Math.trunc(val);
        }
        if (typeof val === "string") {
            const trimmed = val.trim();
            const parsed = Number(trimmed);
            if (isNaN(parsed)) {
                throw new Error(`Cannot convert string "${val}" to integer`);
            }
            return Math.trunc(parsed);
        }
        throw new Error("toInteger() expects a number, string, or boolean");
    }
}

export default ToInteger;
