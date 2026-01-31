"""Represents an identifier in the AST."""

from typing import Any

from .string import String


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
