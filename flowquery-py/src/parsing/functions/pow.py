"""Power function."""

import math
from typing import Any

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Returns the value of a number raised to the power of another number",
    "category": "scalar",
    "parameters": [
        {"name": "base", "description": "The base number", "type": "number"},
        {"name": "exponent", "description": "The exponent to raise the base to", "type": "number"}
    ],
    "output": {
        "description": "base raised to the power of exponent",
        "type": "number",
        "example": 8,
    },
    "examples": ["WITH 2 AS b, 3 AS e RETURN pow(b, e)"]
})
class Pow(Function):
    """Power function.

    Returns the value of a base raised to the power of an exponent.
    """

    def __init__(self) -> None:
        super().__init__("pow")
        self._expected_parameter_count = 2

    def value(self) -> Any:
        base = self.get_children()[0].value()
        exponent = self.get_children()[1].value()
        if base is None or exponent is None:
            return None
        if (
            not isinstance(base, (int, float)) or isinstance(base, bool)
            or not isinstance(exponent, (int, float)) or isinstance(exponent, bool)
        ):
            raise ValueError("Invalid arguments for pow function")
        try:
            return math.pow(base, exponent)
        except ValueError:
            return float("nan")
