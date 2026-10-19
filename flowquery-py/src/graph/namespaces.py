"""Graph namespaces of pattern elements and definition endpoints."""

from __future__ import annotations

from typing import TYPE_CHECKING, Mapping, Optional

from .graph_records import DEFAULT_GRAPH, VIRTUAL_NAMESPACE

if TYPE_CHECKING:
    from .default_graph import DefaultGraph
    from .node import Node


def bound_graph(graphs: Mapping[str, 'DefaultGraph'], name: str) -> 'DefaultGraph':
    """The graph bound under ``name``, or an actionable error."""
    graph = graphs.get(name)
    if graph is None:
        raise ValueError(
            "No default graph is bound; bind one with USE GRAPH fn($request)"
            if name == DEFAULT_GRAPH
            else f"Graph {name} is not bound; bind it with USE GRAPH {name} = fn($request)"
        )
    return graph


def definition_endpoint_namespace(
    node: Optional['Node'], graphs: Mapping[str, 'DefaultGraph']
) -> str:
    """Namespace of the nodes at one end of a relationship definition, as
    declared by its endpoint label: a graph-qualified label (``(:hr.Person)``)
    belongs to that graph, a label with a node definition to definitions,
    and any other label to the default graph when one is bound.  Without
    a bound default graph, endpoints are definition nodes as before."""
    from .database import Database

    if node is None:
        return VIRTUAL_NAMESPACE
    if node.graph is not None:
        return node.graph
    label = node.label
    if label is None or label in Database.get_instance().nodes:
        return VIRTUAL_NAMESPACE
    return DEFAULT_GRAPH if DEFAULT_GRAPH in graphs else VIRTUAL_NAMESPACE


def qualified_label(node: Optional['Node']) -> Optional[str]:
    """``hr.Person`` for a graph-qualified label, else the label."""
    if node is None or node.label is None:
        return None
    return f"{node.graph}.{node.label}" if node.graph is not None else node.label
