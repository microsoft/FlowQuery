"""Represents an identifier in the AST."""

from .string import String
from typing import Any


class Identifier(String):
    """Represents an identifier in the AST.
    
    Identifiers are used for variable names, property names, and similar constructs.
    
    Example:
        id = Identifier("myVariable")
    """

    def __str__(self) -> str:
        return f"Identifier ({self._value})"

    def value(self) -> Any:
        return super().value()
