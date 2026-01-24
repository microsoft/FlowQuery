"""Represents a numeric literal in the AST."""

from ..ast_node import ASTNode


class Number(ASTNode):
    """Represents a numeric literal in the AST.
    
    Parses string representations of numbers into integer or float values.
    
    Example:
        num = Number("42")
        print(num.value())  # 42
    """

    def __init__(self, value: str):
        """Creates a new Number node by parsing the string value.
        
        Args:
            value: The string representation of the number
        """
        super().__init__()
        if '.' in value:
            self._value = float(value)
        else:
            self._value = int(value)

    def value(self) -> float | int:
        return self._value

    def __str__(self) -> str:
        return f"{self.__class__.__name__} ({self._value})"
