"""ToLower function."""

from typing import Any

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Converts a string to lowercase",
    "category": "scalar",
    "parameters": [
        {"name": "text", "description": "String to convert to lowercase", "type": "string"}
    ],
    "output": {"description": "Lowercase string", "type": "string", "example": "hello world"},
    "examples": [
        "WITH 'Hello World' AS s RETURN toLower(s)",
        "WITH 'FOO' AS s RETURN toLower(s)"
    ]
})
class ToLower(Function):
    """ToLower function.

    Converts a string to lowercase.
    """

    def __init__(self) -> None:
        super().__init__("tolower")
        self._expected_parameter_count = 1

    def value(self) -> Any:
        val = self.get_children()[0].value()
        if val is None:
            return None
        if not isinstance(val, str):
            raise ValueError("Invalid argument for toLower function: expected a string")
        return val.lower()
