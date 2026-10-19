"""Internal records of entities read from, or written to, the default
graph (``USE GRAPH fn($request)``).

A default-graph backend returns rows that keep metadata and user
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
from typing import Any, Dict, List, Mapping, Optional, TypeVar

#: Marks a record that belongs to the default graph (provenance).
GRAPH_KEY = "_graph"
#: All stored labels of a default-graph node.
LABELS_KEY = "_labels"
#: Exact user properties of a default-graph entity.
PROPERTIES_KEY = "_properties"

_graph_records_seen = False

T = TypeVar("T")


def graph_records_in_use() -> bool:
    """True once any default-graph record was built (enables result cleanup)."""
    return _graph_records_seen


def is_graph_record(value: Any) -> bool:
    return isinstance(value, dict) and value.get(GRAPH_KEY) is True


def common_origin(records: List[Dict[str, Any]]) -> Optional[bool]:
    """Common provenance of a list of records: True, False, or None when mixed."""
    if len(records) == 0:
        return None
    first = is_graph_record(records[0])
    for record in records:
        if is_graph_record(record) != first:
            return None
    return first


def origin_matches(record: Any, origin: Optional[bool]) -> bool:
    """True when ``record`` may join a traversal step constrained to ``origin``."""
    return origin is None or is_graph_record(record) == origin


def graph_node_record(id_: Any, labels: List[str], properties: Dict[str, Any]) -> Dict[str, Any]:
    global _graph_records_seen
    _graph_records_seen = True
    return {
        **properties,
        "id": id_,
        LABELS_KEY: list(labels),
        PROPERTIES_KEY: dict(properties),
        GRAPH_KEY: True,
    }


def graph_relationship_record(
    id_: Any,
    type_: str,
    left_id: Any,
    right_id: Any,
    properties: Dict[str, Any],
) -> Dict[str, Any]:
    global _graph_records_seen
    _graph_records_seen = True
    return {
        **properties,
        "id": id_,
        "left_id": left_id,
        "right_id": right_id,
        "_type": type_,
        PROPERTIES_KEY: dict(properties),
        GRAPH_KEY: True,
    }


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
        if value.get(GRAPH_KEY) is True:
            return True
        return any(_contains_graph_record(item) for item in value.values())
    return False


def without_graph_keys(value: T) -> T:
    """A result value without the internal keys of default-graph records:
    ``value`` itself when it holds none, otherwise a cleaned deep copy."""
    if not _graph_records_seen or not _contains_graph_record(value):
        return value
    result: T = strip_graph_keys(copy.deepcopy(value))
    return result


def strip_graph_keys(value: Any) -> Any:
    """Remove the internal keys of default-graph records, in place,
    throughout a result value.  Other values are left untouched."""
    if not _graph_records_seen:
        return value
    if isinstance(value, list):
        for item in value:
            strip_graph_keys(item)
        return value
    if isinstance(value, dict):
        if value.get(GRAPH_KEY) is True:
            value.pop(GRAPH_KEY, None)
            value.pop(LABELS_KEY, None)
            value.pop(PROPERTIES_KEY, None)
            value.pop("_label", None)
            value.pop("_type", None)
        for key in list(value.keys()):
            strip_graph_keys(value[key])
    return value
