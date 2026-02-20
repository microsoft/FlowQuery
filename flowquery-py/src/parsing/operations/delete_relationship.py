"""Represents a DELETE operation for deleting virtual relationships."""

from typing import Any, Dict, List

from ...graph.database import Database
from ...graph.relationship import Relationship
from .operation import Operation


class DeleteRelationship(Operation):
    """Represents a DELETE operation for deleting virtual relationships."""

    def __init__(self, relationship: Relationship) -> None:
        super().__init__()
        self._relationship = relationship

    @property
    def relationship(self) -> Relationship:
        return self._relationship

    async def run(self) -> None:
        if self._relationship is None:
            raise ValueError("Relationship is null")
        db = Database.get_instance()
        db.remove_relationship(self._relationship)

    @property
    def results(self) -> List[Dict[str, Any]]:
        return []
