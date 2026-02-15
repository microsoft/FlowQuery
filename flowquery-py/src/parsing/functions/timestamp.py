"""Timestamp function."""

import time
from typing import Any

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": (
        "Returns the number of milliseconds since the Unix epoch (1970-01-01T00:00:00Z)."
    ),
    "category": "scalar",
    "parameters": [],
    "output": {
        "description": "Milliseconds since Unix epoch",
        "type": "number",
        "example": 1718450000000,
    },
    "examples": [
        "RETURN timestamp() AS ts",
        "WITH timestamp() AS before, timestamp() AS after RETURN after - before",
    ],
})
class Timestamp(Function):
    """Timestamp function.

    Returns the number of milliseconds since the Unix epoch (1970-01-01T00:00:00Z).
    """

    def __init__(self) -> None:
        super().__init__("timestamp")
        self._expected_parameter_count = 0

    def value(self) -> Any:
        return int(time.time() * 1000)
