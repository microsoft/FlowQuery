from typing import Any, Optional

from ..parsing.ast_node import ASTNode
from .relationship import Relationship


class RelationshipReference(Relationship):
    """Represents a reference to an existing relationship variable."""

    def __init__(self, relationship: Relationship, referred: ASTNode) -> None:
        super().__init__()
        self._referred = referred
        if relationship.type:
            self.type = relationship.type

    @property
    def referred(self) -> ASTNode:
        return self._referred

    def value(self) -> Optional[Any]:
        return self._referred.value() if self._referred else None
