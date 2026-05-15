"""UPDATE name AS u DELETE WHERE <pred> — row-filtering operation."""

from typing import Any, List

from ...graph.bindings import Bindings
from ..expressions.expression import Expression
from .operation import Operation


class UpdateDelete(Operation):
    """``UPDATE name AS alias DELETE WHERE <predicate>`` — remove rows
    from a list-binding that satisfy the predicate.

    Iterates the current rows of ``name``, binding each to ``alias``,
    and evaluates the predicate.  Rows whose predicate evaluates truthy
    are dropped; remaining rows keep their relative order.  Replaces
    the binding with the filtered list.

    The alias is registered in the parser's variable scope so the
    predicate can reference ``alias.field`` (or just ``alias`` for
    scalar rows).  At runtime, the alias resolves to the *current* row
    via :meth:`value`.
    """

    def __init__(self, name: str, alias: str, predicate: Expression):
        super().__init__()
        self._name = name
        self._alias = alias
        self._predicate = predicate
        self._current_row: Any = None
        self._value: List[Any] = []
        self.add_child(predicate)

    def set_predicate(self, predicate: Expression) -> None:
        """Replace the predicate (used by the parser, which must
        register the operation in its variable scope *before* parsing
        the predicate so that ``<alias>`` references resolve to this
        node)."""
        if len(self.children) > 0:
            self.replace_child(self._predicate, predicate)
        else:
            self.add_child(predicate)
        self._predicate = predicate

    @property
    def name(self) -> str:
        return self._name

    @property
    def alias(self) -> str:
        return self._alias

    @property
    def predicate(self) -> Expression:
        return self._predicate

    def value(self) -> Any:
        """Returns the row currently bound to the alias during
        predicate evaluation.  This is what ``Reference.value()``
        resolves to when the alias is referenced in the predicate.
        """
        return self._current_row

    async def run(self) -> None:
        bindings = Bindings.get_instance()
        if not bindings.has(self._name):
            raise RuntimeError(
                f"Binding '{self._name}' is not defined; use LET to create it"
            )
        if bindings.is_refreshable(self._name):
            raise RuntimeError(
                f"Binding '{self._name}' is refreshable; use REFRESH BINDING "
                f"{self._name} to re-evaluate or DROP BINDING {self._name} first"
            )
        existing = bindings.get(self._name)
        if not isinstance(existing, list):
            raise RuntimeError(
                f"UPDATE {self._name} AS {self._alias} DELETE WHERE … "
                f"requires '{self._name}' to be a list"
            )
        result: List[Any] = []
        for row in existing:
            self._current_row = row
            if not self._predicate.value():
                result.append(row)
        self._current_row = None
        bindings.set(self._name, result)
        self._value = result
        if self.next:
            await self.next.run()

    @property
    def results(self) -> List[Any]:
        return self._value
