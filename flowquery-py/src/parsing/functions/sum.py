"""Sum aggregate function."""

from typing import Any

from .aggregate_function import AggregateFunction
from .reducer_element import ReducerElement
from .function_metadata import FunctionDef


class SumReducerElement(ReducerElement):
    """Reducer element for Sum aggregate function."""

    def __init__(self):
        self._value: Any = None

    @property
    def value(self) -> Any:
        return self._value

    @value.setter
    def value(self, val: Any) -> None:
        if self._value is not None:
            self._value += val
        else:
            self._value = val


@FunctionDef({
    "description": "Calculates the sum of numeric values across grouped rows",
    "category": "aggregate",
    "parameters": [
        {"name": "value", "description": "Numeric value to sum", "type": "number"}
    ],
    "output": {"description": "Sum of all values", "type": "number", "example": 150},
    "examples": ["WITH [1, 2, 3] AS nums UNWIND nums AS n RETURN sum(n)"]
})
class Sum(AggregateFunction):
    """Sum aggregate function.
    
    Calculates the sum of numeric values across grouped rows.
    """

    def __init__(self):
        super().__init__("sum")
        self._expected_parameter_count = 1

    def reduce(self, element: SumReducerElement) -> None:
        element.value = self.first_child().value()

    def element(self) -> SumReducerElement:
        return SumReducerElement()
