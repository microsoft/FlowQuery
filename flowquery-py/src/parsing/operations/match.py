"""Represents a MATCH operation for graph pattern matching."""

from typing import List

from .operation import Operation


class Match(Operation):
    """Represents a MATCH operation for graph pattern matching."""

    def __init__(self, patterns=None):
        super().__init__()
        from ...graph.patterns import Patterns
        self._patterns = Patterns(patterns or [])

    @property
    def patterns(self):
        return self._patterns.patterns if self._patterns else []

    async def run(self) -> None:
        """Executes the match operation by chaining the patterns together."""
        await self._patterns.initialize()
        
        async def to_do_next():
            if self.next:
                await self.next.run()
        
        self._patterns.to_do_next = to_do_next
        await self._patterns.traverse()
