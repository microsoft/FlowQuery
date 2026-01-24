"""Represents a reference to a previously defined variable or expression."""

from typing import Any, Optional

from ..ast_node import ASTNode
from .identifier import Identifier


class Reference(Identifier):
    """Represents a reference to a previously defined variable or expression.
    
    References point to values defined earlier in the query (e.g., in WITH or LOAD statements).
    
    Example:
        ref = Reference("myVar", previous_node)
        print(ref.value())  # Gets value from referred node
    """

    def __init__(self, value: str, referred: Optional[ASTNode] = None):
        """Creates a new Reference to a variable.
        
        Args:
            value: The identifier name
            referred: The node this reference points to (optional)
        """
        super().__init__(value)
        self._referred = referred

    @property
    def referred(self) -> Optional[ASTNode]:
        return self._referred

    @referred.setter
    def referred(self, node: ASTNode) -> None:
        self._referred = node

    def __str__(self) -> str:
        return f"Reference ({self._value})"

    def value(self) -> Any:
        if self._referred is not None:
            return self._referred.value()
        return None

    @property
    def identifier(self) -> str:
        return self._value
