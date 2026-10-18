"""Collection of graph patterns for FlowQuery."""

from contextlib import aclosing
from typing import TYPE_CHECKING, AsyncGenerator, List, Optional

from .pattern import Pattern

if TYPE_CHECKING:
    from .source_context import SourceContext


class Patterns:
    """Manages a collection of graph patterns."""

    def __init__(self, patterns: Optional[List[Pattern]] = None) -> None:
        self._patterns = patterns or []

    @property
    def patterns(self) -> List[Pattern]:
        return self._patterns

    async def initialize(self, ctx: Optional['SourceContext'] = None) -> None:
        for pattern in self._patterns:
            await pattern.fetch_data(ctx)

    async def traverse(self) -> AsyncGenerator[None, None]:
        if not self._patterns:
            return
        async with aclosing(self._chain_patterns(0)) as chained:
            async for _ in chained:
                yield

    async def _chain_patterns(self, index: int) -> AsyncGenerator[None, None]:
        async with aclosing(self._patterns[index].traverse()) as matches:
            async for _ in matches:
                if index + 1 < len(self._patterns):
                    async with aclosing(self._chain_patterns(index + 1)) as rest:
                        async for _ in rest:
                            yield
                else:
                    yield
