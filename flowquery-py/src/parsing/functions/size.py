"""Size function."""

from typing import Any

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Returns the length of an array or string",
    "category": "scalar",
    "parameters": [
        {"name": "value", "description": "Array or string to measure", "type": "array"}
    ],
    "output": {"description": "Length of the input", "type": "number", "example": 3},
    "examples": ["WITH [1, 2, 3] AS arr RETURN size(arr)"]
})
class Size(Function):
    """Size function.
    
    Returns the length of an array or string.
    """

    def __init__(self):
        super().__init__("size")
        self._expected_parameter_count = 1

    def value(self) -> Any:
        val = self.get_children()[0].value()
        if not isinstance(val, (list, str)):
            raise ValueError("Invalid argument for size function")
        return len(val)
