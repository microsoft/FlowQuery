import ASTNode from "../ast_node";
import String from "../expressions/string";
import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Joins an array of strings with a delimiter",
    category: "scalar",
    parameters: [
        { name: "array", description: "Array of values to join", type: "array" },
        { name: "delimiter", description: "Delimiter to join with", type: "string" },
    ],
    output: { description: "Joined string", type: "string", example: "a,b,c" },
    examples: ["WITH ['a', 'b', 'c'] AS arr RETURN join(arr, ',')"],
})
class Join extends Function {
    constructor() {
        super("join");
        this._expectedParameterCount = 2;
    }
    public set parameters(nodes: ASTNode[]) {
        if (nodes.length === 1) {
            nodes.push(new String(""));
        }
        super.parameters = nodes;
    }
    public value(): any {
        const array = this.getChildren()[0].value();
        const delimiter = this.getChildren()[1].value();
        if (array === null || array === undefined) {
            return null;
        }
        if (!Array.isArray(array) || typeof delimiter !== "string") {
            throw new Error("Invalid arguments for join function");
        }
        return array.join(delimiter);
    }
}

export default Join;
