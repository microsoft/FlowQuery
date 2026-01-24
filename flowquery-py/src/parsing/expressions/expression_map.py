"""Expression map for managing named expressions."""

from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .expression import Expression


class ExpressionMap:
    """Maps expression aliases to their corresponding Expression objects."""

    def __init__(self):
        self._map: dict[str, Expression] = {}

    def get(self, alias: str) -> Optional['Expression']:
        return self._map.get(alias)

    def has(self, alias: str) -> bool:
        return alias in self._map

    def set_map(self, expressions: List['Expression']) -> None:
        self._map.clear()
        for expr in expressions:
            if expr.alias is None:
                continue
            self._map[expr.alias] = expr
