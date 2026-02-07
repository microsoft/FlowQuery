"""Count aggregate function."""

import json
from typing import Any, Union

from .aggregate_function import AggregateFunction
from .function_metadata import FunctionDef
from .reducer_element import ReducerElement


class CountReducerElement(ReducerElement):
    """Reducer element for Count aggregate function."""

    def __init__(self) -> None:
        self._value: int = 0

    @property
    def value(self) -> Any:
        return self._value

    @value.setter
    def value(self, val: Any) -> None:
        self._value += 1


class DistinctCountReducerElement(ReducerElement):
    """Reducer element for Count aggregate function with DISTINCT."""

    def __init__(self) -> None:
        self._seen: set[Any] = set()

    @property
    def value(self) -> Any:
        return len(self._seen)

    @value.setter
    def value(self, val: Any) -> None:
        key: str = json.dumps(val, sort_keys=True, default=str)
        self._seen.add(key)


@FunctionDef({
    "description": "Counts the number of values across grouped rows",
    "category": "aggregate",
    "parameters": [
        {"name": "value", "description": "Value to count", "type": "any"}
    ],
    "output": {"description": "Number of values", "type": "number", "example": 3},
    "examples": [
        "WITH [1, 2, 3] AS nums UNWIND nums AS n RETURN count(n)",
        "WITH [1, 2, 2, 3] AS nums UNWIND nums AS n RETURN count(distinct n)"
    ]
})
class Count(AggregateFunction):
    """Count aggregate function.

    Counts the number of values across grouped rows.
    Supports DISTINCT to count only unique values.
    """

    def __init__(self) -> None:
        super().__init__("count")
        self._expected_parameter_count = 1
        self._supports_distinct = True
        self._distinct: bool = False

    def reduce(self, element: Union[CountReducerElement, DistinctCountReducerElement]) -> None:
        element.value = self.first_child().value()

    def element(self) -> Union[CountReducerElement, DistinctCountReducerElement]:
        return DistinctCountReducerElement() if self._distinct else CountReducerElement()

    @property
    def distinct(self) -> bool:
        return self._distinct

    @distinct.setter
    def distinct(self, val: bool) -> None:
        self._distinct = val
