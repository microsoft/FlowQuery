"""Trim function."""

from typing import Any

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Removes leading and trailing whitespace from a string",
    "category": "scalar",
    "parameters": [
        {"name": "text", "description": "String to trim", "type": "string"}
    ],
    "output": {"description": "Trimmed string", "type": "string", "example": "hello"},
    "examples": [
        "WITH '  hello  ' AS s RETURN trim(s)",
        "WITH '\\tfoo\\n' AS s RETURN trim(s)"
    ]
})
class Trim(Function):
    """Trim function.

    Removes leading and trailing whitespace from a string.
    """

    def __init__(self) -> None:
        super().__init__("trim")
        self._expected_parameter_count = 1

    def value(self) -> Any:
        val = self.get_children()[0].value()
        if not isinstance(val, str):
            raise ValueError("Invalid argument for trim function: expected a string")
        return val.strip()
