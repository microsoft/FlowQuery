import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Returns the number of relationships in a path",
    category: "scalar",
    parameters: [
        {
            name: "path",
            description: "A path value returned from a graph pattern match",
            type: "array",
        },
    ],
    output: {
        description: "Number of relationships in the path",
        type: "number",
        example: 2,
    },
    examples: ["MATCH p=(:Person)-[:KNOWS*1..3]->(:Person) RETURN length(p)"],
})
class Length extends Function {
    constructor() {
        super("length");
        this._expectedParameterCount = 1;
    }

    public value(): any {
        const path = this.getChildren()[0].value();
        if (path === null || path === undefined) {
            return 0;
        }
        if (!Array.isArray(path)) {
            throw new Error("length() expects a path (array)");
        }
        // A path is an array of alternating node and relationship objects:
        // [node, rel, node, rel, node, ...]. Count the relationship records,
        // matching Cypher semantics for length() on paths.
        let count = 0;
        for (const element of path) {
            if (element === null || element === undefined || typeof element !== "object") {
                continue;
            }
            if (
                "type" in element &&
                "startNode" in element &&
                "endNode" in element &&
                "properties" in element
            ) {
                count++;
            }
        }
        return count;
    }
}

export default Length;
