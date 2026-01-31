"""Headers component node."""

from typing import Any, Dict

from ..ast_node import ASTNode


class Headers(ASTNode):
    """Represents a HEADERS clause in LOAD operations."""

    def value(self) -> Dict[str, Any]:
        return self.first_child().value() or {}
