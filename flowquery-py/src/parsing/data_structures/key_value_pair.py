"""Represents a key-value pair in an associative array."""

from typing import Any

from ..ast_node import ASTNode
from ..expressions.string import String


class KeyValuePair(ASTNode):
    """Represents a key-value pair in an associative array.
    
    Used to build object literals in FlowQuery.
    
    Example:
        kvp = KeyValuePair("name", String("Alice"))
    """

    def __init__(self, key: str, value: ASTNode):
        """Creates a new key-value pair.
        
        Args:
            key: The key string
            value: The AST node representing the value
        """
        super().__init__()
        self.add_child(String(key))
        self.add_child(value)

    @property
    def key(self) -> str:
        return self.children[0].value()

    @property
    def _value(self) -> Any:
        return self.children[1].value()

    def __str__(self) -> str:
        return "KeyValuePair"
