"""Represents an associative array (object/dictionary) in the AST."""

from typing import Any, Dict

from ..ast_node import ASTNode
from .key_value_pair import KeyValuePair


class AssociativeArray(ASTNode):
    """Represents an associative array (object/dictionary) in the AST.
    
    Associative arrays map string keys to values, similar to JSON objects.
    
    Example:
        # For { name: "Alice", age: 30 }
        obj = AssociativeArray()
        obj.add_key_value(KeyValuePair("name", name_expr))
        obj.add_key_value(KeyValuePair("age", age_expr))
    """

    def add_key_value(self, key_value_pair: KeyValuePair) -> None:
        """Adds a key-value pair to the associative array.
        
        Args:
            key_value_pair: The key-value pair to add
        """
        self.add_child(key_value_pair)

    def __str__(self) -> str:
        return 'AssociativeArray'

    def _value(self):
        for child in self.children:
            key_value = child
            yield {key_value.key: key_value._value}

    def value(self) -> Dict[str, Any]:
        result = {}
        for item in self._value():
            result.update(item)
        return result
