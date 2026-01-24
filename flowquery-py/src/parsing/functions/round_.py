"""Round function."""

from typing import Any

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Rounds a number to the nearest integer",
    "category": "scalar",
    "parameters": [
        {"name": "value", "description": "Number to round", "type": "number"}
    ],
    "output": {"description": "Rounded integer", "type": "number", "example": 4},
    "examples": ["WITH 3.7 AS n RETURN round(n)"]
})
class Round(Function):
    """Round function.
    
    Rounds a number to the nearest integer.
    """

    def __init__(self):
        super().__init__("round")
        self._expected_parameter_count = 1

    def value(self) -> Any:
        val = self.get_children()[0].value()
        if not isinstance(val, (int, float)):
            raise ValueError("Invalid argument for round function")
        return round(val)
