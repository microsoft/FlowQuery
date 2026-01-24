"""Replace function."""

import re
from typing import Any

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Replaces occurrences of a pattern in a string",
    "category": "scalar",
    "parameters": [
        {"name": "text", "description": "Source string", "type": "string"},
        {"name": "pattern", "description": "Pattern to find", "type": "string"},
        {"name": "replacement", "description": "Replacement string", "type": "string"}
    ],
    "output": {"description": "String with replacements", "type": "string", "example": "hello world"},
    "examples": ["WITH 'hello there' AS s RETURN replace(s, 'there', 'world')"]
})
class Replace(Function):
    """Replace function.
    
    Replaces occurrences of a pattern in a string.
    """

    def __init__(self):
        super().__init__("replace")
        self._expected_parameter_count = 3

    def value(self) -> Any:
        text = self.get_children()[0].value()
        pattern = self.get_children()[1].value()
        replacement = self.get_children()[2].value()
        if not isinstance(text, str) or not isinstance(pattern, str) or not isinstance(replacement, str):
            raise ValueError("Invalid arguments for replace function")
        return re.sub(re.escape(pattern), replacement, text)
