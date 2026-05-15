"""LET binding operation."""

from typing import Any, List, Optional, cast

from ...graph.bindings import Bindings
from ...graph.virtual_sources import attach_virtual_source
from ..ast_node import ASTNode
from ..expressions.expression import Expression
from .operation import Operation


class Let(Operation):
    """``LET name = <expression-or-query>``: bind a value to a name in
    the global :class:`Bindings` store.

    The right-hand side is either a parsed expression or a sub-query
    AST that is executed at runtime; a query RHS materialises to the
    list of result rows.  The value is stored eagerly when the LET
    operation runs.

    ``LET name = { ... } REFRESH EVERY n unit`` registers a
    refreshable binding: the sub-query is evaluated once at LET time,
    the result is cached, and the next read after the TTL has elapsed
    re-executes the sub-query.
    """

    def __init__(
        self,
        name: str,
        expression: Optional[Expression],
        sub_query: Optional[ASTNode],
        refresh_every_ms: Optional[int] = None,
    ):
        super().__init__()
        self._name = name
        self._expression = expression
        self._sub_query = sub_query
        self._value: Any = None
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
    def refresh_every_ms(self) -> Optional[int]:
        return self._refresh_every_ms

    async def run(self) -> None:
        bindings = Bindings.get_instance()
        value: Any
        if self._sub_query is not None:
            first = cast(Operation, self._sub_query.first_child())
            last = cast(Operation, self._sub_query.last_child())
            # Always capture provenance for sub-query LET RHS: it lets
            # downstream consumers (e.g. ``LOAD JSON FROM <letName>``)
            # thread row-level lineage back through this binding.  Cost
            # is paid once at LET time; downstream readers pay nothing
            # when they don't ask.
            from ...compute.provenance import RowProvenance
            from ...compute.runner import Runner

            sink: List[RowProvenance] = []
            Runner.wire_provenance(first, sink)
            await first.initialize()
            await first.run()
            await first.finish()
            value = last.results
            if isinstance(value, list):
                length = min(len(sink), len(value))
                for i in range(length):
                    row = value[i]
                    if isinstance(row, dict):
                        attach_virtual_source(row, sink[i])
        elif self._expression is not None:
            value = self._expression.value()
        else:
            value = None
        self._value = value
        if self._refresh_every_ms is not None:
            if self._sub_query is None:
                raise ValueError(
                    "LET REFRESH EVERY requires a sub-query right-hand side"
                )
            bindings.register_refreshable(
                self._name, value, self._sub_query, self._refresh_every_ms
            )
        else:
            bindings.set(self._name, value)
        if self.next:
            await self.next.run()

    @property
    def results(self) -> List[Any]:
        if isinstance(self._value, list):
            return self._value
        return []
