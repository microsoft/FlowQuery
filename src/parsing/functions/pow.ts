import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Returns the value of a number raised to the power of another number",
    category: "scalar",
    parameters: [
        { name: "base", description: "The base number", type: "number" },
        { name: "exponent", description: "The exponent to raise the base to", type: "number" },
    ],
    output: { description: "base raised to the power of exponent", type: "number", example: 8 },
    examples: ["WITH 2 AS b, 3 AS e RETURN pow(b, e)"],
})
class Pow extends Function {
    constructor() {
        super("pow");
        this._expectedParameterCount = 2;
    }
    public value(): any {
        const base = this.getChildren()[0].value();
        const exponent = this.getChildren()[1].value();
        if (base === null || base === undefined || exponent === null || exponent === undefined) {
            return null;
        }
        if (typeof base !== "number" || typeof exponent !== "number") {
            throw new Error("Invalid arguments for pow function");
        }
        return Math.pow(base, exponent);
    }
}

export default Pow;
