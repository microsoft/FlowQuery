"""Max aggregate function."""

from typing import Any

from .aggregate_function import AggregateFunction
from .function_metadata import FunctionDef
from .reducer_element import ReducerElement


class MaxReducerElement(ReducerElement):
    """Reducer element for Max aggregate function."""

    def __init__(self) -> None:
        self._value: Any = None

    @property
    def value(self) -> Any:
        return self._value

    @value.setter
    def value(self, val: Any) -> None:
        if self._value is None or val > self._value:
            self._value = val


@FunctionDef({
    "description": "Returns the maximum value across grouped rows",
    "category": "aggregate",
    "parameters": [
        {"name": "value", "description": "Value to compare", "type": "number"}
    ],
    "output": {"description": "Maximum value", "type": "number", "example": 10},
    "examples": ["WITH [3, 1, 2] AS nums UNWIND nums AS n RETURN max(n)"]
})
class Max(AggregateFunction):
    """Max aggregate function.

    Returns the maximum value across grouped rows.
    """

    def __init__(self) -> None:
        super().__init__("max")
        self._expected_parameter_count = 1

    def reduce(self, element: MaxReducerElement) -> None:
        element.value = self.first_child().value()

    def element(self) -> MaxReducerElement:
        return MaxReducerElement()
