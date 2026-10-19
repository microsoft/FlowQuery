import Database from "../../graph/database";
import { qualifiedLabel } from "../../graph/namespaces";
import AsyncFunction from "./async_function";
import { FunctionDef } from "./function_metadata";

/**
 * Built-in function listing every virtual node and relationship with the
 * source capabilities FlowQuery plans against.  Use it to see which
 * operations and filters reach a backend.
 *
 * Nodes: {kind: 'node', label, mode, capabilities}
 * Relationships: {kind: 'relationship', type, from_label, to_label, mode, capabilities}
 * Graphs: {kind: 'graph', name, function, mode: 'graph', capabilities}
 *
 * `mode` is `'eager'` (legacy definition, no capabilities),
 * `'statement'` (`CREATE VIRTUAL` opted into the source contract) or
 * `'provider'` (registered provider object).
 *
 * @example
 * ```
 * LOAD JSON FROM source_capabilities() AS s RETURN s
 * ```
 */
@FunctionDef({
    description:
        "Lists virtual nodes and relationships with their effective source capabilities (lookup, expand, predicate push-down, streaming, writes).",
    category: "async",
    parameters: [],
    output: {
        description: "Entry with kind, label or type/endpoints, mode and capabilities",
        type: "object",
    },
    examples: ["LOAD JSON FROM source_capabilities() AS s RETURN s"],
})
class SourceCapabilities extends AsyncFunction {
    constructor() {
        super("source_capabilities");
        this._expectedParameterCount = 0;
    }
    public async *generate(): AsyncGenerator<any> {
        const db = Database.getInstance();
        const modeOf = (physical: any) =>
            physical.provider === null
                ? "eager"
                : physical.statement !== null
                  ? "statement"
                  : "provider";
        for (const [label, physical] of db.nodes) {
            yield {
                kind: "node",
                label,
                mode: modeOf(physical),
                capabilities: physical.provider?.capabilities ?? null,
            };
        }
        for (const [type, byEndpoints] of db.relationships) {
            for (const physical of byEndpoints.values()) {
                yield {
                    kind: "relationship",
                    type,
                    from_label: qualifiedLabel(physical.source),
                    to_label: qualifiedLabel(physical.target),
                    mode: modeOf(physical),
                    capabilities: physical.provider?.capabilities ?? null,
                };
            }
        }
        const graphs = this.sourceContext !== null ? this.sourceContext.graphs : db.graphs;
        for (const graph of graphs.values()) {
            yield {
                kind: "graph",
                name: graph.graphName,
                function: graph.name,
                mode: "graph",
                capabilities: graph.capabilities,
            };
        }
    }
}

export default SourceCapabilities;
