import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Converts a value to a floating point number",
    category: "scalar",
    parameters: [
        {
            name: "value",
            description: "The value to convert to a float",
            type: "any",
        },
    ],
    output: {
        description: "The floating point representation of the value",
        type: "number",
        example: "3.14",
    },
    examples: ['RETURN toFloat("3.14")', "RETURN toFloat(42)", "RETURN toFloat(true)"],
})
class ToFloat extends Function {
    constructor() {
        super("tofloat");
        this._expectedParameterCount = 1;
    }

    public value(): any {
        const val = this.getChildren()[0].value();
        if (val === null || val === undefined) {
            return null;
        }
        if (typeof val === "boolean") {
            return val ? 1.0 : 0.0;
        }
        if (typeof val === "number") {
            return val;
        }
        if (typeof val === "string") {
            const trimmed = val.trim();
            const parsed = Number(trimmed);
            if (isNaN(parsed)) {
                throw new Error(`Cannot convert string "${val}" to float`);
            }
            return parsed;
        }
        throw new Error("toFloat() expects a number, string, or boolean");
    }
}

export default ToFloat;
