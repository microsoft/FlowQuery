"""UPDATE binding operation (wholesale replace)."""

from typing import Any, List, Optional, cast

from ...graph.bindings import Bindings
from ..ast_node import ASTNode
from ..expressions.expression import Expression
from .operation import Operation


class Update(Operation):
    """``UPDATE name = <rhs>`` — replace the value bound to ``name``.

    ``UPDATE name`` always requires ``name`` to already be bound — use
    ``LET`` to introduce a new binding.  Per-row updates (key-based
    upsert, partial-field merge, conditional matched/not-matched
    branches) live on the ``MERGE INTO … USING …`` operation.

    ``UPDATE name AS alias DELETE WHERE <pred>`` — see :class:`UpdateDelete`.
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
        bindings = Bindings.get_instance()
        if not bindings.has(self._name):
            raise RuntimeError(
                f"Binding '{self._name}' is not defined; use LET to create it"
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
        bindings.set(self._name, value)
        self._value = value
        if self.next:
            await self.next.run()

    @property
    def results(self) -> List[Any]:
        if isinstance(self._value, list):
            return self._value
        return []
