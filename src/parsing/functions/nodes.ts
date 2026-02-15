import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Returns all nodes in a path as an array",
    category: "scalar",
    parameters: [
        {
            name: "path",
            description: "A path value returned from a graph pattern match",
            type: "array",
        },
    ],
    output: {
        description: "Array of node records",
        type: "array",
        example: "[{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]",
    },
    examples: ["MATCH p=(:Person)-[:KNOWS]-(:Person) RETURN nodes(p)"],
})
class Nodes extends Function {
    constructor() {
        super("nodes");
        this._expectedParameterCount = 1;
    }

    public value(): any {
        const path = this.getChildren()[0].value();
        if (path === null || path === undefined) {
            return [];
        }
        if (!Array.isArray(path)) {
            throw new Error("nodes() expects a path (array)");
        }
        // A path is an array of alternating node and relationship objects:
        // [node, rel, node, rel, node, ...]
        // Nodes are plain NodeRecords (have 'id' but not 'type'/'startNode'/'endNode')
        // Relationships are RelationshipMatchRecords (have 'type', 'startNode', 'endNode', 'properties')
        return path.filter((element: any) => {
            if (element === null || element === undefined || typeof element !== "object") {
                return false;
            }
            // A RelationshipMatchRecord has type, startNode, endNode, properties
            return !(
                "type" in element &&
                "startNode" in element &&
                "endNode" in element &&
                "properties" in element
            );
        });
    }
}

export default Nodes;
