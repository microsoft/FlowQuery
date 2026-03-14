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
    """

    def __init__(self) -> None:
        self._cache: Dict[str, List[Dict[str, Any]]] = {}

    async def get(
        self,
        key: str,
        physical: Union[PhysicalNode, PhysicalRelationship],
        args: Optional[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        if args is not None:
            return await physical.data(args)
        cached = self._cache.get(key)
        if cached is not None:
            return cached
        data = await physical.data(None)
        self._cache[key] = data
        return data
