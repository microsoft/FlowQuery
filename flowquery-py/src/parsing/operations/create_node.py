"""Represents a CREATE operation for creating virtual nodes."""

from typing import Any, Dict, List

from .operation import Operation
from ..ast_node import ASTNode


class CreateNode(Operation):
    """Represents a CREATE operation for creating virtual nodes."""

    def __init__(self, node, statement: ASTNode):
        super().__init__()
        self._node = node
        self._statement = statement

    @property
    def node(self):
        return self._node

    @property
    def statement(self) -> ASTNode:
        return self._statement

    async def run(self) -> None:
        if self._node is None:
            raise ValueError("Node is null")
        from ...graph.database import Database
        db = Database.get_instance()
        db.add_node(self._node, self._statement)

    @property
    def results(self) -> List[Dict[str, Any]]:
        return []
