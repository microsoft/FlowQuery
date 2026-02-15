"""Head function."""

from typing import Any

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Returns the first element of a list",
    "category": "scalar",
    "parameters": [
        {"name": "list", "description": "The list to get the first element from", "type": "array"}
    ],
    "output": {"description": "The first element of the list", "type": "any", "example": "1"},
    "examples": [
        "RETURN head([1, 2, 3])",
        "WITH ['a', 'b', 'c'] AS items RETURN head(items)"
    ]
})
class Head(Function):
    """Head function.

    Returns the first element of a list.
    """

    def __init__(self) -> None:
        super().__init__("head")
        self._expected_parameter_count = 1

    def value(self) -> Any:
        val = self.get_children()[0].value()
        if val is None:
            return None
        if not isinstance(val, list):
            raise ValueError("head() expects a list")
        if len(val) == 0:
            return None
        return val[0]
