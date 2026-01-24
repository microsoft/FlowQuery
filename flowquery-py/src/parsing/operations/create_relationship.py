"""Represents a CREATE operation for creating virtual relationships."""

from typing import Any, Dict, List

from .operation import Operation
from ..ast_node import ASTNode


class CreateRelationship(Operation):
    """Represents a CREATE operation for creating virtual relationships."""

    def __init__(self, relationship, statement: ASTNode):
        super().__init__()
        self._relationship = relationship
        self._statement = statement

    @property
    def relationship(self):
        return self._relationship

    @property
    def statement(self) -> ASTNode:
        return self._statement

    async def run(self) -> None:
        if self._relationship is None:
            raise ValueError("Relationship is null")
        from ...graph.database import Database
        db = Database.get_instance()
        db.add_relationship(self._relationship, self._statement)

    @property
    def results(self) -> List[Dict[str, Any]]:
        return []
