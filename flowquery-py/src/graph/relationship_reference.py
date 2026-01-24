"""Relationship reference for FlowQuery."""

from .relationship import Relationship
from ..parsing.ast_node import ASTNode


class RelationshipReference(Relationship):
    """Represents a reference to an existing relationship variable."""

    def __init__(self, relationship: Relationship, referred: ASTNode):
        super().__init__()
        self._referred = referred
        if relationship.type:
            self.type = relationship.type

    @property
    def referred(self) -> ASTNode:
        return self._referred

    def value(self):
        return self._referred.value() if self._referred else None
