"""Collector for relationship match records."""

from typing import Any, Dict, List, Optional, TYPE_CHECKING, TypedDict, Union

if TYPE_CHECKING:
    from .relationship import Relationship
    from .node import Node


class RelationshipMatchRecord(TypedDict, total=False):
    """Represents a matched relationship record."""
    type: str
    startNode: Dict[str, Any]
    endNode: Optional[Dict[str, Any]]
    properties: Dict[str, Any]


class RelationshipMatchCollector:
    """Collects relationship matches during graph traversal."""

    def __init__(self):
        self._matches: List[RelationshipMatchRecord] = []
        self._node_ids: List[str] = []

    def push(self, relationship: 'Relationship') -> RelationshipMatchRecord:
        """Push a new match onto the collector."""
        match: RelationshipMatchRecord = {
            "type": relationship.type or "",
            "startNode": relationship.source.value() if relationship.source else {},
            "endNode": None,
            "properties": relationship.properties,
        }
        self._matches.append(match)
        start_node_value = match.get("startNode", {})
        if isinstance(start_node_value, dict):
            self._node_ids.append(start_node_value.get("id", ""))
        return match

    @property
    def end_node(self) -> Optional[Dict[str, Any]]:
        """Get the end node of the last match."""
        if self._matches:
            return self._matches[-1].get("endNode")
        return None

    @end_node.setter
    def end_node(self, node: 'Node') -> None:
        """Set the end node of the last match."""
        if self._matches:
            self._matches[-1]["endNode"] = node.value()

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
