import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description:
        "Returns a map containing all the properties of a node, relationship, or map. For nodes and relationships, internal identifiers are excluded.",
    category: "scalar",
    parameters: [
        {
            name: "entity",
            description: "A node, relationship, or map to extract properties from",
            type: "object",
        },
    ],
    output: {
        description: "Map of properties",
        type: "object",
        example: "{ name: 'Alice', age: 30 }",
    },
    examples: [
        "MATCH (n:Person) RETURN properties(n)",
        "WITH { name: 'Alice', age: 30 } AS obj RETURN properties(obj)",
    ],
})
class Properties extends Function {
    constructor() {
        super("properties");
        this._expectedParameterCount = 1;
    }

    public value(): any {
        const obj = this.getChildren()[0].value();
        if (obj === null || obj === undefined) {
            return null;
        }
        if (typeof obj !== "object" || Array.isArray(obj)) {
            throw new Error("properties() expects a node, relationship, or map");
        }

        // If it's a RelationshipMatchRecord (has type, startNode, endNode, properties)
        if ("type" in obj && "startNode" in obj && "endNode" in obj && "properties" in obj) {
            return obj.properties;
        }

        // If it's a node record (has id field), exclude id
        if ("id" in obj) {
            const { id, ...props } = obj;
            return props;
        }

        // Otherwise, treat as a plain map and return a copy
        return { ...obj };
    }
}

export default Properties;
