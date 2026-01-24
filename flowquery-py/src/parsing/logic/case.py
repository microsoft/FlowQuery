"""Represents a CASE expression in the AST."""

from typing import Any

from ..ast_node import ASTNode
from .when import When
from .then import Then


class Case(ASTNode):
    """Represents a CASE expression in the AST."""

    def value(self) -> Any:
        i = 0
        children = self.get_children()
        child = children[i]
        while isinstance(child, When):
            then = children[i + 1]
            if child.value():
                return then.value()
            i += 2
            if i < len(children):
                child = children[i]
            else:
                break
        # Return the else clause if exists
        if i < len(children):
            return children[i].value()
        return None
