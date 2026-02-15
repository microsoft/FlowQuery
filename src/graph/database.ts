import ASTNode from "../parsing/ast_node";
import Node from "./node";
import NodeData, { NodeRecord } from "./node_data";
import PhysicalNode from "./physical_node";
import PhysicalRelationship from "./physical_relationship";
import Relationship from "./relationship";
import RelationshipData, { RelationshipRecord } from "./relationship_data";

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
        physical.statement = statement;
        physical.source = relationship.source;
        physical.target = relationship.target;
        Database.relationships.set(relationship.type, physical);
    }
    public getRelationship(relationship: Relationship): PhysicalRelationship | null {
        return Database.relationships.get(relationship.type!) || null;
    }
    public getRelationships(relationship: Relationship): PhysicalRelationship[] {
        const result: PhysicalRelationship[] = [];
        for (const type of relationship.types) {
            const physical = Database.relationships.get(type);
            if (physical) {
                result.push(physical);
            }
        }
        return result;
    }
    public async schema(): Promise<Record<string, any>[]> {
        const result: Record<string, any>[] = [];

        for (const [label, physical] of Database.nodes) {
            const records = await physical.data();
            const entry: Record<string, any> = { kind: "Node", label };
            if (records.length > 0) {
                const { id, ...sample } = records[0];
                const properties = Object.keys(sample);
                if (properties.length > 0) {
                    entry.properties = properties;
                    entry.sample = sample;
                }
            }
            result.push(entry);
        }

        for (const [type, physical] of Database.relationships) {
            const records = await physical.data();
            const entry: Record<string, any> = {
                kind: "Relationship",
                type,
                from_label: physical.source?.label || null,
                to_label: physical.target?.label || null,
            };
            if (records.length > 0) {
                const { left_id, right_id, ...sample } = records[0];
                const properties = Object.keys(sample);
                if (properties.length > 0) {
                    entry.properties = properties;
                    entry.sample = sample;
                }
            }
            result.push(entry);
        }

        return result;
    }

    public async getData(element: Node | Relationship): Promise<NodeData | RelationshipData> {
        if (element instanceof Node) {
            const node = this.getNode(element);
            if (node === null) {
                throw new Error(`Physical node not found for label ${element.label}`);
            }
            const data = await node.data();
            return new NodeData(data as NodeRecord[]);
        } else if (element instanceof Relationship) {
            if (element.types.length > 1) {
                const physicals = this.getRelationships(element);
                if (physicals.length === 0) {
                    throw new Error(
                        `No physical relationships found for types ${element.types.join(", ")}`
                    );
                }
                const allRecords: RelationshipRecord[] = [];
                for (let i = 0; i < physicals.length; i++) {
                    const records = (await physicals[i].data()) as RelationshipRecord[];
                    const typeName = element.types[i];
                    for (const record of records) {
                        allRecords.push({ ...record, _type: typeName });
                    }
                }
                return new RelationshipData(allRecords);
            }
            const relationship = this.getRelationship(element);
            if (relationship === null) {
                throw new Error(`Physical relationship not found for type ${element.type}`);
            }
            const data = await relationship.data();
            return new RelationshipData(data as RelationshipRecord[]);
        } else {
            throw new Error("Element is neither Node nor Relationship");
        }
    }
}

export default Database;
