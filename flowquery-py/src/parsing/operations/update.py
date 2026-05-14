"""UPDATE binding operation (replace or merge)."""

from typing import Any, List, Optional, cast

from ...graph.bindings import Bindings
from ..ast_node import ASTNode
from ..expressions.expression import Expression
from .operation import Operation


class Update(Operation):
    """`UPDATE name = <rhs>` — replace the binding.

    `UPDATE name MERGE ON <key> = <rhs>` — key-based upsert: rows with
    matching keys are replaced entirely; unmatched new rows are appended.
    """

    def __init__(
        self,
        name: str,
        merge_key: Optional[str],
        expression: Optional[Expression],
        sub_query: Optional[ASTNode],
    ):
        super().__init__()
        self._name = name
        self._merge_key = merge_key
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
    def merge_key(self) -> Optional[str]:
        return self._merge_key

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
        bindings = Bindings.get_instance()
        if self._merge_key is not None:
            bindings.merge(self._name, self._merge_key, value)
            self._value = bindings.get(self._name)
        else:
            bindings.set(self._name, value)
            self._value = value
        if self.next:
            await self.next.run()

    @property
    def results(self) -> List[Any]:
        if isinstance(self._value, list):
            return self._value
        return []
