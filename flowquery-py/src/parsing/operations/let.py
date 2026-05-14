"""LET binding operation."""

from typing import Any, List, Optional, cast

from ...graph.bindings import Bindings
from ..ast_node import ASTNode
from ..expressions.expression import Expression
from .operation import Operation


class Let(Operation):
    """`LET name = <expression-or-query>` — bind a value to a name in
    the global :class:`Bindings` store.

    The right-hand side is either a parsed expression or a sub-query
    AST that is executed at runtime; a query RHS materialises to the
    list of result rows.
    """

    def __init__(
        self,
        name: str,
        expression: Optional[Expression],
        sub_query: Optional[ASTNode],
    ):
        super().__init__()
        self._name = name
        self._expression = expression
        self._sub_query = sub_query
        self._value: Any = None
        if expression is not None:
            self.add_child(expression)
        if sub_query is not None:
            self.add_child(sub_query)

    @property
    def name(self) -> str:
        return self._name

    @property
    def expression(self) -> Optional[Expression]:
        return self._expression

    @property
    def sub_query(self) -> Optional[ASTNode]:
        return self._sub_query

    async def run(self) -> None:
        value: Any
        if self._sub_query is not None:
            first = cast(Operation, self._sub_query.first_child())
            last = cast(Operation, self._sub_query.last_child())
            await first.initialize()
            await first.run()
            await first.finish()
            value = last.results
        elif self._expression is not None:
            value = self._expression.value()
        else:
            value = None
        self._value = value
        Bindings.get_instance().set(self._name, value)
        if self.next:
            await self.next.run()

    @property
    def results(self) -> List[Any]:
        if isinstance(self._value, list):
            return self._value
        return []
