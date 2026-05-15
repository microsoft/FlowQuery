import DataCache from "./data_cache";
import Database from "./database";
import Node from "./node";
import NodeData, { NodeRecord } from "./node_data";
import NodeReference from "./node_reference";
import PhysicalRelationship from "./physical_relationship";
import Relationship from "./relationship";
import RelationshipData, { RelationshipRecord } from "./relationship_data";
import { attachVirtualSource, getVirtualSource } from "./virtual_sources";

/**
 * Resolves pattern elements (nodes and relationships) to data by querying
 * the Database registry. Handles label compatibility, caching, and schema
 * introspection — keeping query-resolution concerns separate from storage.
 */
class DataResolver {
    private static instance: DataResolver;
    private _dataCache: DataCache = new DataCache();

    public static getInstance(): DataResolver {
        if (!DataResolver.instance) {
            DataResolver.instance = new DataResolver();
        }
        return DataResolver.instance;
    }
    /**
     * Sets the data cache for the current query execution.
     * Each top-level Runner creates its own DataCache instance.
     */
    public set dataCache(cache: DataCache) {
        this._dataCache = cache;
    }

    public async schema(): Promise<Record<string, any>[]> {
        const db = Database.getInstance();
        const result: Record<string, any>[] = [];

        for (const [label, physical] of db.nodes) {
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

        for (const [type, typeMap] of db.relationships) {
            for (const physical of typeMap.values()) {
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
        const db = Database.getInstance();
        if (element instanceof Node) {
            const args = DataResolver.extractArgs(element.properties);
            if (element.labels.length === 0) {
                // Unlabeled node: match all physical nodes in the database
                const allRecords: NodeRecord[] = [];
                for (const [label, physical] of db.nodes) {
                    const data = await this._dataCache.get(`node:${label}`, physical, null);
                    for (const record of data as NodeRecord[]) {
                        const enriched = { ...record, _label: label };
                        const src = getVirtualSource(record);
                        if (src !== undefined) attachVirtualSource(enriched, src);
                        allRecords.push(enriched);
                    }
                }
                return new NodeData(allRecords);
            }
            if (element.labels.length > 1) {
                // ORed labels: collect from all matching physical nodes
                const allRecords: NodeRecord[] = [];
                for (const lbl of element.labels) {
                    const physical = db.nodes.get(lbl);
                    if (physical) {
                        const data = await this._dataCache.get(`node:${lbl}`, physical, args);
                        for (const record of data as NodeRecord[]) {
                            const enriched = { ...record, _label: lbl };
                            const src = getVirtualSource(record);
                            if (src !== undefined) attachVirtualSource(enriched, src);
                            allRecords.push(enriched);
                        }
                    }
                }
                return new NodeData(allRecords);
            }
            const node = db.getNode(element);
            if (node === null) {
                throw new Error(`Physical node not found for label ${element.label}`);
            }
            const data = await this._dataCache.get(`node:${element.label}`, node, args);
            const label = element.label;
            const records = (data as NodeRecord[]).map((record) => {
                const enriched = { ...record, _label: label };
                const src = getVirtualSource(record);
                if (src !== undefined) attachVirtualSource(enriched, src);
                return enriched;
            });
            return new NodeData(records);
        } else if (element instanceof Relationship) {
            const args = DataResolver.extractArgs(element.properties);
            const entries = this.getRelationshipEntries(element, db);
            if (entries.length === 0) {
                if (element.types.length === 0) {
                    return new RelationshipData([]);
                }
                throw new Error(
                    `No physical relationships found for type${element.types.length > 1 ? "s" : ""} ${element.types.join(", ")}`
                );
            }
            const allRecords: RelationshipRecord[] = [];
            for (const [typeName, physical] of entries) {
                const cacheKey = `rel:${physical.source?.label ?? ""}:${typeName}:${physical.target?.label ?? ""}`;
                const records = (await this._dataCache.get(
                    cacheKey,
                    physical,
                    args
                )) as RelationshipRecord[];
                for (const record of records) {
                    const enriched = { ...record, _type: typeName };
                    const src = getVirtualSource(record);
                    if (src !== undefined) attachVirtualSource(enriched, src);
                    allRecords.push(enriched);
                }
            }
            return new RelationshipData(allRecords);
        } else {
            throw new Error("Element is neither Node nor Relationship");
        }
    }

    /** Resolve labels from a node, following NodeReference if needed. */
    private static resolveLabels(node: Node | null): string[] {
        if (!node) return [];
        if (node.labels.length > 0) return node.labels;
        if (node instanceof NodeReference) {
            const ref = node.reference;
            if (ref instanceof Node) return ref.labels;
        }
        return [];
    }

    /**
     * Check whether a MATCH pattern's endpoint labels are compatible with
     * a stored physical relationship's source/target labels.
     */
    private static isRelationshipCompatible(
        relationship: Relationship,
        physical: PhysicalRelationship
    ): boolean {
        const match = (pattern: string[], label: string | null): boolean =>
            pattern.length === 0 || (label !== null && pattern.includes(label));
        const srcLabels = DataResolver.resolveLabels(relationship.source);
        const tgtLabels = DataResolver.resolveLabels(relationship.target);
        const physSrc = physical.source?.label ?? null;
        const physTgt = physical.target?.label ?? null;
        return relationship.direction === "left"
            ? match(srcLabels, physTgt) && match(tgtLabels, physSrc)
            : match(srcLabels, physSrc) && match(tgtLabels, physTgt);
    }

    /**
     * Collect all physical relationships matching the pattern's types and endpoint labels.
     * If types is empty, all registered relationship types are considered.
     */
    private getRelationshipEntries(
        relationship: Relationship,
        db: Database
    ): [string, PhysicalRelationship][] {
        const types =
            relationship.types.length === 0
                ? Array.from(db.relationships.keys())
                : relationship.types;

        const result: [string, PhysicalRelationship][] = [];
        for (const type of types) {
            const typeMap = db.relationships.get(type);
            if (!typeMap) continue;
            for (const physical of typeMap.values()) {
                if (DataResolver.isRelationshipCompatible(relationship, physical)) {
                    result.push([type, physical]);
                }
            }
        }
        return result;
    }

    private static extractArgs(properties: Map<string, any>): Record<string, any> | null {
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

export default DataResolver;
