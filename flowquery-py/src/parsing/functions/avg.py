"""Avg aggregate function."""

from typing import Optional

from .aggregate_function import AggregateFunction
from .reducer_element import ReducerElement
from .function_metadata import FunctionDef


class AvgReducerElement(ReducerElement):
    """Reducer element for Avg aggregate function."""

    def __init__(self):
        self._count: int = 0
        self._sum: Optional[float] = None

    @property
    def value(self) -> Optional[float]:
        if self._sum is None:
            return None
        return self._sum / self._count

    @value.setter
    def value(self, val: float) -> None:
        self._count += 1
        if self._sum is not None:
            self._sum += val
        else:
            self._sum = val


@FunctionDef({
    "description": "Calculates the average of numeric values across grouped rows",
    "category": "aggregate",
    "parameters": [
        {"name": "value", "description": "Numeric value to average", "type": "number"}
    ],
    "output": {"description": "Average of all values", "type": "number", "example": 50},
    "examples": ["WITH [10, 20, 30] AS nums UNWIND nums AS n RETURN avg(n)"]
})
class Avg(AggregateFunction):
    """Avg aggregate function.
    
    Calculates the average of numeric values across grouped rows.
    """

    def __init__(self):
        super().__init__("avg")
        self._expected_parameter_count = 1

    def reduce(self, element: AvgReducerElement) -> None:
        element.value = self.first_child().value()

    def element(self) -> AvgReducerElement:
        return AvgReducerElement()
