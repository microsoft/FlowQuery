"""Represents a UNION operation that combines results from two sub-queries."""

import json
from typing import Any, Dict, List, Optional, Tuple

from ...compute.provenance import RowProvenance
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
        self._left_provenance: Optional[List[RowProvenance]] = None
        self._right_provenance: Optional[List[RowProvenance]] = None
        self._provenance_sink: Optional[List[RowProvenance]] = None

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

    def enable_provenance(
        self,
        left_sink: List[RowProvenance],
        right_sink: List[RowProvenance],
        sink: List[RowProvenance],
    ) -> None:
        """Wire provenance through this UNION.  The Runner attaches each
        branch to its own sink array; ``sink`` is the merged output array
        aligned with ``_results``.
        """
        self._left_provenance = left_sink
        self._right_provenance = right_sink
        self._provenance_sink = sink

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

        # Combine results (and provenance when enabled)
        rows, provenance = self._combine_with_provenance(left_results, right_results)
        self._results = rows
        if self._provenance_sink is not None:
            self._provenance_sink.clear()
            for p in provenance:
                self._provenance_sink.append(p)

    def _combine_with_provenance(
        self,
        left: List[Dict[str, Any]],
        right: List[Dict[str, Any]],
    ) -> Tuple[List[Dict[str, Any]], List[RowProvenance]]:
        """Combines results from left and right pipelines and returns
        both the merged rows and the merged provenance array (when
        enabled).  UNION drops duplicates (first occurrence wins);
        :class:`UnionAll` overrides ``_combine`` to keep all rows.
        """
        left_prov = self._left_provenance
        right_prov = self._right_provenance
        want_prov = self._provenance_sink is not None
        rows: List[Dict[str, Any]] = list(left)
        provenance: List[RowProvenance] = list(left_prov) if want_prov and left_prov is not None else []
        seen: set[str] = set()
        for row in left:
            seen.add(json.dumps(row, sort_keys=True, default=str))
        for i, row in enumerate(right):
            serialized = json.dumps(row, sort_keys=True, default=str)
            if serialized not in seen:
                rows.append(row)
                if want_prov and right_prov is not None:
                    provenance.append(right_prov[i])
                seen.add(serialized)
        return rows, provenance

    def _combine(
        self,
        left: List[Dict[str, Any]],
        right: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Kept for backwards compatibility with subclasses that override
        only ``_combine()``.
        """
        rows, _ = self._combine_with_provenance(left, right)
        return rows

    async def finish(self) -> None:
        if self.next:
            await self.next.finish()

    @property
    def results(self) -> List[Dict[str, Any]]:
        return self._results
