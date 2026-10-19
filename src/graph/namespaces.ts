import Database from "./database";
import type DefaultGraph from "./default_graph";
import { DEFAULT_GRAPH, VIRTUAL_NAMESPACE } from "./graph_records";
import type Node from "./node";

/** The graph bound under `name`, or an actionable error. */
export function boundGraph(graphs: ReadonlyMap<string, DefaultGraph>, name: string): DefaultGraph {
    const graph = graphs.get(name);
    if (graph === undefined) {
        throw new Error(
            name === DEFAULT_GRAPH
                ? "No default graph is bound; bind one with USE GRAPH fn($request)"
                : `Graph ${name} is not bound; bind it with USE GRAPH ${name} = fn($request)`
        );
    }
    return graph;
}

/**
 * Namespace of the nodes at one end of a relationship definition, as
 * declared by its endpoint label: a graph-qualified label (`(:hr.Person)`)
 * belongs to that graph, a label with a node definition to definitions,
 * and any other label to the default graph when one is bound.  Without
 * a bound default graph, endpoints are definition nodes as before.
 */
export function definitionEndpointNamespace(
    node: Node | null,
    graphs: ReadonlyMap<string, DefaultGraph>
): string {
    if (node === null) return VIRTUAL_NAMESPACE;
    if (node.graph !== null) return node.graph;
    const label = node.label;
    if (label === null || Database.getInstance().nodes.has(label)) return VIRTUAL_NAMESPACE;
    return graphs.has(DEFAULT_GRAPH) ? DEFAULT_GRAPH : VIRTUAL_NAMESPACE;
}

/** `hr.Person` for a graph-qualified label, else the label. */
export function qualifiedLabel(node: Node | null): string | null {
    if (node === null || node.label === null) return null;
    return node.graph !== null ? `${node.graph}.${node.label}` : node.label;
}
