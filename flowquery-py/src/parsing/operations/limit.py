"""Represents a LIMIT operation that limits the number of results."""

from .operation import Operation


class Limit(Operation):
    """Represents a LIMIT operation that limits the number of results."""

    def __init__(self, limit: int):
        super().__init__()
        self._count = 0
        self._limit = limit

    async def run(self) -> None:
        if self._count >= self._limit:
            return
        self._count += 1
        if self.next:
            await self.next.run()

    def reset(self) -> None:
        self._count = 0
