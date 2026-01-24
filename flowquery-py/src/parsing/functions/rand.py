"""Rand function."""

import random
from typing import Any

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Generates a random number between 0 and 1",
    "category": "scalar",
    "parameters": [],
    "output": {"description": "Random number between 0 and 1", "type": "number", "example": 0.7234},
    "examples": ["WITH rand() AS r RETURN r"]
})
class Rand(Function):
    """Rand function.
    
    Generates a random number between 0 and 1.
    """

    def __init__(self):
        super().__init__("rand")
        self._expected_parameter_count = 0

    def value(self) -> Any:
        return random.random()
