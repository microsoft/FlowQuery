import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Rounds a number to the nearest integer",
    category: "scalar",
    parameters: [{ name: "value", description: "Number to round", type: "number" }],
    output: { description: "Rounded integer", type: "number", example: 4 },
    examples: ["WITH 3.7 AS n RETURN round(n)"],
})
class Round extends Function {
    constructor() {
        super("round");
        this._expectedParameterCount = 1;
    }
    public value(): any {
        const value = this.getChildren()[0].value();
        if (value === null || value === undefined) {
            return null;
        }
        if (typeof value !== "number") {
            throw new Error("Invalid argument for round function");
        }
        return Math.round(value);
    }
}

export default Round;
