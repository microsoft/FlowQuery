"""Represents a RETURN operation that produces the final query results."""

import copy
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from ..ast_node import ASTNode
from .limit import Limit
from .order_by import OrderBy
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
        self._limit: Optional[Limit] = None
        self._order_by: Optional[OrderBy] = None

    @property
    def where(self) -> Any:
        if self._where is None:
            return True
        return self._where.value()

    @where.setter
    def where(self, where: 'Where') -> None:
        self._where = where

    @property
    def limit(self) -> Optional[Limit]:
        return self._limit

    @limit.setter
    def limit(self, limit: Limit) -> None:
        self._limit = limit

    @property
    def order_by(self) -> Optional[OrderBy]:
        return self._order_by

    @order_by.setter
    def order_by(self, order_by: OrderBy) -> None:
        self._order_by = order_by

    async def run(self) -> None:
        if not self.where:
            return
        # When ORDER BY is present, skip limit during accumulation;
        # limit will be applied after sorting in results property
        if self._order_by is None and self._limit is not None and self._limit.is_limit_reached:
            return
        record: Dict[str, Any] = {}
        for expression, alias in self.expressions():
            raw = expression.value()
            # Deep copy objects to preserve their state
            value = copy.deepcopy(raw) if isinstance(raw, (dict, list)) else raw
            record[alias] = value
        # Capture sort-key values while expression bindings are still live.
        if self._order_by is not None:
            self._order_by.capture_sort_keys()
        self._results.append(record)
        if self._order_by is None and self._limit is not None:
            self._limit.increment()

    async def initialize(self) -> None:
        self._results = []

    @property
    def results(self) -> List[Dict[str, Any]]:
        result = self._results
        if self._order_by is not None:
            result = self._order_by.sort(result)
        if self._order_by is not None and self._limit is not None:
            result = result[:self._limit.limit_value]
        return result
