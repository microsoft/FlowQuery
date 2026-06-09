"""Natural logarithm function."""

import math
from typing import Any

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Returns the natural logarithm (base e) of a number",
    "category": "scalar",
    "parameters": [
        {"name": "value", "description": "Number to take the natural logarithm of", "type": "number"}
    ],
    "output": {
        "description": "Natural logarithm of the input",
        "type": "number",
        "example": 2.302585092994046,
    },
    "examples": ["WITH 10 AS n RETURN log(n)"]
})
class Log(Function):
    """Natural logarithm function.

    Returns the natural logarithm (base e) of a number.
    """

    def __init__(self) -> None:
        super().__init__("log")
        self._expected_parameter_count = 1

    def value(self) -> Any:
        val = self.get_children()[0].value()
        if val is None:
            return None
        if not isinstance(val, (int, float)) or isinstance(val, bool):
            raise ValueError("Invalid argument for log function")
        if val > 0:
            return math.log(val)
        if val == 0:
            return float("-inf")
        return float("nan")
