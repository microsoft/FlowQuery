"""ToJson function."""

import json
from typing import Any

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Parses a JSON string into an object",
    "category": "scalar",
    "parameters": [
        {"name": "text", "description": "JSON string to parse", "type": "string"}
    ],
    "output": {"description": "Parsed object or array", "type": "object", "example": {"a": 1}},
    "examples": ["WITH '{\"a\": 1}' AS s RETURN tojson(s)"]
})
class ToJson(Function):
    """ToJson function.
    
    Parses a JSON string into an object.
    """

    def __init__(self):
        super().__init__("tojson")
        self._expected_parameter_count = 1

    def value(self) -> Any:
        text = self.get_children()[0].value()
        if not isinstance(text, str):
            raise ValueError("Invalid arguments for tojson function")
        return json.loads(text)
