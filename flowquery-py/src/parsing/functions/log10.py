"""Base-10 logarithm function."""

import math
from typing import Any

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Returns the base-10 logarithm of a number",
    "category": "scalar",
    "parameters": [
        {"name": "value", "description": "Number to take the base-10 logarithm of", "type": "number"}
    ],
    "output": {
        "description": "Base-10 logarithm of the input",
        "type": "number",
        "example": 3,
    },
    "examples": ["WITH 1000 AS n RETURN log10(n)"]
})
class Log10(Function):
    """Base-10 logarithm function.

    Returns the base-10 logarithm of a number.
    """

    def __init__(self) -> None:
        super().__init__("log10")
        self._expected_parameter_count = 1

    def value(self) -> Any:
        val = self.get_children()[0].value()
        if val is None:
            return None
        if not isinstance(val, (int, float)) or isinstance(val, bool):
            raise ValueError("Invalid argument for log10 function")
        if val > 0:
            return math.log10(val)
        if val == 0:
            return float("-inf")
        return float("nan")
