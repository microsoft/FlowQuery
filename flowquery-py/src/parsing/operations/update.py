"""UPDATE binding operation (replace or merge)."""

from typing import Any, List, Optional, cast

from ...graph.bindings import Bindings
from ..ast_node import ASTNode
from ..expressions.expression import Expression
from .operation import Operation


class Update(Operation):
    """``UPDATE name = <rhs>`` — replace the value bound to ``name``.

    ``UPDATE name MERGE ON <key(s)> [SET .field, ...] [WHEN [NOT] MATCHED] = <rhs>``
    — key-based upsert.  Rows in the existing binding whose key(s)
    match a row in the new value are replaced (or partially updated if
    ``SET .field, ...`` is given); unmatched new rows are appended.
    The optional ``WHEN MATCHED`` / ``WHEN NOT MATCHED`` clauses
    suppress the other branch (mirroring SQL ``MERGE``).

    ``UPDATE name`` always requires ``name`` to already be bound — use
    ``LET`` to introduce a new binding.
    """

    def __init__(
        self,
        name: str,
        merge_keys: Optional[List[str]],
        set_fields: Optional[List[str]],
        when_matched: bool,
        when_not_matched: bool,
        expression: Optional[Expression],
        sub_query: Optional[ASTNode],
    ):
        super().__init__()
        self._name = name
        self._merge_keys = merge_keys
        self._set_fields = set_fields
        self._when_matched = when_matched
        self._when_not_matched = when_not_matched
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
    def merge_keys(self) -> Optional[List[str]]:
        return self._merge_keys

    @property
    def set_fields(self) -> Optional[List[str]]:
        return self._set_fields

    @property
    def when_matched(self) -> bool:
        return self._when_matched

    @property
    def when_not_matched(self) -> bool:
        return self._when_not_matched

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
        if self._merge_keys is not None:
            bindings.merge(
                self._name,
                value,
                keys=self._merge_keys,
                set_fields=self._set_fields,
                when_matched=self._when_matched,
                when_not_matched=self._when_not_matched,
            )
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
