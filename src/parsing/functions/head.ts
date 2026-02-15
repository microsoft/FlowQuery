import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Returns the first element of a list",
    category: "scalar",
    parameters: [
        {
            name: "list",
            description: "The list to get the first element from",
            type: "array",
        },
    ],
    output: {
        description: "The first element of the list",
        type: "any",
        example: "1",
    },
    examples: ["RETURN head([1, 2, 3])", "WITH ['a', 'b', 'c'] AS items RETURN head(items)"],
})
class Head extends Function {
    constructor() {
        super("head");
        this._expectedParameterCount = 1;
    }

    public value(): any {
        const val = this.getChildren()[0].value();
        if (val === null || val === undefined) {
            return null;
        }
        if (!Array.isArray(val)) {
            throw new Error("head() expects a list");
        }
        if (val.length === 0) {
            return null;
        }
        return val[0];
    }
}

export default Head;
