from typing import Any, AsyncGenerator, Optional

from ..parsing.ast_node import ASTNode
from .graph_records import is_graph_record, origin_matches
from .relationship import Relationship


class RelationshipReference(Relationship):
    """Represents a reference to an existing relationship variable."""

    def __init__(self, relationship: Relationship, referred: ASTNode) -> None:
        super().__init__()
        self._referred = referred
        if relationship.types:
            self.types = relationship.types

    @property
    def referred(self) -> ASTNode:
        return self._referred

    def value(self) -> Optional[Any]:
        return self._referred.value() if self._referred else None

    async def find(
        self, left_id: Any, hop: int = 0, origin: Optional[bool] = None
    ) -> AsyncGenerator[None, None]:
        """Follow the relationship bound to the referenced variable.  ``origin``
        keeps the step within that relationship's graph."""
        referred = self._referred
        data = referred.current_record(hop) if isinstance(referred, Relationship) else None
        if data is None or not origin_matches(data, origin):
            return
        assert isinstance(referred, Relationship)
        self.set_value(referred)
        follow_id = "left_id" if self._direction == "left" else "right_id"
        if self._target is not None:
            async for _ in self._target.find(data.get(follow_id), hop, is_graph_record(data)):
                yield
        else:
            yield
