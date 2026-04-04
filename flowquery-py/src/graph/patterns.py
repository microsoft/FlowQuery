"""Collection of graph patterns for FlowQuery."""

from typing import AsyncIterator, List, Optional

from .pattern import Pattern


class Patterns:
    """Manages a collection of graph patterns."""

    def __init__(self, patterns: Optional[List[Pattern]] = None) -> None:
        self._patterns = patterns or []

    @property
    def patterns(self) -> List[Pattern]:
        return self._patterns

    async def initialize(self) -> None:
        for pattern in self._patterns:
            await pattern.fetch_data()

    async def traverse(self) -> AsyncIterator[None]:
        if not self._patterns:
            return
        async for _ in self._chain_patterns(0):
            yield

    async def _chain_patterns(self, index: int) -> AsyncIterator[None]:
        async for _ in self._patterns[index].start_node.next():
            if index + 1 < len(self._patterns):
                async for _ in self._chain_patterns(index + 1):
                    yield
            else:
                yield
