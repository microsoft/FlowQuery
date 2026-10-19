import FunctionFactory from "../parsing/functions/function_factory";
import Database from "./database";
import { DEFAULT_GRAPH, graphNodeRecord, graphRelationshipRecord } from "./graph_records";
import { contextOf } from "./source_context";
import {
    NodeSourceCapabilities,
    NodeSourceProvider,
    RelationshipSourceCapabilities,
    RelationshipSourceProvider,
    SourceReadContext,
    SourceResponseError,
    SourceRow,
    normalizeCapabilities,
    validateNodeProvider,
    validateRelationshipProvider,
} from "./source_provider";
import type { WriteBackend } from "./write_set";

/**
 * A graph of the FlowQuery registry, bound with `USE GRAPH fn($request)`
 * (the default graph) or `USE GRAPH name = fn($request)` (a named graph).
 *
 * Labels and relationship types without a `CREATE VIRTUAL` definition
 * are read from, and written to, the default graph; labels qualified
 * with a graph name (`(:hr.Person)`) address that graph.  Every request
 * is the usual versioned source/write request with `graph: true` added
 * (and `graphName` for named graphs); read requests may carry
 * `label: null` (any node) or `type: null` (any relationship), and the
 * function answers with graph rows that keep metadata and user
 * properties apart:
 *
 * - nodes: `{ id, labels: [...], properties: {...} }`
 * - relationships: `{ id, type, left_id, right_id, properties: {...} }`,
 *   plus `left_graph` / `right_graph` when an endpoint belongs to
 *   another graph (or `"virtual"`: a definition node)
 *
 * Capabilities are those the function declares (`static capabilities`,
 * or `static capabilities(request)` called once with
 * `{version: 1, operation: "capabilities", graph: true}`).
 */
export class DefaultGraph {
    public readonly nodeProvider: NodeSourceProvider;
    public readonly relationshipProvider: RelationshipSourceProvider;
    public readonly capabilities: Record<string, any>;

    constructor(
        public readonly name: string,
        public readonly functionClass: any,
        public readonly requestIndex: number,
        public readonly args: any[],
        declared: Record<string, any> | null,
        /** Name the graph is bound under (`"default"` for the default graph). */
        public readonly graphName: string = DEFAULT_GRAPH
    ) {
        const nodeCaps = normalizeCapabilities(
            { ...(declared ?? {}) },
            "node"
        ) as NodeSourceCapabilities;
        const relCaps = normalizeCapabilities(
            { ...(declared ?? {}) },
            "relationship"
        ) as RelationshipSourceCapabilities;
        this.capabilities = { ...nodeCaps };
        if (relCaps.expand !== undefined) this.capabilities.expand = relCaps.expand;
        this.nodeProvider = {
            capabilities: nodeCaps,
            scan: (request, context) => this.read(request, context, "node"),
            lookup: (request, context) => this.read(request, context, "node"),
        };
        this.relationshipProvider = {
            capabilities: relCaps,
            scan: (request, context) => this.read(request, context, "relationship"),
            expand: (request, context) => this.read(request, context, "relationship"),
        };
        validateNodeProvider(this.nodeProvider, this.description);
        validateRelationshipProvider(this.relationshipProvider, this.description);
    }

    public get isDefault(): boolean {
        return this.graphName === DEFAULT_GRAPH;
    }
    public get description(): string {
        return this.isDefault
            ? `default graph ${this.name}`
            : `graph ${this.graphName} (${this.name})`;
    }
    public get writable(): boolean {
        return this.nodeProvider.capabilities.writes === true;
    }
    public get transactional(): boolean {
        return this.nodeProvider.capabilities.transactions === true;
    }
    public get writeBackend(): WriteBackend {
        return {
            name: this.name,
            functionClass: this.functionClass,
            requestIndex: this.requestIndex,
            args: this.args,
            graph: true,
            graphName: this.graphName,
        };
    }
    /** The request envelope additions identifying this graph. */
    public tag(request: Record<string, any>): Record<string, any> {
        return this.isDefault
            ? { ...request, graph: true }
            : { ...request, graph: true, graphName: this.graphName };
    }

    private async *read(
        request: Record<string, any>,
        context: SourceReadContext,
        kind: "node" | "relationship"
    ): AsyncGenerator<SourceRow[]> {
        const fn = FunctionFactory.createAsync(this.name);
        fn.sourceContext = contextOf(context);
        await fn.prepareContext();
        const args = [...this.args];
        args[this.requestIndex] = this.tag(request);
        const pageSize = Math.max(1, request.pageSize ?? 256);
        let page: SourceRow[] = [];
        for await (const item of fn.generate(...args)) {
            const row =
                kind === "node" ? this.nodeRow(item, request) : this.relationshipRow(item, request);
            if (row === null) continue;
            page.push(row);
            if (page.length >= pageSize) {
                yield page;
                page = [];
            }
        }
        if (page.length > 0) yield page;
    }

    private invalid(request: Record<string, any>, what: string): SourceResponseError {
        return new SourceResponseError(
            `Source ${this.description}: ${request.operation}() returned ${what}`,
            this.description,
            request.operation
        );
    }

    private properties(row: any, request: Record<string, any>): Record<string, any> {
        const properties = row.properties ?? {};
        if (properties === null || typeof properties !== "object" || Array.isArray(properties)) {
            throw this.invalid(request, "a row whose properties is not a map");
        }
        return properties;
    }

    /** Validate a node row and convert it, or `null` when it is not part of the answer. */
    private nodeRow(row: any, request: Record<string, any>): SourceRow | null {
        if (row === null || typeof row !== "object" || Array.isArray(row)) {
            throw this.invalid(request, "a row that is not an object");
        }
        if (row.id === undefined || row.id === null) {
            throw this.invalid(request, "a node row without id");
        }
        const labels = row.labels ?? [];
        if (!Array.isArray(labels) || labels.some((l: any) => typeof l !== "string")) {
            throw this.invalid(request, "a node row whose labels is not a list of strings");
        }
        const properties = this.properties(row, request);
        const wanted: string[] = request.labels ?? (request.label != null ? [request.label] : []);
        if (!wanted.every((label) => labels.includes(label))) return null;
        // Labels with a CREATE VIRTUAL definition are served by that
        // definition only, so the default graph never bypasses it.  Named
        // graphs are separate namespaces and are not shadowed.
        if (this.isDefault) {
            const defined = Database.getInstance().nodes;
            if (labels.some((label: string) => defined.has(label))) return null;
        }
        return graphNodeRecord(row.id, labels, properties, this.graphName);
    }

    private relationshipRow(row: any, request: Record<string, any>): SourceRow | null {
        if (row === null || typeof row !== "object" || Array.isArray(row)) {
            throw this.invalid(request, "a row that is not an object");
        }
        if (row.id === undefined || row.id === null) {
            throw this.invalid(request, "a relationship row without id");
        }
        if (typeof row.type !== "string") {
            throw this.invalid(request, "a relationship row without type");
        }
        if (!("left_id" in row) || !("right_id" in row)) {
            throw this.invalid(request, "a relationship row without left_id/right_id");
        }
        const properties = this.properties(row, request);
        const leftGraph = this.endpointGraph(row.left_graph, request);
        const rightGraph = this.endpointGraph(row.right_graph, request);
        if (request.type != null && row.type !== request.type) return null;
        if (this.isDefault && Database.getInstance().relationships.has(row.type)) return null;
        return graphRelationshipRecord(
            row.id,
            row.type,
            row.left_id,
            row.right_id,
            properties,
            this.graphName,
            leftGraph,
            rightGraph
        );
    }

    /** Namespace of a relationship endpoint (`left_graph` / `right_graph`, else this graph). */
    private endpointGraph(value: any, request: Record<string, any>): string {
        if (value === undefined || value === null) return this.graphName;
        if (typeof value !== "string") {
            throw this.invalid(
                request,
                "a relationship row whose left_graph/right_graph is not a string"
            );
        }
        return value;
    }
}

export default DefaultGraph;
