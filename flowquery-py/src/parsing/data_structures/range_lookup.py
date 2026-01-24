"""Represents a range lookup operation in the AST."""

from typing import Any, List

from ..ast_node import ASTNode


class RangeLookup(ASTNode):
    """Represents a range lookup (array slicing) operation in the AST."""

    @property
    def from_(self) -> ASTNode:
        return self.children[0]

    @from_.setter
    def from_(self, from_: ASTNode) -> None:
        self.add_child(from_)

    @property
    def to(self) -> ASTNode:
        return self.children[1]

    @to.setter
    def to(self, to: ASTNode) -> None:
        self.add_child(to)

    @property
    def variable(self) -> ASTNode:
        return self.children[2]

    @variable.setter
    def variable(self, variable: ASTNode) -> None:
        self.add_child(variable)

    def is_operand(self) -> bool:
        return True

    def value(self) -> List[Any]:
        array = self.variable.value()
        from_val = self.from_.value() or 0
        to_val = self.to.value() or len(array)
        return array[from_val:to_val]
