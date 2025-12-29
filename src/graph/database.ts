import GraphNode from "./graph_node";
import Relationship from "./relationship";

class Database {
    private static instance: Database;
    private static nodes: Map<string, GraphNode> = new Map();
    private static relationships: Map<string, Relationship> = new Map();

    public static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }
    public addNode(node: GraphNode): void {
        if (node.label === null) {
            throw new Error("Node label is null");
        }
        Database.nodes.set(node.label, node);
    }
    public getNode(label: string): GraphNode | null {
        return Database.nodes.get(label) || null;
    }
    public addRelationship(relationship: Relationship): void {
        if (relationship.type === null) {
            throw new Error("Relationship type is null");
        }
        Database.relationships.set(relationship.type, relationship);
    }
    public getRelationship(type: string): Relationship | null {
        return Database.relationships.get(type) || null;
    }
}

export default Database;
