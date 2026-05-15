from typing import Any, Dict, List, Tuple

from ...compute.provenance import ProvenanceSource, RowProvenance
from ..ast_node import ASTNode
from .group_by import GroupBy
from .operation import Operation
from .return_op import Return


class AggregatedReturn(Return):
    """Represents an aggregated RETURN operation that groups and reduces values."""

    def __init__(self, expressions: List[ASTNode]) -> None:
        super().__init__(expressions)
        self._group_by = GroupBy(self.children)

    async def run(self) -> None:
        await self._group_by.run()

    def add_provenance_source(self, source: ProvenanceSource) -> None:
        """Provenance sources registered on an aggregate RETURN are
        folded into the active group's dedup maps rather than
        snapshotted per row, because each output row corresponds to a
        *group* of upstream matches.  Override to route through the
        embedded :class:`GroupBy`.
        """
        self._group_by.add_provenance_source(source)

    @property
    def results(self) -> List[Dict[str, Any]]:
        results, _ = self._build_aggregate_output()
        return results

    async def finish(self) -> None:
        if self._provenance_sink is not None:
            _, provenance = self._build_aggregate_output()
            self._provenance_sink.clear()
            for p in provenance:
                self._provenance_sink.append(p)
        # Skip Return.finish() because it would re-materialise
        # provenance from the empty per-row ``_results`` array; chain
        # straight to the next operation instead.
        await Operation.finish(self)

    def _build_aggregate_output(
        self,
    ) -> Tuple[List[Dict[str, Any]], List[RowProvenance]]:
        if self._where is not None:
            self._group_by.where = self._where
        results: List[Dict[str, Any]] = []
        provenance: List[RowProvenance] = []
        # Emit a provenance entry per result row whenever a sink is
        # registered, even if no provenance sources were attached
        # (e.g. ``RETURN count(*)`` over no MATCH).  This keeps
        # ``runner.provenance`` length aligned with ``runner.results``.
        want_provenance = self._provenance_sink is not None
        if want_provenance:
            record_iter = self._group_by.generate_results()
            prov_iter = self._group_by.generate_provenance()
            while True:
                try:
                    r = next(record_iter)
                except StopIteration:
                    break
                try:
                    p = next(prov_iter)
                except StopIteration:
                    break
                results.append(r)
                provenance.append(p)
        else:
            for r in self._group_by.generate_results():
                results.append(r)
        if self._order_by is not None:
            indices = self._order_by.sort_indices(results)
            sorted_results = [results[i] for i in indices]
            sorted_prov = [provenance[i] for i in indices] if want_provenance else provenance
            return sorted_results, sorted_prov
        return results, provenance
