"""Represents an expression in the FlowQuery AST."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Generator, List, Optional

from ..ast_node import ASTNode
from ..functions.aggregate_function import AggregateFunction
from .reference import Reference

if TYPE_CHECKING:
    from ...graph.pattern_expression import PatternExpression


class Expression(ASTNode):
    """Represents an expression in the FlowQuery AST.

    Expressions are built using the Shunting Yard algorithm to handle operator
    precedence and associativity. They can contain operands (numbers, strings, identifiers)
    and operators (arithmetic, logical, comparison).

    Example:
        expr = Expression()
        expr.add_node(number_node)
        expr.add_node(plus_operator)
        expr.add_node(another_number_node)
        expr.finish()
    """

    def __init__(self) -> None:
        super().__init__()
        self._operators: List[ASTNode] = []
        self._output: List[ASTNode] = []
        self._alias: Optional[str] = None
        self._overridden: Any = None
        self._reducers: Optional[List['AggregateFunction']] = None
        self._patterns: Optional[List['PatternExpression']] = None

    def add_node(self, node: ASTNode) -> None:
        """Adds a node (operand or operator) to the expression.

        Uses the Shunting Yard algorithm to maintain correct operator precedence.

        Args:
            node: The AST node to add (operand or operator)
        """
        # Implements the Shunting Yard algorithm
        if node.is_operand():
            self._output.append(node)
        elif node.is_operator():
            operator1 = node
            while len(self._operators) > 0:
                operator2 = self._operators[-1]
                if (operator2.precedence > operator1.precedence or
                    (operator2.precedence == operator1.precedence and operator1.left_associative)):
                    self._output.append(operator2)
                    self._operators.pop()
                else:
                    break
            self._operators.append(operator1)

    def finish(self) -> None:
        """Finalizes the expression by converting it to a tree structure.

        Should be called after all nodes have been added.
        """
        while self._operators:
            self._output.append(self._operators.pop())
        self.add_child(self._to_tree())

    def _to_tree(self) -> ASTNode:
        if not self._output:
            return ASTNode()
        node = self._output.pop()
        if node.is_operator():
            rhs = self._to_tree()
            lhs = self._to_tree()
            node.add_child(lhs)
            node.add_child(rhs)
        return node

    def nodes_added(self) -> bool:
        return len(self._operators) > 0 or len(self._output) > 0

    def value(self) -> Any:
        if self._overridden is not None:
            return self._overridden
        if self.child_count() != 1:
            raise ValueError("Expected one child")
        return self.children[0].value()

    def set_alias(self, alias: str) -> None:
        self._alias = alias

    @property
    def alias(self) -> Optional[str]:
        first = self.first_child()
        if isinstance(first, Reference) and self._alias is None:
            return first.identifier
        return self._alias

    @alias.setter
    def alias(self, value: str) -> None:
        self._alias = value

    def __str__(self) -> str:
        if self._alias is not None:
            return f"Expression ({self._alias})"
        return "Expression"

    def reducers(self) -> List['AggregateFunction']:
        from ..functions.aggregate_function import AggregateFunction
        if self._reducers is None:
            self._reducers = list(self._extract(self, AggregateFunction))
        return self._reducers

    def patterns(self) -> List['PatternExpression']:
        from ...graph.pattern_expression import PatternExpression
        if self._patterns is None:
            self._patterns = list(self._extract(self, PatternExpression))
        return self._patterns

    def _extract(self, node: ASTNode, of_type: type) -> Generator[Any, None, None]:
        if isinstance(node, of_type):
            yield node
        for child in node.get_children():
            yield from self._extract(child, of_type)

    def mappable(self) -> bool:
        return len(self.reducers()) == 0

    def has_reducers(self) -> bool:
        return len(self.reducers()) > 0

    @property
    def overridden(self) -> Any:
        return self._overridden

    @overridden.setter
    def overridden(self, value: Any) -> None:
        self._overridden = value
