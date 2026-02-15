"""Local datetime function."""

from datetime import datetime
from typing import Any

from .function import Function
from .function_metadata import FunctionDef
from .temporal_utils import build_datetime_object, parse_temporal_arg


@FunctionDef({
    "description": (
        "Returns a local datetime value (no timezone). With no arguments returns the current local datetime. "
        "Accepts an ISO 8601 string or a map of components."
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
        "RETURN localdatetime() AS now",
        "RETURN localdatetime('2025-06-15T12:30:00') AS dt",
        "WITH localdatetime() AS dt RETURN dt.hour, dt.minute",
    ],
})
class LocalDatetime(Function):
    """Local datetime function.

    Returns a local datetime value (date + time, no timezone offset).
    When called with no arguments, returns the current local datetime.
    When called with a string argument, parses it as an ISO 8601 datetime.
    """

    def __init__(self) -> None:
        super().__init__("localdatetime")
        self._expected_parameter_count = None

    def value(self) -> Any:
        children = self.get_children()
        if len(children) > 1:
            raise ValueError("localdatetime() accepts at most one argument")

        if len(children) == 1:
            d = parse_temporal_arg(children[0].value(), "localdatetime")
        else:
            d = datetime.now()

        return build_datetime_object(d, utc=False)
