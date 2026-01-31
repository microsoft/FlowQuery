"""Represents a CREATE operation for creating virtual relationships."""

from typing import Any, Dict, List

from ...graph.database import Database
from ...graph.relationship import Relationship
from ..ast_node import ASTNode
from .operation import Operation


class CreateRelationship(Operation):
    """Represents a CREATE operation for creating virtual relationships."""

    def __init__(self, relationship: Relationship, statement: ASTNode) -> None:
        super().__init__()
        self._relationship = relationship
        self._statement = statement

    @property
    def relationship(self) -> Relationship:
        return self._relationship

    @property
    def statement(self) -> ASTNode:
        return self._statement

    async def run(self) -> None:
        if self._relationship is None:
            raise ValueError("Relationship is null")
        db = Database.get_instance()
        db.add_relationship(self._relationship, self._statement)

    @property
    def results(self) -> List[Dict[str, Any]]:
        return []
