"""Represents a JSON array in the AST."""

from typing import Any, List

from ..ast_node import ASTNode


class JSONArray(ASTNode):
    """Represents a JSON array in the AST.
    
    JSON arrays are ordered collections of values.
    
    Example:
        # For [1, 2, 3]
        arr = JSONArray()
        arr.add_value(Number("1"))
        arr.add_value(Number("2"))
        arr.add_value(Number("3"))
    """

    def add_value(self, value: ASTNode) -> None:
        """Adds a value to the array.
        
        Args:
            value: The AST node representing the value to add
        """
        self.add_child(value)

    def value(self) -> List[Any]:
        return [child.value() for child in self.children]
