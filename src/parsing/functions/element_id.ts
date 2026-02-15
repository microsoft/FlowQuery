import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description:
        "Returns the element id of a node or relationship as a string. For nodes, returns the string representation of the id property. For relationships, returns the type.",
    category: "scalar",
    parameters: [
        {
            name: "entity",
            description: "A node or relationship to get the element id from",
            type: "object",
        },
    ],
    output: {
        description: "The element id of the entity as a string",
        type: "string",
        example: '"1"',
    },
    examples: ["MATCH (n:Person) RETURN elementId(n)", "MATCH (a)-[r]->(b) RETURN elementId(r)"],
})
class ElementId extends Function {
    constructor() {
        super("elementid");
        this._expectedParameterCount = 1;
    }

    public value(): any {
        const obj = this.getChildren()[0].value();
        if (obj === null || obj === undefined) {
            return null;
        }
        if (typeof obj !== "object" || Array.isArray(obj)) {
            throw new Error("elementId() expects a node or relationship");
        }

        // If it's a RelationshipMatchRecord (has type, startNode, endNode, properties)
        if ("type" in obj && "startNode" in obj && "endNode" in obj && "properties" in obj) {
            return String(obj.type);
        }

        // If it's a node record (has id field)
        if ("id" in obj) {
            return String(obj.id);
        }

        throw new Error("elementId() expects a node or relationship");
    }
}

export default ElementId;
