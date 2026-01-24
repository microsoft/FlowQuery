"""Represents a lookup operation (array/object indexing) in the AST."""

from typing import Any

from ..ast_node import ASTNode


class Lookup(ASTNode):
    """Represents a lookup operation (array/object indexing) in the AST.
    
    Lookups access elements from arrays or properties from objects using an index or key.
    
    Example:
        # For array[0] or obj.property or obj["key"]
        lookup = Lookup()
        lookup.variable = array_or_obj_node
        lookup.index = index_node
    """

    @property
    def index(self) -> ASTNode:
        return self.children[0]

    @index.setter
    def index(self, index: ASTNode) -> None:
        self.add_child(index)

    @property
    def variable(self) -> ASTNode:
        return self.children[1]

    @variable.setter
    def variable(self, variable: ASTNode) -> None:
        self.add_child(variable)

    def is_operand(self) -> bool:
        return True

    def value(self) -> Any:
        obj = self.variable.value()
        key = self.index.value()
        # Try dict-like access first, then fall back to attribute access for objects
        try:
            return obj[key]
        except (TypeError, KeyError):
            # For objects with attributes (like dataclasses), use getattr
            if hasattr(obj, key):
                return getattr(obj, key)
            raise
