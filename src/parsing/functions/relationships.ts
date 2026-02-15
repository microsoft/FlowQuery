import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Returns all relationships in a path as an array",
    category: "scalar",
    parameters: [
        {
            name: "path",
            description: "A path value returned from a graph pattern match",
            type: "array",
        },
    ],
    output: {
        description: "Array of relationship records",
        type: "array",
        example: "[{ type: 'KNOWS', properties: { since: '2020' } }]",
    },
    examples: ["MATCH p=(:Person)-[:KNOWS]-(:Person) RETURN relationships(p)"],
})
class Relationships extends Function {
    constructor() {
        super("relationships");
        this._expectedParameterCount = 1;
    }

    public value(): any {
        const path = this.getChildren()[0].value();
        if (path === null || path === undefined) {
            return [];
        }
        if (!Array.isArray(path)) {
            throw new Error("relationships() expects a path (array)");
        }
        // A path is an array of alternating node and relationship objects:
        // [node, rel, node, rel, node, ...]
        // Relationships are RelationshipMatchRecords (have 'type', 'startNode', 'endNode', 'properties')
        return path.filter((element: any) => {
            if (element === null || element === undefined || typeof element !== "object") {
                return false;
            }
            return (
                "type" in element &&
                "startNode" in element &&
                "endNode" in element &&
                "properties" in element
            );
        });
    }
}

export default Relationships;
