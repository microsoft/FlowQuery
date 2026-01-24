"""Range function."""

from typing import Any, List

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Generates an array of sequential integers",
    "category": "scalar",
    "parameters": [
        {"name": "start", "description": "Starting number (inclusive)", "type": "number"},
        {"name": "end", "description": "Ending number (inclusive)", "type": "number"}
    ],
    "output": {"description": "Array of integers from start to end", "type": "array", "items": {"type": "number"}, "example": [1, 2, 3, 4, 5]},
    "examples": ["WITH range(1, 5) AS nums RETURN nums"]
})
class Range(Function):
    """Range function.
    
    Generates an array of sequential integers.
    """

    def __init__(self):
        super().__init__("range")
        self._expected_parameter_count = 2

    def value(self) -> Any:
        start = self.get_children()[0].value()
        end = self.get_children()[1].value()
        if not isinstance(start, (int, float)) or not isinstance(end, (int, float)):
            raise ValueError("Invalid arguments for range function")
        return list(range(int(start), int(end) + 1))
