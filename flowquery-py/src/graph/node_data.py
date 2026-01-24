"""Node data class for FlowQuery."""

from typing import Any, Dict, List, Optional, TypedDict

from .data import Data


class NodeRecord(TypedDict, total=False):
    """Represents a node record from the database."""
    id: str


class NodeData(Data):
    """Node data class extending Data with ID-based indexing."""

    def __init__(self, records: Optional[List[Dict[str, Any]]] = None):
        super().__init__(records)
        self._build_index("id")

    def find(self, id_: str, hop: int = 0) -> bool:
        """Find a record by ID."""
        return self._find(id_, hop)

    def current(self, hop: int = 0) -> Optional[Dict[str, Any]]:
        """Get the current record."""
        return super().current(hop)
