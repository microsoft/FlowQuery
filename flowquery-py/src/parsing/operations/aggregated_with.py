from typing import Any, Callable, Dict, List, Optional

from ...compute.provenance import ProvenanceSource, RowProvenance, RowSegment
from ..ast_node import ASTNode
from .group_by import GroupBy
from .return_op import Return


class AggregatedWith(Return):
    """Represents an aggregated WITH operation that groups and reduces values."""

    def __init__(self, expressions: List[ASTNode]) -> None:
        super().__init__(expressions)
        self._group_by = GroupBy(self.children, lambda: self._where)
        # Iterator over the per-group provenance produced by
        # ``_group_by``.  Advanced in lockstep with
        # :meth:`generate_results` inside :meth:`finish` so that
        # ``_current_group_provenance`` always reflects the group whose
        # row the downstream pipeline is about to project.
        self._current_group_provenance: Optional[RowProvenance] = None

    async def run(self) -> None:
        await self._group_by.run()

    def add_provenance_source(self, source: ProvenanceSource) -> None:
        """Forward upstream provenance sources into the embedded
        :class:`GroupBy` so each group accumulates the union of
        contributing bindings.
        """
        self._group_by.add_provenance_source(source)

    def as_provenance_source(self) -> ProvenanceSource:
        """Expose this aggregation as a downstream provenance source.
        When the downstream pipeline projects a row, it snapshots us
        and receives the pre-computed provenance for the group
        currently being flushed by :meth:`finish`.
        """
        owner = self

        class _AggregatedWithSource(ProvenanceSource):
            def snapshot(self) -> RowSegment:
                if owner._current_group_provenance is None:
                    return RowProvenance(nodes=[], relationships=[], rows=[])
                return owner._current_group_provenance

        return _AggregatedWithSource()

    async def finish(self) -> None:
        want_provenance = self._group_by.provenance_enabled
        prov_iter = self._group_by.generate_provenance() if want_provenance else None
        if self._order_by is not None:
            # Re-emission re-walks the group tree, so drop stale keys first.
            self._order_by.reset_sort_keys()
            # Groups must be buffered so ORDER BY can permute them before
            # any downstream operation (notably LIMIT) consumes the stream.
            records: List[Dict[str, Any]] = []
            restores: List[Callable[[], None]] = []
            provenance: List[Optional[RowProvenance]] = []
            for record, restore in self._group_by.generate_groups():
                # Evaluated while this group's overrides are live, so ORDER BY
                # supports arbitrary expressions and not just bare aliases.
                self._order_by.capture_sort_keys()
                records.append(record)
                restores.append(restore)
                if prov_iter is not None:
                    try:
                        provenance.append(next(prov_iter))
                    except StopIteration:
                        provenance.append(None)
            for index in self._order_by.sort_indices(records):
                restores[index]()
                self._current_group_provenance = (
                    None if prov_iter is None else provenance[index]
                )
                if self.next:
                    await self.next.run()
        else:
            for _ in self._group_by.generate_results():
                if prov_iter is not None:
                    try:
                        self._current_group_provenance = next(prov_iter)
                    except StopIteration:
                        self._current_group_provenance = None
                if self.next:
                    await self.next.run()
        self._current_group_provenance = None
        await super().finish()
