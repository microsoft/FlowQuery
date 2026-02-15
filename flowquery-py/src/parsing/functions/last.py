"""Last function."""

from typing import Any

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Returns the last element of a list",
    "category": "scalar",
    "parameters": [
        {"name": "list", "description": "The list to get the last element from", "type": "array"}
    ],
    "output": {"description": "The last element of the list", "type": "any", "example": "3"},
    "examples": [
        "RETURN last([1, 2, 3])",
        "WITH ['a', 'b', 'c'] AS items RETURN last(items)"
    ]
})
class Last(Function):
    """Last function.

    Returns the last element of a list.
    """

    def __init__(self) -> None:
        super().__init__("last")
        self._expected_parameter_count = 1

    def value(self) -> Any:
        val = self.get_children()[0].value()
        if val is None:
            return None
        if not isinstance(val, list):
            raise ValueError("last() expects a list")
        if len(val) == 0:
            return None
        return val[-1]
