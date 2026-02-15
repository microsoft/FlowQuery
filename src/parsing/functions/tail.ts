import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Returns all elements of a list except the first",
    category: "scalar",
    parameters: [
        {
            name: "list",
            description: "The list to get all but the first element from",
            type: "array",
        },
    ],
    output: {
        description: "All elements except the first",
        type: "array",
        example: "[2, 3]",
    },
    examples: ["RETURN tail([1, 2, 3])", "WITH ['a', 'b', 'c'] AS items RETURN tail(items)"],
})
class Tail extends Function {
    constructor() {
        super("tail");
        this._expectedParameterCount = 1;
    }

    public value(): any {
        const val = this.getChildren()[0].value();
        if (val === null || val === undefined) {
            return null;
        }
        if (!Array.isArray(val)) {
            throw new Error("tail() expects a list");
        }
        return val.slice(1);
    }
}

export default Tail;
