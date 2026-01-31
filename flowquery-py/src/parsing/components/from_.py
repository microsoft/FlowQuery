"""From component node."""

from typing import Any

from ..ast_node import ASTNode


class From(ASTNode):
    """Represents a FROM clause in LOAD operations."""

    def value(self) -> Any:
        return self.children[0].value()
