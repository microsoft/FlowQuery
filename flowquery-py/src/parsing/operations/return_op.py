"""Represents a RETURN operation that produces the final query results."""

import copy
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Tuple

from ...compute.provenance import (
    ProvenanceSource,
    RowProvenance,
    RowSegment,
    merge_provenance_segment,
)
from ..ast_node import ASTNode
from .limit import Limit
from .order_by import OrderBy
from .projection import Projection

if TYPE_CHECKING:
    from .where import Where


class Return(Projection):
    """Represents a RETURN operation that produces the final query results.

    The RETURN operation evaluates expressions and collects them into result records.
    It can optionally have a WHERE clause to filter results.

    Example:
        # RETURN x, y WHERE x > 0
    """

    def __init__(self, expressions: List[ASTNode]) -> None:
        super().__init__(expressions)
        self._where: Optional['Where'] = None
        self._results: List[Dict[str, Any]] = []
        self._limit: Optional[Limit] = None
        self._order_by: Optional[OrderBy] = None
        self._provenance_sources: Optional[List[ProvenanceSource]] = None
        self._provenance_sink: Optional[List[RowProvenance]] = None
        self._provenance_rows: List[RowProvenance] = []

    @property
    def where(self) -> Any:
        if self._where is None:
            return True
        return self._where.value()

    @where.setter
    def where(self, where: 'Where') -> None:
        self._where = where

    @property
    def limit(self) -> Optional[Limit]:
        return self._limit

    @limit.setter
    def limit(self, limit: Limit) -> None:
        self._limit = limit

    @property
    def order_by(self) -> Optional[OrderBy]:
        return self._order_by

    @order_by.setter
    def order_by(self, order_by: OrderBy) -> None:
        self._order_by = order_by

    def enable_provenance(self, sink: List[RowProvenance]) -> None:
        """Direct the runner-owned sink that receives the post-sorted,
        post-limited provenance rows.  Once a sink is registered, every
        emit captures a snapshot from the registered provenance sources.
        """
        self._provenance_sink = sink

    def add_provenance_source(self, source: ProvenanceSource) -> None:
        """Append a provenance source.  Sources are snapshotted per
        emitted row and their segments are concatenated in registration
        order.  Multiple MATCHes downstream of the last aggregation
        register their :class:`ProvenanceSites` here; upstream
        aggregations register themselves as virtual sources that replay
        the current group's accumulated provenance.
        """
        if self._provenance_sources is None:
            self._provenance_sources = []
        self._provenance_sources.append(source)

    async def run(self) -> None:
        if not self.where:
            return
        # When ORDER BY is present, skip limit during accumulation;
        # limit will be applied after sorting in results property
        if self._order_by is None and self._limit is not None and self._limit.is_limit_reached:
            return
        record: Dict[str, Any] = {}
        for expression, alias in self.expressions():
            if hasattr(expression, 'subqueries'):
                for sq in expression.subqueries():
                    await sq.evaluate()
            raw = expression.value()
            # Deep copy objects to preserve their state
            value = copy.deepcopy(raw) if isinstance(raw, (dict, list)) else raw
            # `_label` is an internal property attached to node records by
            # the data resolver (consumed by the labels() function).  Strip
            # it from the projected value so it doesn't leak into results.
            if isinstance(value, dict) and "_label" in value:
                value.pop("_label", None)
            record[alias] = value
        # Capture sort-key values while expression bindings are still live.
        if self._order_by is not None:
            self._order_by.capture_sort_keys()
        self._results.append(record)
        if self._provenance_sink is not None:
            segment = self._snapshot_provenance()
            # Non-aggregate row: `rows` contains the single input-row
            # segment so the shape stays uniform with aggregate rows.
            row = RowProvenance(
                nodes=segment.nodes,
                relationships=segment.relationships,
                data_sources=segment.data_sources,
                rows=[segment],
            )
            self._provenance_rows.append(row)
        if self._order_by is None and self._limit is not None:
            self._limit.increment()

    def _snapshot_provenance(self) -> RowSegment:
        """Concatenate all registered provenance sources into a single
        :class:`RowSegment`.  Called once per emitted row by
        :meth:`run`, which wraps the result as a :class:`RowProvenance`
        with ``rows=[segment]``.
        """
        merged = RowSegment(nodes=[], relationships=[], data_sources=None)
        if self._provenance_sources is not None:
            for src in self._provenance_sources:
                merge_provenance_segment(merged, src.snapshot())
        return merged

    async def initialize(self) -> None:
        self._results = []
        self._provenance_rows = []

    @property
    def results(self) -> List[Dict[str, Any]]:
        results, _ = self._build_output()
        return results

    async def finish(self) -> None:
        # Materialise final, sort-/limit-aligned provenance into the
        # runner's sink (when enabled) so ``Runner.provenance`` reads
        # cheaply.
        if self._provenance_sink is not None:
            _, provenance = self._build_output()
            self._provenance_sink.clear()
            for p in provenance:
                self._provenance_sink.append(p)
        await super().finish()

    def _build_output(
        self,
    ) -> Tuple[List[Dict[str, Any]], List[RowProvenance]]:
        """Apply ORDER BY permutation and LIMIT slicing to both the
        result rows and the parallel provenance array in lockstep.
        Provenance is computed only when a sink is registered.
        """
        results = self._results
        provenance = self._provenance_rows
        want_provenance = self._provenance_sink is not None
        if self._order_by is not None:
            indices = self._order_by.sort_indices(results)
            results = [results[i] for i in indices]
            if want_provenance:
                provenance = [provenance[i] for i in indices]
        if self._order_by is not None and self._limit is not None:
            results = results[: self._limit.limit_value]
            if want_provenance:
                provenance = provenance[: self._limit.limit_value]
        return results, provenance

    @property
    def provenance_rows(self) -> List[RowProvenance]:
        """Direct accessor used by UNION to merge child provenance."""
        _, provenance = self._build_output()
        return provenance
