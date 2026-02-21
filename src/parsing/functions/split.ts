import ASTNode from "../ast_node";
import String from "../expressions/string";
import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Splits a string into an array by a delimiter",
    category: "scalar",
    parameters: [
        { name: "text", description: "String to split", type: "string" },
        { name: "delimiter", description: "Delimiter to split by", type: "string" },
    ],
    output: {
        description: "Array of string parts",
        type: "array",
        items: { type: "string" },
        example: ["a", "b", "c"],
    },
    examples: ["WITH 'a,b,c' AS s RETURN split(s, ',')"],
})
class Split extends Function {
    constructor() {
        super("split");
        this._expectedParameterCount = 2;
    }
    public set parameters(nodes: ASTNode[]) {
        if (nodes.length === 1) {
            nodes.push(new String(""));
        }
        super.parameters = nodes;
    }
    public value(): any {
        const str = this.getChildren()[0].value();
        const delimiter = this.getChildren()[1].value();
        if (str === null || str === undefined) {
            return null;
        }
        if (typeof str !== "string" || typeof delimiter !== "string") {
            throw new Error("Invalid arguments for split function");
        }
        return str.split(delimiter);
    }
}

export default Split;
