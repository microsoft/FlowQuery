"""Represents a string literal in the AST."""

from ..ast_node import ASTNode


class String(ASTNode):
    """Represents a string literal in the AST.
    
    Example:
        s = String("hello")
        print(s.value())  # "hello"
    """

    def __init__(self, value: str):
        """Creates a new String node with the given value.
        
        Args:
            value: The string value
        """
        super().__init__()
        self._value = value

    def value(self) -> str:
        return self._value

    def __str__(self) -> str:
        return f"String ({self._value})"
