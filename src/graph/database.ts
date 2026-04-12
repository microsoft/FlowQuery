import ASTNode from "../parsing/ast_node";
import Node from "./node";
import PhysicalNode from "./physical_node";
import PhysicalRelationship from "./physical_relationship";
import Relationship from "./relationship";

class Database {
    private static instance: Database;
    private static _nodes: Map<string, PhysicalNode> = new Map();
    private static _relationships: Map<string, Map<string, PhysicalRelationship>> = new Map();

    public static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }
    /** Read-only access to registered nodes. */
    public get nodes(): Map<string, PhysicalNode> {
        return Database._nodes;
    }
    /** Read-only access to registered relationships (type → endpoint-key → physical). */
    public get relationships(): Map<string, Map<string, PhysicalRelationship>> {
        return Database._relationships;
    }
    public addNode(node: Node, statement: ASTNode): void {
        if (node.label === null) {
            throw new Error("Node label is null");
        }
        const physical = new PhysicalNode(null, node.label);
        physical.statement = statement;
        Database._nodes.set(node.label, physical);
    }
    public removeNode(node: Node): void {
        if (node.label === null) {
            throw new Error("Node label is null");
        }
        Database._nodes.delete(node.label);
    }
    public getNode(node: Node): PhysicalNode | null {
        return Database._nodes.get(node.label!) || null;
    }
    /** Endpoint-only key: "Source:Target" */
    private static endpointKey(sourceLabel: string | null, targetLabel: string | null): string {
        return `${sourceLabel ?? ""}:${targetLabel ?? ""}`;
    }
    public addRelationship(relationship: Relationship, statement: ASTNode): void {
        if (relationship.type === null) {
            throw new Error("Relationship type is null");
        }
        const physical = new PhysicalRelationship(null, relationship.type);
        physical.statement = statement;
        physical.source = relationship.source;
        physical.target = relationship.target;
        const key = Database.endpointKey(
            relationship.source?.label ?? null,
            relationship.target?.label ?? null
        );
        let typeMap = Database._relationships.get(relationship.type);
        if (!typeMap) {
            typeMap = new Map();
            Database._relationships.set(relationship.type, typeMap);
        }
        typeMap.set(key, physical);
    }
    public removeRelationship(relationship: Relationship): void {
        if (relationship.type === null) {
            throw new Error("Relationship type is null");
        }
        const typeMap = Database._relationships.get(relationship.type);
        if (!typeMap) return;
        const key = Database.endpointKey(
            relationship.source?.label ?? null,
            relationship.target?.label ?? null
        );
        typeMap.delete(key);
        if (typeMap.size === 0) {
            Database._relationships.delete(relationship.type);
        }
    }
    public getRelationship(relationship: Relationship): PhysicalRelationship | null {
        const typeMap = Database._relationships.get(relationship.type!);
        if (!typeMap) return null;
        const src = relationship.source?.label ?? null;
        const tgt = relationship.target?.label ?? null;
        // Exact match when labels are specified
        if (src !== null || tgt !== null) {
            return typeMap.get(Database.endpointKey(src, tgt)) ?? null;
        }
        // Null labels = wildcard: return last entry
        let last: PhysicalRelationship | null = null;
        for (const p of typeMap.values()) last = p;
        return last;
    }
}

export default Database;
