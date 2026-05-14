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
        is_static: bool = False,
        refresh_every_ms: Optional[int] = None,
    ):
        super().__init__()
        self._name = name
        self._expression = expression
        self._sub_query = sub_query
        self._value: Any = None
        self._is_static = is_static
        self._refresh_every_ms = refresh_every_ms
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

    @property
    def is_static(self) -> bool:
        return self._is_static

    @property
    def refresh_every_ms(self) -> Optional[int]:
        return self._refresh_every_ms

    async def run(self) -> None:
        bindings = Bindings.get_instance()
        if self._is_static:
            if self._sub_query is None:
                raise ValueError("LET STATIC requires a sub-query right-hand side")
            bindings.register_static(
                self._name, self._sub_query, self._refresh_every_ms
            )
            if self.next:
                await self.next.run()
            return
        if bindings.is_static(self._name):
            raise ValueError(
                f"Binding '{self._name}' is STATIC; DROP BINDING {self._name} first"
            )
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
        bindings.set(self._name, value)
        if self.next:
            await self.next.run()

    @property
    def results(self) -> List[Any]:
        if isinstance(self._value, list):
            return self._value
        return []
