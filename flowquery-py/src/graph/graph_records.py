"""Internal records of entities read from, or written to, a graph bound
with ``USE GRAPH [name =] fn($request)``.

A graph backend returns rows that keep metadata and user
properties apart:

- nodes: ``{id, labels: [...], properties: {...}}``
- relationships: ``{id, type, left_id, right_id, properties: {...}}``

FlowQuery binds them as flat records (user properties plus ``id``, and
``left_id`` / ``right_id`` for relationships) so property access works
exactly like for virtual definitions.  Metadata wins in that flat
view; the exact stored labels, type and user properties travel in
internal keys that are never returned to callers.
"""

from __future__ import annotations

import copy
from typing import Any, Callable, Dict, List, Mapping, Optional, TypeVar

#: The graph bound with an unnamed ``USE GRAPH`` (also ``USE GRAPH default = ...``).
DEFAULT_GRAPH = "default"
#: Namespace of ``CREATE VIRTUAL`` definition entities.  Reserved: no graph
#: can be bound under this name.
VIRTUAL_NAMESPACE = "virtual"

#: Name of the graph a record belongs to (absent for definition records).
GRAPH_KEY = "_graph"
#: All stored labels of a graph node.
LABELS_KEY = "_labels"
#: Exact user properties of a graph entity.
PROPERTIES_KEY = "_properties"
#: Namespace of a relationship's left endpoint, when it differs from the relationship's.
LEFT_NAMESPACE_KEY = "_leftGraph"
#: Namespace of a relationship's right endpoint, when it differs from the relationship's.
RIGHT_NAMESPACE_KEY = "_rightGraph"

_graph_records_seen = False

T = TypeVar("T")
R = TypeVar("R")


def graph_records_in_use() -> bool:
    """True once any graph record was built (enables result cleanup)."""
    return _graph_records_seen


def is_graph_record(value: Any) -> bool:
    return isinstance(value, dict) and isinstance(value.get(GRAPH_KEY), str)


def namespace_of(record: Any) -> str:
    """Namespace of an entity: the name of the graph it was read from or
    written to, or :data:`VIRTUAL_NAMESPACE` for definition entities.
    Ids are only meaningful within their namespace."""
    if is_graph_record(record):
        graph: str = record[GRAPH_KEY]
        return graph
    return VIRTUAL_NAMESPACE


def endpoint_namespace(record: Any, side: str) -> str:
    """Namespace of the node at the ``side`` endpoint of a relationship record."""
    key = LEFT_NAMESPACE_KEY if side == "left" else RIGHT_NAMESPACE_KEY
    ns = record.get(key) if isinstance(record, dict) else None
    return ns if isinstance(ns, str) else namespace_of(record)


def common_namespace(records: List[R], of: Callable[[R], str]) -> Optional[str]:
    """Common value of ``of`` over ``records``, or None when empty or mixed."""
    if len(records) == 0:
        return None
    first = of(records[0])
    for record in records:
        if of(record) != first:
            return None
    return first


def common_origin(records: List[Dict[str, Any]]) -> Optional[str]:
    """Common namespace of node records."""
    return common_namespace(records, namespace_of)


def origin_matches(record: Any, origin: Optional[str]) -> bool:
    """True when node ``record`` may join a traversal step constrained to namespace ``origin``."""
    return origin is None or namespace_of(record) == origin


def endpoint_matches(record: Any, side: str, origin: Optional[str]) -> bool:
    """True when the ``side`` endpoint of relationship ``record`` is in namespace ``origin``."""
    return origin is None or endpoint_namespace(record, side) == origin


def with_endpoint_namespaces(row: Dict[str, Any], left: str, right: str) -> Dict[str, Any]:
    """Tag a definition relationship row with the namespaces of its endpoints
    when they are graphs (definition endpoints default to definitions)."""
    if left == VIRTUAL_NAMESPACE and right == VIRTUAL_NAMESPACE:
        return row
    out = dict(row)
    if left != VIRTUAL_NAMESPACE:
        out[LEFT_NAMESPACE_KEY] = left
    if right != VIRTUAL_NAMESPACE:
        out[RIGHT_NAMESPACE_KEY] = right
    return out


def graph_node_record(
    id_: Any,
    labels: List[str],
    properties: Dict[str, Any],
    graph: str = DEFAULT_GRAPH,
) -> Dict[str, Any]:
    global _graph_records_seen
    _graph_records_seen = True
    return {
        **properties,
        "id": id_,
        LABELS_KEY: list(labels),
        PROPERTIES_KEY: dict(properties),
        GRAPH_KEY: graph,
    }


def graph_relationship_record(
    id_: Any,
    type_: str,
    left_id: Any,
    right_id: Any,
    properties: Dict[str, Any],
    graph: str = DEFAULT_GRAPH,
    left_graph: Optional[str] = None,
    right_graph: Optional[str] = None,
) -> Dict[str, Any]:
    global _graph_records_seen
    _graph_records_seen = True
    record: Dict[str, Any] = {
        **properties,
        "id": id_,
        "left_id": left_id,
        "right_id": right_id,
        "_type": type_,
        PROPERTIES_KEY: dict(properties),
        GRAPH_KEY: graph,
    }
    if left_graph is not None and left_graph != graph:
        record[LEFT_NAMESPACE_KEY] = left_graph
    if right_graph is not None and right_graph != graph:
        record[RIGHT_NAMESPACE_KEY] = right_graph
    return record


def labels_of(value: Mapping[str, Any]) -> List[str]:
    """Stored labels of a node value (``_labels``, else its matched ``_label``)."""
    labels = value.get(LABELS_KEY)
    if isinstance(labels, list):
        return list(labels)
    label = value.get("_label")
    return [label] if label else []


def user_properties(value: Mapping[str, Any]) -> Optional[Dict[str, Any]]:
    """User properties of an entity value (exact for default-graph records)."""
    properties = value.get(PROPERTIES_KEY)
    return properties if isinstance(properties, dict) else None


def _contains_graph_record(value: Any) -> bool:
    if isinstance(value, list):
        return any(_contains_graph_record(item) for item in value)
    if isinstance(value, dict):
        if is_graph_record(value):
            return True
        return any(_contains_graph_record(item) for item in value.values())
    return False


def without_graph_keys(value: T) -> T:
    """A result value without the internal keys of graph records:
    ``value`` itself when it holds none, otherwise a cleaned deep copy."""
    if not _graph_records_seen or not _contains_graph_record(value):
        return value
    result: T = strip_graph_keys(copy.deepcopy(value))
    return result


def strip_graph_keys(value: Any) -> Any:
    """Remove the internal keys of graph records, in place,
    throughout a result value.  Other values are left untouched."""
    if not _graph_records_seen:
        return value
    if isinstance(value, list):
        for item in value:
            strip_graph_keys(item)
        return value
    if isinstance(value, dict):
        if is_graph_record(value):
            value.pop(GRAPH_KEY, None)
            value.pop(LABELS_KEY, None)
            value.pop(PROPERTIES_KEY, None)
            value.pop(LEFT_NAMESPACE_KEY, None)
            value.pop(RIGHT_NAMESPACE_KEY, None)
            value.pop("_label", None)
            value.pop("_type", None)
        for key in list(value.keys()):
            strip_graph_keys(value[key])
    return value
