"""Represents a MATCH operation for graph pattern matching."""

from typing import List, Optional

from ...graph.node import Node
from ...graph.pattern import Pattern
from ...graph.patterns import Patterns
from .operation import Operation


class Match(Operation):
    """Represents a MATCH operation for graph pattern matching."""

    def __init__(self, patterns: Optional[List[Pattern]] = None, optional: bool = False) -> None:
        super().__init__()
        self._patterns = Patterns(patterns or [])
        self._optional = optional

    @property
    def patterns(self) -> List[Pattern]:
        return self._patterns.patterns if self._patterns else []

    @property
    def optional(self) -> bool:
        return self._optional

    def __str__(self) -> str:
        return "OptionalMatch" if self._optional else "Match"

    async def run(self) -> None:
        """Executes the match operation by chaining the patterns together.
        If optional and no match is found, continues with null values."""
        await self._patterns.initialize()
        matched = False

        async def to_do_next() -> None:
            nonlocal matched
            matched = True
            if self.next:
                await self.next.run()

        self._patterns.to_do_next = to_do_next
        await self._patterns.traverse()

        # For OPTIONAL MATCH: if nothing matched, continue with None values
        if not matched and self._optional:
            for pattern in self._patterns.patterns:
                for element in pattern.chain:
                    if isinstance(element, Node):
                        element.set_value(None)
            if self.next:
                await self.next.run()
