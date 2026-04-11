import ASTNode from "../parsing/ast_node";
import DataCache from "./data_cache";
import Node from "./node";
import NodeData, { NodeRecord } from "./node_data";
import NodeReference from "./node_reference";
import PhysicalNode from "./physical_node";
import PhysicalRelationship from "./physical_relationship";
import Relationship from "./relationship";
import RelationshipData, { RelationshipRecord } from "./relationship_data";

class Database {
    private static instance: Database;
    private static nodes: Map<string, PhysicalNode> = new Map();
    private static relationships: Map<string, PhysicalRelationship[]> = new Map();
    private _dataCache: DataCache = new DataCache();

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
    public removeNode(node: Node): void {
        if (node.label === null) {
            throw new Error("Node label is null");
        }
        Database.nodes.delete(node.label);
    }
    public getNode(node: Node): PhysicalNode | null {
        return Database.nodes.get(node.label!) || null;
    }
    private static relKey(physical: PhysicalRelationship): string {
        const src = physical.source?.label ?? "";
        const tgt = physical.target?.label ?? "";
        return `${src}:${physical.type}:${tgt}`;
    }
    public addRelationship(relationship: Relationship, statement: ASTNode): void {
        if (relationship.type === null) {
            throw new Error("Relationship type is null");
        }
        const physical = new PhysicalRelationship(null, relationship.type);
        physical.statement = statement;
        physical.source = relationship.source;
        physical.target = relationship.target;
        const arr = Database.relationships.get(relationship.type) || [];
        const sourceLabel = relationship.source?.label ?? null;
        const targetLabel = relationship.target?.label ?? null;
        const idx = arr.findIndex(
            (p) =>
                (p.source?.label ?? null) === sourceLabel &&
                (p.target?.label ?? null) === targetLabel
        );
        if (idx >= 0) {
            arr[idx] = physical;
        } else {
            arr.push(physical);
        }
        Database.relationships.set(relationship.type, arr);
    }
    public removeRelationship(relationship: Relationship): void {
        if (relationship.type === null) {
            throw new Error("Relationship type is null");
        }
        const arr = Database.relationships.get(relationship.type);
        if (!arr) return;
        const sourceLabel = relationship.source?.label ?? null;
        const targetLabel = relationship.target?.label ?? null;
        const filtered = arr.filter(
            (p) =>
                (p.source?.label ?? null) !== sourceLabel ||
                (p.target?.label ?? null) !== targetLabel
        );
        if (filtered.length === 0) {
            Database.relationships.delete(relationship.type);
        } else {
            Database.relationships.set(relationship.type, filtered);
        }
    }
    public getRelationship(relationship: Relationship): PhysicalRelationship | null {
        const arr = Database.relationships.get(relationship.type!) || [];
        const sourceLabel = relationship.source?.label ?? null;
        const targetLabel = relationship.target?.label ?? null;
        for (let i = arr.length - 1; i >= 0; i--) {
            const p = arr[i];
            if (
                (sourceLabel === null || (p.source?.label ?? null) === sourceLabel) &&
                (targetLabel === null || (p.target?.label ?? null) === targetLabel)
            ) {
                return p;
            }
        }
        return null;
    }
    private resolveLabels(node: Node | null): string[] {
        if (!node) return [];
        if (node.labels.length > 0) return node.labels;
        if (node instanceof NodeReference) {
            const ref = (node as NodeReference).reference;
            if (ref instanceof Node) {
                return ref.labels;
            }
        }
        return [];
    }
    private isRelationshipCompatible(
        relationship: Relationship,
        physical: PhysicalRelationship
    ): boolean {
        const patternSourceLabels = this.resolveLabels(relationship.source);
        const patternTargetLabels = this.resolveLabels(relationship.target);
        const physicalSourceLabel = physical.source?.label ?? null;
        const physicalTargetLabel = physical.target?.label ?? null;

        const matchesLabel = (patternLabels: string[], physicalLabel: string | null): boolean =>
            patternLabels.length === 0 ||
            (physicalLabel !== null && patternLabels.includes(physicalLabel));

        if (relationship.direction === "left") {
            return (
                matchesLabel(patternSourceLabels, physicalTargetLabel) &&
                matchesLabel(patternTargetLabels, physicalSourceLabel)
            );
        }

        return (
            matchesLabel(patternSourceLabels, physicalSourceLabel) &&
            matchesLabel(patternTargetLabels, physicalTargetLabel)
        );
    }
    private getRelationshipEntries(relationship: Relationship): [string, PhysicalRelationship][] {
        const result: [string, PhysicalRelationship][] = [];
        if (relationship.types.length === 0) {
            for (const [, physicals] of Database.relationships) {
                for (const physical of physicals) {
                    if (this.isRelationshipCompatible(relationship, physical)) {
                        result.push([physical.type!, physical]);
                    }
                }
            }
            return result;
        }

        for (const type of relationship.types) {
            const physicals = Database.relationships.get(type);
            if (physicals) {
                for (const physical of physicals) {
                    if (this.isRelationshipCompatible(relationship, physical)) {
                        result.push([type, physical]);
                    }
                }
            }
        }
        return result;
    }
    /**
     * Sets the data cache for the current query execution.
     * Each top-level Runner creates its own DataCache instance.
     */
    public set dataCache(cache: DataCache) {
        this._dataCache = cache;
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

        for (const [type, physicals] of Database.relationships) {
            for (const physical of physicals) {
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
        }

        return result;
    }

    public async getData(element: Node | Relationship): Promise<NodeData | RelationshipData> {
        if (element instanceof Node) {
            const args = this.extractArgs(element.properties);
            if (element.labels.length === 0) {
                // Unlabeled node: match all physical nodes in the database
                const allRecords: NodeRecord[] = [];
                for (const [label, physical] of Database.nodes) {
                    const data = await this._dataCache.get(`node:${label}`, physical, null);
                    for (const record of data as NodeRecord[]) {
                        allRecords.push({ ...record, _label: label });
                    }
                }
                return new NodeData(allRecords);
            }
            if (element.labels.length > 1) {
                // ORed labels: collect from all matching physical nodes
                const allRecords: NodeRecord[] = [];
                for (const lbl of element.labels) {
                    const physical = Database.nodes.get(lbl);
                    if (physical) {
                        const data = await this._dataCache.get(`node:${lbl}`, physical, args);
                        for (const record of data as NodeRecord[]) {
                            allRecords.push({ ...record, _label: lbl });
                        }
                    }
                }
                return new NodeData(allRecords);
            }
            const node = this.getNode(element);
            if (node === null) {
                throw new Error(`Physical node not found for label ${element.label}`);
            }
            const data = await this._dataCache.get(`node:${element.label}`, node, args);
            const label = element.label;
            const records = (data as NodeRecord[]).map((record) => ({ ...record, _label: label }));
            return new NodeData(records);
        } else if (element instanceof Relationship) {
            const args = this.extractArgs(element.properties);
            const physicalEntries = this.getRelationshipEntries(element);
            if (physicalEntries.length === 0) {
                if (element.types.length === 0) {
                    return new RelationshipData([]);
                }
                throw new Error(
                    `No physical relationships found for type${element.types.length > 1 ? "s" : ""} ${element.types.join(", ")}`
                );
            }
            const allRecords: RelationshipRecord[] = [];
            for (const [typeName, physical] of physicalEntries) {
                const cacheKey = `rel:${Database.relKey(physical)}`;
                const records = (await this._dataCache.get(
                    cacheKey,
                    physical,
                    args
                )) as RelationshipRecord[];
                for (const record of records) {
                    allRecords.push({ ...record, _type: typeName });
                }
            }
            return new RelationshipData(allRecords);
        } else {
            throw new Error("Element is neither Node nor Relationship");
        }
    }

    /**
     * Extracts property constraint values from a node/relationship's properties map
     * to pass as $args to the inner virtual definition query.
     */
    private extractArgs(properties: Map<string, any>): Record<string, any> | null {
        if (properties.size === 0) {
            return null;
        }
        const args: Record<string, any> = {};
        for (const [key, expression] of properties) {
            args[key] = expression.value();
        }
        return args;
    }
}

export default Database;
