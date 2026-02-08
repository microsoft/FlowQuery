"""Represents a UNION operation that combines results from two sub-queries."""

import json
from typing import Any, Dict, List, Optional

from .operation import Operation


class Union(Operation):
    """Represents a UNION operation that combines results from two sub-queries.

    UNION merges the results of a left and right query pipeline, removing
    duplicate rows. Both sides must return the same column names.

    Example:
        WITH 1 AS x RETURN x
        UNION
        WITH 2 AS x RETURN x
        # Results: [{x: 1}, {x: 2}]
    """

    def __init__(self) -> None:
        super().__init__()
        self._left: Optional[Operation] = None
        self._right: Optional[Operation] = None
        self._results: List[Dict[str, Any]] = []

    @property
    def left(self) -> Operation:
        if self._left is None:
            raise ValueError("Left operation is not set")
        return self._left

    @left.setter
    def left(self, operation: Operation) -> None:
        self._left = operation

    @property
    def right(self) -> Operation:
        if self._right is None:
            raise ValueError("Right operation is not set")
        return self._right

    @right.setter
    def right(self, operation: Operation) -> None:
        self._right = operation

    @staticmethod
    def _last_in_chain(operation: Operation) -> Operation:
        current = operation
        while current.next is not None:
            current = current.next
        return current

    async def initialize(self) -> None:
        self._results = []
        if self.next:
            await self.next.initialize()

    async def run(self) -> None:
        # Execute left pipeline
        assert self._left is not None
        await self._left.initialize()
        await self._left.run()
        await self._left.finish()
        left_last = self._last_in_chain(self._left)
        left_results: List[Dict[str, Any]] = left_last.results

        # Execute right pipeline
        assert self._right is not None
        await self._right.initialize()
        await self._right.run()
        await self._right.finish()
        right_last = self._last_in_chain(self._right)
        right_results: List[Dict[str, Any]] = right_last.results

        # Validate column names match
        if left_results and right_results:
            left_keys = sorted(left_results[0].keys())
            right_keys = sorted(right_results[0].keys())
            if left_keys != right_keys:
                raise ValueError(
                    "All sub queries in a UNION must have the same return column names"
                )

        # Combine results
        self._results = self._combine(left_results, right_results)

    def _combine(
        self,
        left: List[Dict[str, Any]],
        right: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Combines results from left and right pipelines.

        UNION removes duplicates; subclass UnionAll overrides to keep all rows.
        """
        combined = list(left)
        for row in right:
            serialized = json.dumps(row, sort_keys=True, default=str)
            is_duplicate = any(
                json.dumps(existing, sort_keys=True, default=str) == serialized
                for existing in combined
            )
            if not is_duplicate:
                combined.append(row)
        return combined

    async def finish(self) -> None:
        if self.next:
            await self.next.finish()

    @property
    def results(self) -> List[Dict[str, Any]]:
        return self._results
