"""Hops specification for variable-length relationships."""

import sys
from typing import Optional


class Hops:
    """Specifies the number of hops for a relationship pattern."""

    def __init__(self, min_hops: Optional[int] = None, max_hops: Optional[int] = None):
        # Default min=0, max=1 (matching TypeScript implementation)
        if min_hops is None:
            self._min: int = 0
        else:
            self._min = min_hops
        if max_hops is None:
            self._max: int = 1
        else:
            self._max = max_hops

    @property
    def min(self) -> int:
        return self._min

    @min.setter
    def min(self, value: int) -> None:
        self._min = value

    @property
    def max(self) -> int:
        return self._max

    @max.setter
    def max(self, value: int) -> None:
        self._max = value

    def multi(self) -> bool:
        """Returns True if this represents a variable-length relationship."""
        return self._max > 1 or self._max == -1 or self._max == sys.maxsize

    def unbounded(self) -> bool:
        """Returns True if the max is unbounded."""
        return self._max == sys.maxsize
