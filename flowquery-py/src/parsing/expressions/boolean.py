"""Represents a boolean literal in the AST."""

from ..ast_node import ASTNode


class Boolean(ASTNode):
    """Represents a boolean literal in the AST."""

    def __init__(self, value: str):
        super().__init__()
        _value = value.upper()
        if _value == "TRUE":
            self._value = True
        elif _value == "FALSE":
            self._value = False
        else:
            raise ValueError(f"Invalid boolean value: {value}")

    def value(self) -> bool:
        return self._value
