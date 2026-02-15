"""Relationship data class for FlowQuery."""

from typing import Any, Dict, List, Optional, TypedDict

from .data import Data


class RelationshipRecord(TypedDict, total=False):
    """Represents a relationship record from the database."""
    left_id: str
    right_id: str


class RelationshipData(Data):
    """Relationship data class extending Data with left_id and right_id indexing."""

    def __init__(self, records: Optional[List[Dict[str, Any]]] = None):
        super().__init__(records)
        self._build_index("left_id")
        self._build_index("right_id")

    def find(self, id: str, hop: int = 0, direction: str = "right") -> bool:
        """Find a relationship by node ID and direction."""
        key = "right_id" if direction == "left" else "left_id"
        return self._find(id, hop, key)

    def properties(self) -> Optional[Dict[str, Any]]:
        """Get properties of current relationship, excluding left_id, right_id, and _type."""
        current = self.current()
        if current:
            props = dict(current)
            props.pop("left_id", None)
            props.pop("right_id", None)
            props.pop("_type", None)
            return props
        return None
