"""ToFloat function."""

from typing import Any

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Converts a value to a floating point number",
    "category": "scalar",
    "parameters": [
        {"name": "value", "description": "The value to convert to a float", "type": "any"}
    ],
    "output": {"description": "The floating point representation of the value", "type": "number", "example": 3.14},
    "examples": [
        'RETURN toFloat("3.14")',
        "RETURN toFloat(42)",
        "RETURN toFloat(true)"
    ]
})
class ToFloat(Function):
    """ToFloat function.

    Converts a value to a floating point number.
    """

    def __init__(self) -> None:
        super().__init__("tofloat")
        self._expected_parameter_count = 1

    def value(self) -> Any:
        val = self.get_children()[0].value()
        if val is None:
            return None
        if isinstance(val, bool):
            return 1.0 if val else 0.0
        if isinstance(val, (int, float)):
            return float(val)
        if isinstance(val, str):
            trimmed = val.strip()
            try:
                return float(trimmed)
            except (ValueError, OverflowError):
                raise ValueError(f'Cannot convert string "{val}" to float')
        raise ValueError("toFloat() expects a number, string, or boolean")
