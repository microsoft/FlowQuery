"""Represents a RETURN operation that produces the final query results."""

import copy
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from ..ast_node import ASTNode
from .projection import Projection

if TYPE_CHECKING:
    from .where import Where


class Return(Projection):
    """Represents a RETURN operation that produces the final query results.

    The RETURN operation evaluates expressions and collects them into result records.
    It can optionally have a WHERE clause to filter results.

    Example:
        # RETURN x, y WHERE x > 0
    """

    def __init__(self, expressions: List[ASTNode]) -> None:
        super().__init__(expressions)
        self._where: Optional['Where'] = None
        self._results: List[Dict[str, Any]] = []

    @property
    def where(self) -> Any:
        if self._where is None:
            return True
        return self._where.value()

    @where.setter
    def where(self, where: 'Where') -> None:
        self._where = where

    async def run(self) -> None:
        if not self.where:
            return
        record: Dict[str, Any] = {}
        for expression, alias in self.expressions():
            raw = expression.value()
            # Deep copy objects to preserve their state
            value = copy.deepcopy(raw) if isinstance(raw, (dict, list)) else raw
            record[alias] = value
        self._results.append(record)

    async def initialize(self) -> None:
        self._results = []

    @property
    def results(self) -> List[Dict[str, Any]]:
        return self._results
