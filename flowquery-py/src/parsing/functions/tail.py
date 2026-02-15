"""Tail function."""

from typing import Any

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Returns all elements of a list except the first",
    "category": "scalar",
    "parameters": [
        {"name": "list", "description": "The list to get all but the first element from", "type": "array"}
    ],
    "output": {"description": "All elements except the first", "type": "array", "example": [2, 3]},
    "examples": [
        "RETURN tail([1, 2, 3])",
        "WITH ['a', 'b', 'c'] AS items RETURN tail(items)"
    ]
})
class Tail(Function):
    """Tail function.

    Returns all elements of a list except the first.
    """

    def __init__(self) -> None:
        super().__init__("tail")
        self._expected_parameter_count = 1

    def value(self) -> Any:
        val = self.get_children()[0].value()
        if val is None:
            return None
        if not isinstance(val, list):
            raise ValueError("tail() expects a list")
        return val[1:]
