import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Generates an array of sequential integers",
    category: "scalar",
    parameters: [
        { name: "start", description: "Starting number (inclusive)", type: "number" },
        { name: "end", description: "Ending number (inclusive)", type: "number" }
    ],
    output: { description: "Array of integers from start to end", type: "array", items: { type: "number" }, example: [1, 2, 3, 4, 5] },
    examples: ["WITH range(1, 5) AS nums RETURN nums"]
})
class Range extends Function {
    constructor() {
        super("range");
        this._expectedParameterCount = 2;
    }
    public value(): any {
        const start = this.getChildren()[0].value();
        const end = this.getChildren()[1].value();
        if (typeof start !== "number" || typeof end !== "number") {
            throw new Error("Invalid arguments for range function");
        }
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }
}

export default Range;