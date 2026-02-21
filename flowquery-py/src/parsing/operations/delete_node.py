"""Represents a DELETE operation for deleting virtual nodes."""

from typing import Any, Dict, List

from ...graph.database import Database
from ...graph.node import Node
from .operation import Operation


class DeleteNode(Operation):
    """Represents a DELETE operation for deleting virtual nodes."""

    def __init__(self, node: Node) -> None:
        super().__init__()
        self._node = node

    @property
    def node(self) -> Node:
        return self._node

    async def run(self) -> None:
        if self._node is None:
            raise ValueError("Node is null")
        db = Database.get_instance()
        db.remove_node(self._node)

    @property
    def results(self) -> List[Dict[str, Any]]:
        return []
