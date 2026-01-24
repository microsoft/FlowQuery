"""Relationship data class for FlowQuery."""

from typing import Any, Dict, List, Optional, TypedDict

from .data import Data


class RelationshipRecord(TypedDict, total=False):
    """Represents a relationship record from the database."""
    left_id: str
    right_id: str


class RelationshipData(Data):
    """Relationship data class extending Data with left_id-based indexing."""

    def __init__(self, records: Optional[List[Dict[str, Any]]] = None):
        super().__init__(records)
        self._build_index("left_id")

    def find(self, left_id: str, hop: int = 0) -> bool:
        """Find a relationship by start node ID."""
        return self._find(left_id, hop)

    def properties(self) -> Optional[Dict[str, Any]]:
        """Get properties of current relationship, excluding left_id and right_id."""
        current = self.current()
        if current:
            props = dict(current)
            props.pop("left_id", None)
            props.pop("right_id", None)
            return props
        return None
