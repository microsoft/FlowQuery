import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Returns the last element of a list",
    category: "scalar",
    parameters: [
        {
            name: "list",
            description: "The list to get the last element from",
            type: "array",
        },
    ],
    output: {
        description: "The last element of the list",
        type: "any",
        example: "3",
    },
    examples: ["RETURN last([1, 2, 3])", "WITH ['a', 'b', 'c'] AS items RETURN last(items)"],
})
class Last extends Function {
    constructor() {
        super("last");
        this._expectedParameterCount = 1;
    }

    public value(): any {
        const val = this.getChildren()[0].value();
        if (val === null || val === undefined) {
            return null;
        }
        if (!Array.isArray(val)) {
            throw new Error("last() expects a list");
        }
        if (val.length === 0) {
            return null;
        }
        return val[val.length - 1];
    }
}

export default Last;
