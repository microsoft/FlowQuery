from typing import List, Optional

from ...compute.provenance import ProvenanceSource, RowProvenance, RowSegment
from ..ast_node import ASTNode
from .group_by import GroupBy
from .return_op import Return


class AggregatedWith(Return):
    """Represents an aggregated WITH operation that groups and reduces values."""

    def __init__(self, expressions: List[ASTNode]) -> None:
        super().__init__(expressions)
        self._group_by = GroupBy(self.children)
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
