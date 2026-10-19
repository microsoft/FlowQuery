import DataCache from "./data_cache";
import Database from "./database";
import type DefaultGraph from "./default_graph";
import Node from "./node";
import NodeData, { NodeRecord } from "./node_data";
import NodeReference from "./node_reference";
import PhysicalNode from "./physical_node";
import PhysicalRelationship from "./physical_relationship";
import Relationship from "./relationship";
import RelationshipData, { RelationshipRecord } from "./relationship_data";
import {
    NodeAccess,
    NodeSourceAccess,
    RelationshipAccess,
    RelationshipSourceAccess,
} from "./source_access";
import type SourceContext from "./source_context";
import { materializeScan } from "./statement_source";
import { attachVirtualSource, getVirtualSource } from "./virtual_sources";

/**
 * Resolves pattern elements (nodes and relationships) to data by querying
 * the Database registry. Handles label compatibility, caching, and schema
 * introspection — keeping query-resolution concerns separate from storage.
 */
class DataResolver {
    private static instance: DataResolver;
    private _dataCache: DataCache = new DataCache();
    private _sourceContext: SourceContext | null = null;

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
    /** Source context of the most recently started top-level query. */
    public get sourceContext(): SourceContext | null {
        return this._sourceContext;
    }
    public set sourceContext(ctx: SourceContext | null) {
        this._sourceContext = ctx;
    }

    private static deferrable(
        physical: PhysicalNode | PhysicalRelationship,
        ctx: SourceContext
    ): boolean {
        return physical.provider !== null && !(ctx.provenance && physical.statement !== null);
    }

    /**
     * Node definitions (and default-graph entries) an element reads from.
     * Labels with a `CREATE VIRTUAL` definition are always served by it;
     * other labels, and unlabelled patterns, fall back to the default
     * graph pinned by the query, if any.
     */
    private static nodeCandidates(
        element: Node,
        db: Database,
        graph: DefaultGraph | null
    ): {
        physical: [string, PhysicalNode][];
        graph: { label: string | null; labels: string[] | null }[];
    } {
        const physical: [string, PhysicalNode][] = [];
        const graphEntries: { label: string | null; labels: string[] | null }[] = [];
        if (element.allLabels) {
            if (graph === null || element.labels.some((label) => db.nodes.has(label))) {
                throw new Error(
                    `Node pattern (:${element.labels.join(":")}) requires every label: this is only supported for labels without a CREATE VIRTUAL definition, read through the default graph (USE GRAPH)`
                );
            }
            graphEntries.push({ label: element.labels[0], labels: [...element.labels] });
            return { physical, graph: graphEntries };
        }
        if (element.labels.length === 0) {
            physical.push(...db.nodes.entries());
            if (graph !== null) graphEntries.push({ label: null, labels: null });
            return { physical, graph: graphEntries };
        }
        for (const label of element.labels) {
            const p = db.nodes.get(label);
            if (p !== undefined) physical.push([label, p]);
            else if (graph !== null) graphEntries.push({ label, labels: null });
        }
        return { physical, graph: graphEntries };
    }

    /** Endpoint label hint of a pattern node (sent to the default graph). */
    private static labelHint(node: Node | null): string | null {
        const labels = DataResolver.resolveLabels(node);
        if (labels.length === 1) return labels[0];
        if (node !== null && node.allLabels) return labels[0];
        if (
            node instanceof NodeReference &&
            node.reference instanceof Node &&
            node.reference.allLabels
        ) {
            return labels[0];
        }
        return null;
    }

    /** Default-graph entries for a relationship pattern (types without definitions). */
    private static relationshipGraphEntries(
        relationship: Relationship,
        db: Database,
        graph: DefaultGraph | null
    ): { type: string | null; sourceLabel: string | null; targetLabel: string | null }[] {
        if (graph === null) return [];
        const [left, right] =
            relationship.direction === "left"
                ? [relationship.target, relationship.source]
                : [relationship.source, relationship.target];
        const sourceLabel = DataResolver.labelHint(left);
        const targetLabel = DataResolver.labelHint(right);
        if (relationship.types.length === 0) return [{ type: null, sourceLabel, targetLabel }];
        return relationship.types
            .filter((type) => !db.relationships.has(type))
            .map((type) => ({ type, sourceLabel, targetLabel }));
    }

    /**
     * Returns provider-backed access for an element when every physical
     * definition it can match is backed by a source provider; otherwise
     * `null`, and the element is loaded eagerly through {@link getData}.
     */
    public getAccess(
        element: Node | Relationship,
        ctx: SourceContext
    ): NodeAccess | RelationshipAccess | null {
        const db = Database.getInstance();
        const graph = ctx.graph;
        if (element instanceof Node) {
            const candidates = DataResolver.nodeCandidates(element, db, graph);
            if (
                candidates.physical.length + candidates.graph.length === 0 ||
                !candidates.physical.every(([, p]) => DataResolver.deferrable(p, ctx))
            ) {
                return null;
            }
            return new NodeSourceAccess(ctx, [
                ...candidates.physical.map(([label, p]) => ({ label, provider: p.provider! })),
                ...candidates.graph.map((g) => ({
                    label: g.label,
                    labels: g.labels,
                    provider: graph!.nodeProvider,
                    graph: true,
                })),
            ]);
        }
        const entries = this.getRelationshipEntries(element, db);
        const graphEntries = DataResolver.relationshipGraphEntries(element, db, graph);
        if (
            entries.length + graphEntries.length === 0 ||
            !entries.every(([, p]) => DataResolver.deferrable(p, ctx))
        ) {
            return null;
        }
        return new RelationshipSourceAccess(ctx, [
            ...entries.map(([type, p]) => ({
                type,
                sourceLabel: p.source?.label ?? null,
                targetLabel: p.target?.label ?? null,
                provider: p.provider!,
            })),
            ...graphEntries.map((g) => ({
                ...g,
                provider: graph!.relationshipProvider,
                graph: true,
            })),
        ]);
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
        const ctx = this._sourceContext;
        const graph = ctx?.graph ?? null;
        if (element instanceof Node) {
            const args = DataResolver.extractArgs(element.properties);
            const candidates = DataResolver.nodeCandidates(element, db, graph);
            if (
                element.labels.length === 1 &&
                candidates.physical.length === 0 &&
                candidates.graph.length === 0
            ) {
                throw new Error(`Physical node not found for label ${element.label}`);
            }
            // Unlabelled and ORed labels collect from every matching definition.
            const allRecords: NodeRecord[] = [];
            for (const [label, physical] of candidates.physical) {
                const data = await this._dataCache.get(
                    `node:${label}`,
                    physical,
                    element.labels.length === 0 ? null : args
                );
                for (const record of data as NodeRecord[]) {
                    const enriched = { ...record, _label: label };
                    const src = getVirtualSource(record);
                    if (src !== undefined) attachVirtualSource(enriched, src);
                    allRecords.push(enriched);
                }
            }
            for (const entry of candidates.graph) {
                const rows = await materializeScan(
                    graph!.nodeProvider,
                    "node",
                    graph!.description,
                    entry.labels !== null
                        ? { label: entry.label, labels: entry.labels }
                        : { label: entry.label },
                    null,
                    ctx
                );
                for (const row of rows) {
                    allRecords.push(
                        (entry.label !== null ? { ...row, _label: entry.label } : row) as NodeRecord
                    );
                }
            }
            return new NodeData(allRecords);
        } else if (element instanceof Relationship) {
            const args = DataResolver.extractArgs(element.properties);
            const entries = this.getRelationshipEntries(element, db);
            const graphEntries = DataResolver.relationshipGraphEntries(element, db, graph);
            if (entries.length === 0 && graphEntries.length === 0) {
                if (element.types.length === 0 || graph !== null) {
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
            for (const entry of graphEntries) {
                const rows = await materializeScan(
                    graph!.relationshipProvider,
                    "relationship",
                    graph!.description,
                    entry,
                    null,
                    ctx
                );
                allRecords.push(...(rows as RelationshipRecord[]));
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
