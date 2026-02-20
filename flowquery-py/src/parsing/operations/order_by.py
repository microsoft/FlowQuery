"""Represents an ORDER BY operation that sorts results."""

from typing import Any, Dict, List

from .operation import Operation


class SortField:
    """A single sort specification: field name and direction."""

    def __init__(self, field: str, direction: str = "asc"):
        self.field = field
        self.direction = direction


class OrderBy(Operation):
    """Represents an ORDER BY operation that sorts results.

    Can be attached to a RETURN operation (sorting its results),
    or used as a standalone accumulating operation after a non-aggregate WITH.

    Example:
        RETURN x ORDER BY x DESC
    """

    def __init__(self, fields: List[SortField]):
        super().__init__()
        self._fields = fields
        self._results: List[Dict[str, Any]] = []

    @property
    def fields(self) -> List[SortField]:
        return self._fields

    def sort(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Sorts an array of records according to the sort fields."""
        import functools

        def compare(a: Dict[str, Any], b: Dict[str, Any]) -> int:
            for sf in self._fields:
                a_val = a.get(sf.field)
                b_val = b.get(sf.field)
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

        return sorted(records, key=functools.cmp_to_key(compare))

    async def run(self) -> None:
        """When used as a standalone operation, passes through to next."""
        if self.next:
            await self.next.run()

    async def initialize(self) -> None:
        self._results = []
        if self.next:
            await self.next.initialize()

    @property
    def results(self) -> List[Dict[str, Any]]:
        return self._results
