import ASTNode from "../ast_node";
import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description:
        "Returns a substring of a string, starting at a 0-based index with an optional length",
    category: "scalar",
    parameters: [
        { name: "original", description: "The original string", type: "string" },
        { name: "start", description: "The 0-based start index", type: "integer" },
        {
            name: "length",
            description: "The length of the substring (optional, defaults to remainder of string)",
            type: "integer",
        },
    ],
    output: { description: "The substring", type: "string", example: "llo" },
    examples: ["RETURN substring('hello', 1, 3)", "RETURN substring('hello', 2)"],
})
class Substring extends Function {
    constructor() {
        super("substring");
    }

    public set parameters(nodes: ASTNode[]) {
        if (nodes.length < 2 || nodes.length > 3) {
            throw new Error(
                `Function substring expected 2 or 3 parameters, but got ${nodes.length}`
            );
        }
        this.children = nodes;
    }

    public value(): any {
        const children = this.getChildren();
        const original = children[0].value();
        const start = children[1].value();

        if (typeof original !== "string") {
            throw new Error(
                "Invalid argument for substring function: expected a string as the first argument"
            );
        }
        if (typeof start !== "number" || !Number.isInteger(start)) {
            throw new Error(
                "Invalid argument for substring function: expected an integer as the second argument"
            );
        }

        if (children.length === 3) {
            const length = children[2].value();
            if (typeof length !== "number" || !Number.isInteger(length)) {
                throw new Error(
                    "Invalid argument for substring function: expected an integer as the third argument"
                );
            }
            return original.substring(start, start + length);
        }

        return original.substring(start);
    }
}

export default Substring;
