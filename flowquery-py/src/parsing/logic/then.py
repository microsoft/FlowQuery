"""Represents a THEN clause in a CASE expression."""

from typing import Any

from ..ast_node import ASTNode


class Then(ASTNode):
    """Represents a THEN clause in a CASE expression."""

    def value(self) -> Any:
        return self.get_children()[0].value()
