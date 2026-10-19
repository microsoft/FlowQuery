import ASTNode from "../parsing/ast_node";
import type DefaultGraph from "./default_graph";
import Node from "./node";
import PhysicalNode from "./physical_node";
import PhysicalRelationship from "./physical_relationship";
import Relationship from "./relationship";
import {
    NodeSourceCapabilities,
    NodeSourceProvider,
    RelationshipSourceCapabilities,
    RelationshipSourceProvider,
    SourceCapabilityError,
    normalizeCapabilities,
    validateNodeProvider,
    validateRelationshipProvider,
} from "./source_provider";
import { StatementSourceProvider } from "./statement_source";

class Database {
    private static instance: Database;
    private static _nodes: Map<string, PhysicalNode> = new Map();
    private static _relationships: Map<string, Map<string, PhysicalRelationship>> = new Map();
    private static _defaultGraph: DefaultGraph | null = null;

    public static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }
    /**
     * The default graph bound with `USE GRAPH fn($request)`, or `null`.
     * Like virtual definitions it belongs to the process-wide registry;
     * each query pins the binding that was current when it started.
     */
    public get defaultGraph(): DefaultGraph | null {
        return Database._defaultGraph;
    }
    public set defaultGraph(graph: DefaultGraph | null) {
        Database._defaultGraph = graph;
    }
    /** Read-only access to registered nodes. */
    public get nodes(): Map<string, PhysicalNode> {
        return Database._nodes;
    }
    /** Read-only access to registered relationships (type → endpoint-key → physical). */
    public get relationships(): Map<string, Map<string, PhysicalRelationship>> {
        return Database._relationships;
    }
    public addNode(
        node: Node,
        statement: ASTNode,
        isStatic: boolean = false,
        refreshEveryMs: number | null = null
    ): void {
        if (node.label === null) {
            throw new Error("Node label is null");
        }
        const existing = Database._nodes.get(node.label);
        if (existing !== undefined && (existing.isStatic || isStatic)) {
            throw new Error(
                `Virtual node (:${node.label}) already exists; DROP VIRTUAL (:${node.label}) first`
            );
        }
        const physical = new PhysicalNode(null, node.label);
        physical.statement = statement;
        physical.isStatic = isStatic;
        physical.refreshEveryMs = refreshEveryMs;
        Database._nodes.set(node.label, physical);
    }
    public removeNode(node: Node): void {
        if (node.label === null) {
            throw new Error("Node label is null");
        }
        Database._nodes.delete(node.label);
    }
    public refreshNode(node: Node): void {
        if (node.label === null) {
            throw new Error("Node label is null");
        }
        const physical = Database._nodes.get(node.label);
        if (physical === undefined) {
            throw new Error(`Virtual node (:${node.label}) does not exist`);
        }
        physical.invalidateCache();
    }
    public getNode(node: Node): PhysicalNode | null {
        return Database._nodes.get(node.label!) || null;
    }
    /** Endpoint-only key: "Source:Target" */
    private static endpointKey(sourceLabel: string | null, targetLabel: string | null): string {
        return `${sourceLabel ?? ""}:${targetLabel ?? ""}`;
    }
    public addRelationship(
        relationship: Relationship,
        statement: ASTNode,
        isStatic: boolean = false,
        refreshEveryMs: number | null = null
    ): void {
        if (relationship.type === null) {
            throw new Error("Relationship type is null");
        }
        const key = Database.endpointKey(
            relationship.source?.label ?? null,
            relationship.target?.label ?? null
        );
        const typeMap = Database._relationships.get(relationship.type);
        const existing = typeMap?.get(key);
        if (existing !== undefined && (existing.isStatic || isStatic)) {
            throw new Error(
                `Virtual relationship [:${relationship.type}] between (:${relationship.source?.label ?? ""}) and (:${relationship.target?.label ?? ""}) already exists; DROP VIRTUAL ...-[:${relationship.type}]-... first`
            );
        }
        const physical = new PhysicalRelationship(null, relationship.type);
        physical.statement = statement;
        physical.source = relationship.source;
        physical.target = relationship.target;
        physical.isStatic = isStatic;
        physical.refreshEveryMs = refreshEveryMs;
        let map = typeMap;
        if (!map) {
            map = new Map();
            Database._relationships.set(relationship.type, map);
        }
        map.set(key, physical);
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
    public refreshRelationship(relationship: Relationship): void {
        if (relationship.type === null) {
            throw new Error("Relationship type is null");
        }
        const typeMap = Database._relationships.get(relationship.type);
        const key = Database.endpointKey(
            relationship.source?.label ?? null,
            relationship.target?.label ?? null
        );
        const physical = typeMap?.get(key);
        if (physical === undefined) {
            throw new Error(
                `Virtual relationship [:${relationship.type}] between (:${relationship.source?.label ?? ""}) and (:${relationship.target?.label ?? ""}) does not exist`
            );
        }
        physical.invalidateCache();
    }
    /**
     * Register a backend-aware node source for `label`, replacing any
     * existing definition.  The provider is validated eagerly.
     */
    public registerNodeSource(label: string, provider: NodeSourceProvider): void {
        validateNodeProvider(provider, `(:${label})`);
        const existing = Database._nodes.get(label);
        if (existing !== undefined && existing.isStatic) {
            throw new SourceCapabilityError(
                `Virtual node (:${label}) is static; DROP VIRTUAL (:${label}) first`,
                `(:${label})`
            );
        }
        const physical = new PhysicalNode(null, label);
        physical.provider = provider;
        Database._nodes.set(label, physical);
    }
    /**
     * Register a backend-aware relationship source, replacing any existing
     * definition for the same type and endpoint labels.
     */
    public registerRelationshipSource(
        type: string,
        sourceLabel: string | null,
        targetLabel: string | null,
        provider: RelationshipSourceProvider
    ): void {
        const name = `(:${sourceLabel ?? ""})-[:${type}]->(:${targetLabel ?? ""})`;
        validateRelationshipProvider(provider, name);
        const key = Database.endpointKey(sourceLabel, targetLabel);
        let map = Database._relationships.get(type);
        if (map?.get(key)?.isStatic) {
            throw new SourceCapabilityError(
                `Virtual relationship ${name} is static; DROP VIRTUAL it first`,
                name
            );
        }
        const physical = new PhysicalRelationship(null, type);
        physical.source = sourceLabel !== null ? new Node(null, sourceLabel) : null;
        physical.target = targetLabel !== null ? new Node(null, targetLabel) : null;
        physical.provider = provider;
        if (!map) {
            map = new Map();
            Database._relationships.set(type, map);
        }
        map.set(key, physical);
    }
    /**
     * Opt an existing `CREATE VIRTUAL` node definition into the source
     * contract (`$request` binding, push-down, streaming...).  Pass `null`
     * to restore legacy eager loading.  Redefining the label clears it.
     */
    public setNodeSourceCapabilities(
        label: string,
        capabilities: NodeSourceCapabilities | null
    ): void {
        const name = `(:${label})`;
        const physical = Database._nodes.get(label);
        if (physical === undefined || physical.statement === null) {
            throw new SourceCapabilityError(
                `Virtual node ${name} is not defined by a statement`,
                name
            );
        }
        if (capabilities === null) {
            physical.provider = null;
            return;
        }
        const provider = new StatementSourceProvider(
            physical.virtual,
            normalizeCapabilities(capabilities as any, "node") as any
        );
        validateNodeProvider(provider, name);
        physical.provider = provider;
    }
    /** Relationship counterpart of {@link setNodeSourceCapabilities}. */
    public setRelationshipSourceCapabilities(
        type: string,
        sourceLabel: string | null,
        targetLabel: string | null,
        capabilities: RelationshipSourceCapabilities | null
    ): void {
        const name = `(:${sourceLabel ?? ""})-[:${type}]->(:${targetLabel ?? ""})`;
        const physical = Database._relationships
            .get(type)
            ?.get(Database.endpointKey(sourceLabel, targetLabel));
        if (physical === undefined || physical.statement === null) {
            throw new SourceCapabilityError(
                `Virtual relationship ${name} is not defined by a statement`,
                name
            );
        }
        if (capabilities === null) {
            physical.provider = null;
            return;
        }
        const provider = new StatementSourceProvider(
            physical.virtual,
            normalizeCapabilities(capabilities as any, "relationship") as any
        );
        validateRelationshipProvider(provider, name);
        physical.provider = provider;
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
