"""Datetime function."""

from datetime import datetime, timezone
from typing import Any

from .function import Function
from .function_metadata import FunctionDef
from .temporal_utils import build_datetime_object, parse_temporal_arg


@FunctionDef({
    "description": (
        "Returns a datetime value. With no arguments returns the current UTC datetime. "
        "Accepts an ISO 8601 string or a map of components (year, month, day, hour, minute, second, millisecond)."
    ),
    "category": "scalar",
    "parameters": [
        {
            "name": "input",
            "description": "Optional. An ISO 8601 datetime string or a map of components.",
            "type": "string",
            "required": False,
        },
    ],
    "output": {
        "description": (
            "A datetime object with properties: year, month, day, hour, minute, second, millisecond, "
            "epochMillis, epochSeconds, dayOfWeek, dayOfYear, quarter, formatted"
        ),
        "type": "object",
    },
    "examples": [
        "RETURN datetime() AS now",
        "RETURN datetime('2025-06-15T12:30:00Z') AS dt",
        "RETURN datetime({year: 2025, month: 6, day: 15, hour: 12}) AS dt",
        "WITH datetime() AS dt RETURN dt.year, dt.month, dt.day",
    ],
})
class Datetime(Function):
    """Datetime function.

    Returns a datetime value (date + time + timezone offset).
    When called with no arguments, returns the current UTC datetime.
    When called with a string argument, parses it as an ISO 8601 datetime.
    When called with a map argument, constructs a datetime from components.

    Equivalent to Neo4j's datetime() function.
    """

    def __init__(self) -> None:
        super().__init__("datetime")
        self._expected_parameter_count = None

    def value(self) -> Any:
        children = self.get_children()
        if len(children) > 1:
            raise ValueError("datetime() accepts at most one argument")

        if len(children) == 1:
            d = parse_temporal_arg(children[0].value(), "datetime")
        else:
            d = datetime.now(timezone.utc)

        return build_datetime_object(d, utc=True)
