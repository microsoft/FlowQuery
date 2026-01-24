"""Type function."""

from typing import Any

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Returns the type of a value as a string",
    "category": "scalar",
    "parameters": [
        {"name": "value", "description": "Value to check the type of", "type": "any"}
    ],
    "output": {"description": "Type of the input value", "type": "string", "example": "string"},
    "examples": [
        "WITH 'hello' AS val RETURN type(val)",
        "WITH 42 AS val RETURN type(val)",
        "WITH [1, 2, 3] AS val RETURN type(val)"
    ]
})
class Type(Function):
    """Type function.
    
    Returns the type of a value as a string.
    """

    def __init__(self):
        super().__init__("type")
        self._expected_parameter_count = 1

    def value(self) -> Any:
        val = self.get_children()[0].value()
        
        if val is None:
            return "null"
        if isinstance(val, list):
            return "array"
        if isinstance(val, dict):
            return "object"
        if isinstance(val, bool):
            return "boolean"
        if isinstance(val, (int, float)):
            return "number"
        if isinstance(val, str):
            return "string"
        return type(val).__name__
