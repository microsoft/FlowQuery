"""Collector for relationship match records."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, List, Optional, Union

from .graph_records import GRAPH_KEY, is_graph_record, user_properties

if TYPE_CHECKING:
    from .node import Node
    from .relationship import Relationship

# A relationship match record is a plain dict with known keys (type,
# startNode, endNode, properties) plus any extra relationship-property
# keys spread at the top level – mirroring the TypeScript version that
# uses an index signature ``[key: string]: any``.
RelationshipMatchRecord = Dict[str, Any]

_UNSET: Any = object()


class RelationshipMatchCollector:
    """Collects relationship matches during graph traversal."""

    def __init__(self) -> None:
        self._matches: List[RelationshipMatchRecord] = []
        self._node_ids: List[str] = []
        self._node_id_set: set[str] = set()

    def push(
        self,
        relationship: 'Relationship',
        traversal_id: str = "",
        record: Any = _UNSET,
    ) -> RelationshipMatchRecord:
        """Push a new match onto the collector.

        Provider-backed relationships supply the bound row explicitly (or
        expose it via ``current_record``) instead of a data cursor.
        """
        start_node_value = relationship.source.value() if relationship.source else None
        rel_data = relationship.get_data()
        explicit = record is not _UNSET or relationship.access is not None
        current_record: Any
        if explicit:
            current_record = (
                record
                if record is not _UNSET and record is not None
                else relationship.current_record(0)
            )
        else:
            current_record = rel_data.current() if rel_data else None
        default_type = relationship.type or ""
        if current_record and isinstance(current_record, dict):
            actual_type = current_record.get('_type', default_type)
        else:
            actual_type = default_type
        rel_props: Dict[str, Any]
        flat: Optional[Dict[str, Any]] = None
        if is_graph_record(current_record):
            # Default graph: exact user properties; metadata wins in the flat view.
            rel_props = dict(user_properties(current_record) or {})
            flat = {**rel_props, "id": current_record.get("id")}
        elif explicit:
            rel_props = {}
            if isinstance(current_record, dict):
                rel_props = {
                    k: v
                    for k, v in current_record.items()
                    if k not in ("left_id", "right_id", "_type")
                }
        else:
            rel_props = (rel_data.properties() or {}) if rel_data else {}
        match: RelationshipMatchRecord = {
            **(flat if flat is not None else rel_props),
            "type": actual_type,
            "startNode": start_node_value or {},
            "endNode": None,
            "properties": rel_props,
        }
        if flat is not None:
            match[GRAPH_KEY] = True
        # Thread inner virtual sub-query lineage through to the match
        # record so :class:`ProvenanceSites` can attach it to the hop.
        if current_record is not None:
            from .virtual_sources import attach_virtual_source, get_virtual_source

            src = get_virtual_source(current_record)
            if src is not None:
                attach_virtual_source(match, src)
        self._matches.append(match)
        self._node_ids.append(traversal_id)
        self._node_id_set.add(traversal_id)
        return match

    @property
    def end_node(self) -> Any:
        """Get the end node of the last match."""
        if self._matches:
            return self._matches[-1].get("endNode")
        return None

    @end_node.setter
    def end_node(self, node: 'Node') -> None:
        """Set the end node of the last match."""
        if self._matches:
            node_value = node.value()
            self._matches[-1]["endNode"] = node_value if node_value else None

    def pop(self) -> Optional[RelationshipMatchRecord]:
        """Pop the last match from the collector."""
        if self._node_ids:
            removed_id = self._node_ids.pop()
            self._node_id_set.discard(removed_id)
        if self._matches:
            return self._matches.pop()
        return None

    def value(self) -> Optional[Union[RelationshipMatchRecord, List[RelationshipMatchRecord]]]:
        """Get the current value(s)."""
        if len(self._matches) == 0:
            return None
        elif len(self._matches) == 1:
            return self._matches[0]
        else:
            return self._matches

    @property
    def matches(self) -> List[RelationshipMatchRecord]:
        """Get all matches."""
        return self._matches

    def is_circular(self, next_id: str = "") -> bool:
        """Check if traversing to the given node id would form a cycle."""
        return next_id in self._node_id_set
