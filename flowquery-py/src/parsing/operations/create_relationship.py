"""Represents a CREATE operation for creating virtual relationships."""

from typing import Any, Dict, List, Optional

from ...graph.database import Database
from ...graph.relationship import Relationship
from ..ast_node import ASTNode
from .operation import Operation


class CreateRelationship(Operation):
    """Represents a CREATE operation for creating virtual relationships."""

    def __init__(
        self,
        relationship: Relationship,
        statement: ASTNode,
        is_static: bool = False,
        refresh_every_ms: Optional[int] = None,
    ) -> None:
        super().__init__()
        self._relationship = relationship
        self._statement = statement
        self._is_static = is_static
        self._refresh_every_ms = refresh_every_ms

    @property
    def relationship(self) -> Relationship:
        return self._relationship

    @property
    def statement(self) -> ASTNode:
        return self._statement

    @property
    def is_static(self) -> bool:
        return self._is_static

    @property
    def refresh_every_ms(self) -> Optional[int]:
        return self._refresh_every_ms

    async def run(self) -> None:
        if self._relationship is None:
            raise ValueError("Relationship is null")
        db = Database.get_instance()
        db.add_relationship(
            self._relationship,
            self._statement,
            self._is_static,
            self._refresh_every_ms,
        )

    @property
    def results(self) -> List[Dict[str, Any]]:
        return []
