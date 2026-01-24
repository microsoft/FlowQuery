"""Represents a CALL operation for invoking async functions."""

from typing import Any, Dict, List, Optional

from ..expressions.expression import Expression
from ..expressions.expression_map import ExpressionMap
from ..functions.async_function import AsyncFunction
from .projection import Projection


DEFAULT_VARIABLE_NAME = "value"


class Call(Projection):
    """Represents a CALL operation for invoking async functions."""

    def __init__(self):
        super().__init__([])
        self._function: Optional[AsyncFunction] = None
        self._map = ExpressionMap()
        self._results: List[Dict[str, Any]] = []

    @property
    def function(self) -> Optional[AsyncFunction]:
        return self._function

    @function.setter
    def function(self, async_function: AsyncFunction) -> None:
        self._function = async_function

    @property
    def yielded(self) -> List[Expression]:
        return self.children

    @yielded.setter
    def yielded(self, expressions: List[Expression]) -> None:
        self.children = expressions
        self._map.set_map(expressions)

    @property
    def has_yield(self) -> bool:
        return len(self.children) > 0

    async def run(self) -> None:
        if self._function is None:
            raise ValueError("No function set for Call operation.")
        
        args = self._function.get_arguments()
        async for item in self._function.generate(*args):
            if not self.is_last:
                if isinstance(item, dict):
                    for key, value in item.items():
                        expression = self._map.get(key)
                        if expression:
                            expression.overridden = value
                else:
                    expression = self._map.get(DEFAULT_VARIABLE_NAME)
                    if expression:
                        expression.overridden = item
                if self.next:
                    await self.next.run()
            else:
                record: Dict[str, Any] = {}
                if isinstance(item, dict):
                    for key, value in item.items():
                        if self._map.has(key) or not self.has_yield:
                            record[key] = value
                else:
                    record[DEFAULT_VARIABLE_NAME] = item
                self._results.append(record)

    @property
    def results(self) -> List[Dict[str, Any]]:
        return self._results
