"""ToInteger function."""

from typing import Any

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Converts a value to an integer",
    "category": "scalar",
    "parameters": [
        {"name": "value", "description": "The value to convert to an integer", "type": "any"}
    ],
    "output": {"description": "The integer representation of the value", "type": "number", "example": 42},
    "examples": [
        'RETURN toInteger("42")',
        "RETURN toInteger(3.14)",
        "RETURN toInteger(true)"
    ]
})
class ToInteger(Function):
    """ToInteger function.

    Converts a value to an integer.
    """

    def __init__(self) -> None:
        super().__init__("tointeger")
        self._expected_parameter_count = 1

    def value(self) -> Any:
        val = self.get_children()[0].value()
        if val is None:
            return None
        if isinstance(val, bool):
            return 1 if val else 0
        if isinstance(val, (int, float)):
            return int(val)
        if isinstance(val, str):
            trimmed = val.strip()
            try:
                return int(float(trimmed))
            except (ValueError, OverflowError):
                raise ValueError(f'Cannot convert string "{val}" to integer')
        raise ValueError("toInteger() expects a number, string, or boolean")
