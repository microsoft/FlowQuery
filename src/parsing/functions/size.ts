import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Returns the length of an array or string",
    category: "scalar",
    parameters: [{ name: "value", description: "Array or string to measure", type: "array" }],
    output: { description: "Length of the input", type: "number", example: 3 },
    examples: ["WITH [1, 2, 3] AS arr RETURN size(arr)"],
})
class Size extends Function {
    constructor() {
        super("size");
        this._expectedParameterCount = 1;
    }
    public value(): any {
        const arr = this.getChildren()[0].value();
        if (arr === null || arr === undefined) {
            return null;
        }
        if (!Array.isArray(arr)) {
            throw new Error("Invalid argument for size function");
        }
        return arr.length;
    }
}

export default Size;
