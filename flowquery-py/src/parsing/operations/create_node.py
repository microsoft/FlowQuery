"""Represents a CREATE operation for creating virtual nodes."""

from typing import Any, Dict, List

from ...graph.database import Database
from ...graph.node import Node
from ..ast_node import ASTNode
from .operation import Operation


class CreateNode(Operation):
    """Represents a CREATE operation for creating virtual nodes."""

    def __init__(self, node: Node, statement: ASTNode) -> None:
        super().__init__()
        self._node = node
        self._statement = statement

    @property
    def node(self) -> Node:
        return self._node

    @property
    def statement(self) -> ASTNode:
        return self._statement

    async def run(self) -> None:
        if self._node is None:
            raise ValueError("Node is null")
        db = Database.get_instance()
        db.add_node(self._node, self._statement)

    @property
    def results(self) -> List[Dict[str, Any]]:
        return []
