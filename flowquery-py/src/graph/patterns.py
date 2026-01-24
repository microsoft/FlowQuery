"""Collection of graph patterns for FlowQuery."""

from typing import Awaitable, Callable, List, Optional

from .pattern import Pattern


class Patterns:
    """Manages a collection of graph patterns."""

    def __init__(self, patterns: Optional[List[Pattern]] = None):
        self._patterns = patterns or []
        self._to_do_next: Optional[Callable[[], Awaitable[None]]] = None

    @property
    def patterns(self) -> List[Pattern]:
        return self._patterns

    @property
    def to_do_next(self) -> Optional[Callable[[], Awaitable[None]]]:
        return self._to_do_next

    @to_do_next.setter
    def to_do_next(self, func: Optional[Callable[[], Awaitable[None]]]) -> None:
        self._to_do_next = func
        if self._patterns:
            self._patterns[-1].end_node.todo_next = func

    async def initialize(self) -> None:
        previous: Optional[Pattern] = None
        for pattern in self._patterns:
            await pattern.fetch_data()  # Ensure data is loaded
            if previous is not None:
                # Chain the patterns together
                async def next_pattern_start(p=pattern):
                    await p.start_node.next()
                previous.end_node.todo_next = next_pattern_start
            previous = pattern

    async def traverse(self) -> None:
        if self._patterns:
            await self._patterns[0].start_node.next()
