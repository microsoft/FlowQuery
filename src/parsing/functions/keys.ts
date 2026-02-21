import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Returns the keys of an object (associative array) as an array",
    category: "scalar",
    parameters: [{ name: "object", description: "Object to extract keys from", type: "object" }],
    output: { description: "Array of keys", type: "array", example: "['name', 'age']" },
    examples: ["WITH { name: 'Alice', age: 30 } AS obj RETURN keys(obj)"],
})
class Keys extends Function {
    constructor() {
        super("keys");
        this._expectedParameterCount = 1;
    }

    public value(): any {
        const obj = this.getChildren()[0].value();
        if (obj === null || obj === undefined) {
            return null;
        }
        if (typeof obj !== "object" || Array.isArray(obj)) {
            throw new Error("keys() expects an object, not an array or primitive");
        }
        return Object.keys(obj);
    }
}

export default Keys;
