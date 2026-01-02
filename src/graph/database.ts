import ASTNode from "../parsing/ast_node";
import Node from "./node";
import NodeData from "./node_data";
import PhysicalNode from "./physical_node";
import PhysicalRelationship from "./physical_relationship";
import Relationship from "./relationship";
import RelationshipData from "./relationship_data";

class Database {
    private static instance: Database;
    private static nodes: Map<string, PhysicalNode> = new Map();
    private static relationships: Map<string, PhysicalRelationship> = new Map();

    public static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }
    public addNode(node: Node, statement: ASTNode): void {
        if (node.label === null) {
            throw new Error("Node label is null");
        }
        const physical = new PhysicalNode(null, node.label);
        physical.statement = statement;
        Database.nodes.set(node.label, physical);
    }
    public getNode(node: Node): PhysicalNode | null {
        return Database.nodes.get(node.label!) || null;
    }
    public addRelationship(relationship: Relationship, statement: ASTNode): void {
        if (relationship.type === null) {
            throw new Error("Relationship type is null");
        }
        const physical = new PhysicalRelationship(null, relationship.type);
        physical.from = relationship.from;
        physical.to = relationship.to;
        physical.statement = statement;
        Database.relationships.set(relationship.type, physical);
    }
    public getRelationship(relationship: Relationship): PhysicalRelationship | null {
        return Database.relationships.get(relationship.type!) || null;
    }
    public async getData(element: Node | Relationship): Promise<NodeData | RelationshipData> {
        if (element instanceof Node) {
            const physicalNode = this.getNode(element);
            if (physicalNode === null) {
                throw new Error(`Physical node not found for label ${element.label}`);
            }
            const data = await physicalNode.data();
            return new NodeData(data);
        } else if (element instanceof Relationship) {
            const physicalRel = this.getRelationship(element);
            if (physicalRel === null) {
                throw new Error(`Physical relationship not found for type ${element.type}`);
            }
            const data = await physicalRel.data();
            return new RelationshipData(data);
        } else {
            throw new Error("Element is neither Node nor Relationship");
        }
    }
}

export default Database;
