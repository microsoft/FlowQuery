from typing import Any, AsyncGenerator, Optional

from ..parsing.ast_node import ASTNode
from .graph_records import endpoint_matches, endpoint_namespace
from .relationship import Relationship


class RelationshipReference(Relationship):
    """Represents a reference to an existing relationship variable."""

    def __init__(self, relationship: Relationship, referred: ASTNode) -> None:
        super().__init__()
        self._referred = referred
        if relationship.types:
            self.types = relationship.types
        self.graph = relationship.graph

    @property
    def referred(self) -> ASTNode:
        return self._referred

    def value(self) -> Optional[Any]:
        return self._referred.value() if self._referred else None

    async def find(
        self, left_id: Any, hop: int = 0, origin: Optional[str] = None
    ) -> AsyncGenerator[None, None]:
        """Follow the relationship bound to the referenced variable.  ``origin``
        keeps the step within that relationship's graph."""
        referred = self._referred
        data = referred.current_record(hop) if isinstance(referred, Relationship) else None
        if data is None or not endpoint_matches(data, self.anchor_side, origin):
            return
        assert isinstance(referred, Relationship)
        self.set_value(referred)
        follow_id = "left_id" if self._direction == "left" else "right_id"
        if self._target is not None:
            async for _ in self._target.find(
                data.get(follow_id), hop, endpoint_namespace(data, self.next_side)
            ):
                yield
        else:
            yield
