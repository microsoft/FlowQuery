"""Collector for relationship match records."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, List, Optional, TypedDict, Union

if TYPE_CHECKING:
    from .node import Node
    from .relationship import Relationship


class RelationshipMatchRecord(TypedDict, total=False):
    """Represents a matched relationship record."""
    type: str
    startNode: Any
    endNode: Any
    properties: Dict[str, Any]


class RelationshipMatchCollector:
    """Collects relationship matches during graph traversal."""

    def __init__(self) -> None:
        self._matches: List[RelationshipMatchRecord] = []
        self._node_ids: List[str] = []

    def push(self, relationship: 'Relationship') -> RelationshipMatchRecord:
        """Push a new match onto the collector."""
        start_node_value = relationship.source.value() if relationship.source else None
        match: RelationshipMatchRecord = {
            "type": relationship.type or "",
            "startNode": start_node_value or {},
            "endNode": None,
            "properties": relationship.properties,
        }
        self._matches.append(match)
        if isinstance(start_node_value, dict):
            self._node_ids.append(start_node_value.get("id", ""))
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
            self._node_ids.pop()
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

    def is_circular(self) -> bool:
        """Check if the collected relationships form a circular pattern."""
        seen = set(self._node_ids)
        return len(seen) < len(self._node_ids)
