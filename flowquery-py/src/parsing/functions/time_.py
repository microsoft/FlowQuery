"""Time function."""

from datetime import datetime, timezone
from typing import Any

from .function import Function
from .function_metadata import FunctionDef
from .temporal_utils import build_time_object, parse_temporal_arg


@FunctionDef({
    "description": (
        "Returns a time value. With no arguments returns the current UTC time. "
        "Accepts an ISO 8601 time string or a map of components (hour, minute, second, millisecond)."
    ),
    "category": "scalar",
    "parameters": [
        {
            "name": "input",
            "description": "Optional. An ISO 8601 time string (HH:MM:SS) or a map of components.",
            "type": "string",
            "required": False,
        },
    ],
    "output": {
        "description": "A time object with properties: hour, minute, second, millisecond, formatted",
        "type": "object",
    },
    "examples": [
        "RETURN time() AS now",
        "RETURN time('12:30:00') AS t",
        "WITH time() AS t RETURN t.hour, t.minute",
    ],
})
class Time(Function):
    """Time function.

    Returns a time value (with timezone offset awareness).
    When called with no arguments, returns the current UTC time.
    When called with a string argument, parses it.

    Equivalent to Neo4j's time() function.
    """

    def __init__(self) -> None:
        super().__init__("time")
        self._expected_parameter_count = None

    def value(self) -> Any:
        children = self.get_children()
        if len(children) > 1:
            raise ValueError("time() accepts at most one argument")

        if len(children) == 1:
            d = parse_temporal_arg(children[0].value(), "time")
        else:
            d = datetime.now(timezone.utc)

        return build_time_object(d, utc=True)
