import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Returns the type of a value as a string",
    category: "scalar",
    parameters: [
        { name: "value", description: "Value to check the type of", type: "any" }
    ],
    output: { description: "Type of the input value", type: "string", example: "string" },
    examples: [
        "WITH 'hello' AS val RETURN type(val)",
        "WITH 42 AS val RETURN type(val)",
        "WITH [1, 2, 3] AS val RETURN type(val)"
    ]
})
class Type extends Function {
    constructor() {
        super("type");
        this._expectedParameterCount = 1;
    }

    public value(): any {
        const val = this.getChildren()[0].value();
        
        if (val === null) {
            return "null";
        }
        if (val === undefined) {
            return "undefined";
        }
        if (Array.isArray(val)) {
            return "array";
        }
        return typeof val;
    }
}

export default Type;
