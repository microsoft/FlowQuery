"""Expression map for managing named expressions."""

from typing import TYPE_CHECKING, Any, List, Optional

if TYPE_CHECKING:
    pass


class ExpressionMap:
    """Maps expression aliases to their corresponding Expression objects."""

    def __init__(self):
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
