import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Returns the natural logarithm (base e) of a number",
    category: "scalar",
    parameters: [
        { name: "value", description: "Number to take the natural logarithm of", type: "number" },
    ],
    output: {
        description: "Natural logarithm of the input",
        type: "number",
        example: 2.302585092994046,
    },
    examples: ["WITH 10 AS n RETURN log(n)"],
})
class Log extends Function {
    constructor() {
        super("log");
        this._expectedParameterCount = 1;
    }
    public value(): any {
        const value = this.getChildren()[0].value();
        if (value === null || value === undefined) {
            return null;
        }
        if (typeof value !== "number") {
            throw new Error("Invalid argument for log function");
        }
        return Math.log(value);
    }
}

export default Log;
