"""Headers component node."""

from typing import Dict

from ..ast_node import ASTNode


class Headers(ASTNode):
    """Represents a HEADERS clause in LOAD operations."""

    def value(self) -> Dict:
        return self.first_child().value() or {}
