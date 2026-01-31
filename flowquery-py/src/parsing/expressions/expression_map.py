"""Expression map for managing named expressions."""

from __future__ import annotations

from typing import Any, List, Optional


class ExpressionMap:
    """Maps expression aliases to their corresponding Expression objects."""

    def __init__(self) -> None:
        self._map: dict[str, Any] = {}

    def get(self, alias: str) -> Optional[Any]:
        return self._map.get(alias)

    def has(self, alias: str) -> bool:
        return alias in self._map

    def set_map(self, expressions: List[Any]) -> None:
        self._map.clear()
        for expr in expressions:
            alias = getattr(expr, 'alias', None)
            if alias is None:
                continue
            self._map[alias] = expr
