"""Represents a UNION ALL operation that concatenates results without deduplication."""

from typing import Any, Dict, List

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
