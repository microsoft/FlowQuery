"""Represents a Cypher-style list comprehension in the AST.

List comprehensions allow mapping and filtering arrays inline using the syntax:
    [variable IN list | expression]
    [variable IN list WHERE condition | expression]
    [variable IN list WHERE condition]
    [variable IN list]

Example:
    [n IN [1, 2, 3] WHERE n > 1 | n * 2]  =>  [4, 6]
"""

from typing import Any, List, Optional

from ..ast_node import ASTNode
from ..expressions.expression import Expression
from ..functions.value_holder import ValueHolder
from ..operations.where import Where


class ListComprehension(ASTNode):
    """Represents a list comprehension expression.

    Children layout:
        - Child 0: Reference (iteration variable)
        - Child 1: Expression (source array)
        - Child 2 (optional): Where (filter condition) or Expression (mapping)
        - Child 3 (optional): Expression (mapping, when Where is child 2)
    """

    def __init__(self) -> None:
        super().__init__()
        self._value_holder = ValueHolder()

    @property
    def reference(self) -> ASTNode:
        """The iteration variable reference."""
        return self.first_child()

    @property
    def array(self) -> ASTNode:
        """The source array expression (unwrapped from its Expression wrapper)."""
        return self.get_children()[1].first_child()

    @property
    def _return(self) -> Optional[Expression]:
        """The mapping expression, or None if not specified."""
        children = self.get_children()
        if len(children) <= 2:
            return None
        last = children[-1]
        if isinstance(last, Where):
            return None
        return last if isinstance(last, Expression) else None

    @property
    def where(self) -> Optional[Where]:
        """The optional WHERE filter condition."""
        for child in self.get_children():
            if isinstance(child, Where):
                return child
        return None

    def value(self) -> List[Any]:
        """Evaluate the list comprehension.

        Iterates over the source array, applies the optional filter,
        and maps each element through the return expression.

        Returns:
            The resulting filtered/mapped array.
        """
        ref = self.reference
        if hasattr(ref, "referred"):
            ref.referred = self._value_holder
        array = self.array.value()
        if array is None or not isinstance(array, list):
            raise ValueError("Expected array for list comprehension")
        result: List[Any] = []
        for item in array:
            self._value_holder.holder = item
            if self.where is None or self.where.value():
                if self._return is not None:
                    result.append(self._return.value())
                else:
                    result.append(item)
        return result

    def __str__(self) -> str:
        return "ListComprehension"
