"""Represents an ORDER BY operation that sorts results."""

import functools
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from .operation import Operation

if TYPE_CHECKING:
    from ..expressions.expression import Expression


class SortField:
    """A single sort specification: expression and direction."""

    def __init__(self, expression: 'Expression', direction: str = "asc"):
        self.expression = expression
        self.direction = direction


class OrderBy(Operation):
    """Represents an ORDER BY operation that sorts results.

    Can be attached to a RETURN operation (sorting its results),
    or used as a standalone accumulating operation after a non-aggregate WITH.

    Supports both simple field references and arbitrary expressions:

    Example::

        RETURN x ORDER BY x DESC
        RETURN x ORDER BY toLower(x.name) ASC
        RETURN x ORDER BY string_distance(toLower(x.name), toLower('Thomas')) ASC
    """

    def __init__(self, fields: List[SortField]):
        super().__init__()
        self._fields = fields
        self._results: List[Dict[str, Any]] = []
        self._sort_keys: List[List[Any]] = []

    @property
    def fields(self) -> List[SortField]:
        return self._fields

    def capture_sort_keys(self) -> None:
        """Evaluate every sort-field expression against the current runtime
        context and store the resulting values.  Must be called once per
        accumulated row (from ``Return.run()``)."""
        self._sort_keys.append([f.expression.value() for f in self._fields])

    def sort(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Sort records using pre-computed sort keys captured during
        accumulation.  When no keys have been captured (e.g. aggregated
        returns), falls back to looking up simple reference identifiers
        in each record."""
        from ..expressions.reference import Reference

        use_keys = len(self._sort_keys) == len(records)
        keys = self._sort_keys

        # Pre-compute fallback field names for when sort keys aren't
        # available (aggregated returns).
        fallback_fields: List[Optional[str]] = []
        for f in self._fields:
            root = f.expression.first_child()
            if isinstance(root, Reference) and f.expression.child_count() == 1:
                fallback_fields.append(root.identifier)
            else:
                fallback_fields.append(None)

        indices = list(range(len(records)))

        def compare(ai: int, bi: int) -> int:
            for f_idx, sf in enumerate(self._fields):
                if use_keys:
                    a_val = keys[ai][f_idx]
                    b_val = keys[bi][f_idx]
                elif fallback_fields[f_idx] is not None:
                    a_val = records[ai].get(fallback_fields[f_idx])  # type: ignore[arg-type]
                    b_val = records[bi].get(fallback_fields[f_idx])  # type: ignore[arg-type]
                else:
                    continue
                cmp = 0
                if a_val is None and b_val is None:
                    cmp = 0
                elif a_val is None:
                    cmp = -1
                elif b_val is None:
                    cmp = 1
                elif a_val < b_val:
                    cmp = -1
                elif a_val > b_val:
                    cmp = 1
                if cmp != 0:
                    return -cmp if sf.direction == "desc" else cmp
            return 0

        indices.sort(key=functools.cmp_to_key(compare))
        return [records[i] for i in indices]

    async def run(self) -> None:
        """When used as a standalone operation, passes through to next."""
        if self.next:
            await self.next.run()

    async def initialize(self) -> None:
        self._results = []
        self._sort_keys = []
        if self.next:
            await self.next.initialize()

    @property
    def results(self) -> List[Dict[str, Any]]:
        return self._results
