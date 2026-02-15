"""Local time function."""

from datetime import datetime
from typing import Any

from .function import Function
from .function_metadata import FunctionDef
from .temporal_utils import build_time_object, parse_temporal_arg


@FunctionDef({
    "description": (
        "Returns a local time value (no timezone). With no arguments returns the current local time. "
        "Accepts an ISO 8601 time string or a map of components."
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
        "RETURN localtime() AS now",
        "RETURN localtime('14:30:00') AS t",
        "WITH localtime() AS t RETURN t.hour, t.minute",
    ],
})
class LocalTime(Function):
    """Local time function.

    Returns a local time value (no timezone offset).
    When called with no arguments, returns the current local time.
    When called with a string argument, parses it.

    Equivalent to Neo4j's localtime() function.
    """

    def __init__(self) -> None:
        super().__init__("localtime")
        self._expected_parameter_count = None

    def value(self) -> Any:
        children = self.get_children()
        if len(children) > 1:
            raise ValueError("localtime() accepts at most one argument")

        if len(children) == 1:
            d = parse_temporal_arg(children[0].value(), "localtime")
        else:
            d = datetime.now()

        return build_time_object(d, utc=False)
