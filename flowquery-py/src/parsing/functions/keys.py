"""Keys function."""

from typing import Any, List

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Returns the keys of an object (associative array) as an array",
    "category": "scalar",
    "parameters": [
        {"name": "object", "description": "Object to extract keys from", "type": "object"}
    ],
    "output": {"description": "Array of keys", "type": "array", "example": ["name", "age"]},
    "examples": ["WITH { name: 'Alice', age: 30 } AS obj RETURN keys(obj)"]
})
class Keys(Function):
    """Keys function.
    
    Returns the keys of an object (associative array) as an array.
    """

    def __init__(self):
        super().__init__("keys")
        self._expected_parameter_count = 1

    def value(self) -> Any:
        obj = self.get_children()[0].value()
        if obj is None:
            return []
        if not isinstance(obj, dict):
            raise ValueError("keys() expects an object, not an array or primitive")
        return list(obj.keys())
