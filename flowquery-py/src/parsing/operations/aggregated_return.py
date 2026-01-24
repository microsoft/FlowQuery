"""Represents an aggregated RETURN operation."""

from typing import Any, Dict, List

from .return_op import Return
from .group_by import GroupBy
from ..expressions.expression import Expression


class AggregatedReturn(Return):
    """Represents an aggregated RETURN operation that groups and reduces values."""

    def __init__(self, expressions):
        super().__init__(expressions)
        self._group_by = GroupBy(self.children)

    async def run(self) -> None:
        await self._group_by.run()

    @property
    def results(self) -> List[Dict[str, Any]]:
        if self._where is not None:
            self._group_by.where = self._where
        return list(self._group_by.generate_results())
