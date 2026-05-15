"""Represents a UNION ALL operation that concatenates results without deduplication."""

from typing import Any, Dict, List, Tuple

from ...compute.provenance import RowProvenance
from .union import Union


class UnionAll(Union):
    """Represents a UNION ALL operation that concatenates results from two sub-queries
    without removing duplicates."""

    def _combine(
        self,
        left: List[Dict[str, Any]],
        right: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        return list(left) + list(right)

    def _combine_with_provenance(
        self,
        left: List[Dict[str, Any]],
        right: List[Dict[str, Any]],
    ) -> Tuple[List[Dict[str, Any]], List[RowProvenance]]:
        want_prov = self._provenance_sink is not None
        left_prov = self._left_provenance or []
        right_prov = self._right_provenance or []
        provenance: List[RowProvenance] = (
            list(left_prov) + list(right_prov) if want_prov else []
        )
        return list(left) + list(right), provenance
