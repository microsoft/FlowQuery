"""Per-query cache for virtual graph data."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Union

from .physical_node import PhysicalNode
from .physical_relationship import PhysicalRelationship


class DataCache:
    """Per-query cache for virtual graph data.

    Each top-level Runner creates its own DataCache instance,
    ensuring thread-safety when multiple queries run concurrently.
    Filter pass-down queries (with args) bypass the cache since
    their results depend on runtime parameter values.

    When ``provenance`` is True, the cache is bypassed entirely:
    every read re-executes the inner query so the resulting record
    instances carry fresh per-row provenance attached via
    :func:`attach_virtual_source`.  Sharing cached records across
    multiple outer queries would mean stale or cross-query
    provenance, so we trade re-execution for correctness here.
    """

    def __init__(self, provenance: bool = False) -> None:
        self._cache: Dict[str, List[Dict[str, Any]]] = {}
        self._provenance = provenance

    async def get(
        self,
        key: str,
        physical: Union[PhysicalNode, PhysicalRelationship],
        args: Optional[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        if self._provenance:
            return await physical.data(args, provenance=True)
        if args is not None:
            return await physical.data(args)
        cached = self._cache.get(key)
        if cached is not None:
            return cached
        data = await physical.data(None)
        self._cache[key] = data
        return data
