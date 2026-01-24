"""Collect aggregate function."""

from typing import Any, Dict, List, Union
import json

from .aggregate_function import AggregateFunction
from .reducer_element import ReducerElement
from .function_metadata import FunctionDef


class CollectReducerElement(ReducerElement):
    """Reducer element for Collect aggregate function."""

    def __init__(self):
        self._value: List[Any] = []

    @property
    def value(self) -> Any:
        return self._value

    @value.setter
    def value(self, val: Any) -> None:
        self._value.append(val)


class DistinctCollectReducerElement(ReducerElement):
    """Reducer element for Collect aggregate function with DISTINCT."""

    def __init__(self):
        self._value: Dict[str, Any] = {}

    @property
    def value(self) -> Any:
        return list(self._value.values())

    @value.setter
    def value(self, val: Any) -> None:
        key: str = json.dumps(val, sort_keys=True, default=str)
        if key not in self._value:
            self._value[key] = val


@FunctionDef({
    "description": "Collects values into an array across grouped rows",
    "category": "aggregate",
    "parameters": [
        {"name": "value", "description": "Value to collect", "type": "any"}
    ],
    "output": {"description": "Array of collected values", "type": "array", "example": [1, 2, 3]},
    "examples": ["WITH [1, 2, 3] AS nums UNWIND nums AS n RETURN collect(n)"]
})
class Collect(AggregateFunction):
    """Collect aggregate function.
    
    Collects values into an array across grouped rows.
    """

    def __init__(self):
        super().__init__("collect")
        self._expected_parameter_count = 1
        self._distinct: bool = False

    def reduce(self, element: CollectReducerElement) -> None:
        element.value = self.first_child().value()

    def element(self) -> Union[CollectReducerElement, DistinctCollectReducerElement]:
        return DistinctCollectReducerElement() if self._distinct else CollectReducerElement()

    @property
    def distinct(self) -> bool:
        return self._distinct

    @distinct.setter
    def distinct(self, val: bool) -> None:
        self._distinct = val
