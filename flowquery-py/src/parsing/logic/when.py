"""Represents a WHEN clause in a CASE expression."""

from ..ast_node import ASTNode


class When(ASTNode):
    """Represents a WHEN clause in a CASE expression."""

    def value(self) -> bool:
        return self.get_children()[0].value()
