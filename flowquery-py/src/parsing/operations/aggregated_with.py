"""Represents an aggregated WITH operation."""

from .return_op import Return
from .group_by import GroupBy
from ..expressions.expression import Expression


class AggregatedWith(Return):
    """Represents an aggregated WITH operation that groups and reduces values."""

    def __init__(self, expressions):
        super().__init__(expressions)
        self._group_by = GroupBy(self.children)

    async def run(self) -> None:
        await self._group_by.run()

    async def finish(self) -> None:
        for _ in self._group_by.generate_results():
            if self.next:
                await self.next.run()
        await super().finish()
