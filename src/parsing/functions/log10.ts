import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Returns the base-10 logarithm of a number",
    category: "scalar",
    parameters: [
        { name: "value", description: "Number to take the base-10 logarithm of", type: "number" },
    ],
    output: { description: "Base-10 logarithm of the input", type: "number", example: 3 },
    examples: ["WITH 1000 AS n RETURN log10(n)"],
})
class Log10 extends Function {
    constructor() {
        super("log10");
        this._expectedParameterCount = 1;
    }
    public value(): any {
        const value = this.getChildren()[0].value();
        if (value === null || value === undefined) {
            return null;
        }
        if (typeof value !== "number") {
            throw new Error("Invalid argument for log10 function");
        }
        return Math.log10(value);
    }
}

export default Log10;
