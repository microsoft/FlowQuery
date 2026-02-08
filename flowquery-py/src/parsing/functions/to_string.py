"""ToString function."""

import json
from typing import Any

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Converts a value to its string representation",
    "category": "scalar",
    "parameters": [
        {"name": "value", "description": "Value to convert to a string", "type": "any"}
    ],
    "output": {"description": "String representation of the value", "type": "string", "example": "42"},
    "examples": [
        "WITH 42 AS n RETURN toString(n)",
        "WITH true AS b RETURN toString(b)",
        "WITH [1, 2, 3] AS arr RETURN toString(arr)"
    ]
})
class ToString(Function):
    """ToString function.

    Converts a value to its string representation.
    """

    def __init__(self) -> None:
        super().__init__("tostring")
        self._expected_parameter_count = 1

    def value(self) -> Any:
        val = self.get_children()[0].value()
        if val is None:
            return "null"
        if isinstance(val, bool):
            return str(val).lower()
        if isinstance(val, (dict, list)):
            return json.dumps(val)
        return str(val)
