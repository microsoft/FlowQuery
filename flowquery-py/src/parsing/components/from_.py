"""From component node."""

from ..ast_node import ASTNode


class From(ASTNode):
    """Represents a FROM clause in LOAD operations."""

    def value(self) -> str:
        return self.children[0].value()
