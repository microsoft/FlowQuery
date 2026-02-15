import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description:
        "Returns the id of a node or relationship. For nodes, returns the id property. For relationships, returns the type.",
    category: "scalar",
    parameters: [
        {
            name: "entity",
            description: "A node or relationship to get the id from",
            type: "object",
        },
    ],
    output: {
        description: "The id of the entity",
        type: "any",
        example: "1",
    },
    examples: ["MATCH (n:Person) RETURN id(n)", "MATCH (a)-[r]->(b) RETURN id(r)"],
})
class Id extends Function {
    constructor() {
        super("id");
        this._expectedParameterCount = 1;
    }

    public value(): any {
        const obj = this.getChildren()[0].value();
        if (obj === null || obj === undefined) {
            return null;
        }
        if (typeof obj !== "object" || Array.isArray(obj)) {
            throw new Error("id() expects a node or relationship");
        }

        // If it's a RelationshipMatchRecord (has type, startNode, endNode, properties)
        if ("type" in obj && "startNode" in obj && "endNode" in obj && "properties" in obj) {
            return obj.type;
        }

        // If it's a node record (has id field)
        if ("id" in obj) {
            return obj.id;
        }

        throw new Error("id() expects a node or relationship");
    }
}

export default Id;
