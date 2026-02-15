"""Date function."""

from datetime import datetime
from typing import Any

from .function import Function
from .function_metadata import FunctionDef
from .temporal_utils import build_date_object, parse_temporal_arg


@FunctionDef({
    "description": (
        "Returns a date value. With no arguments returns the current date. "
        "Accepts an ISO 8601 date string or a map of components (year, month, day)."
    ),
    "category": "scalar",
    "parameters": [
        {
            "name": "input",
            "description": "Optional. An ISO 8601 date string (YYYY-MM-DD) or a map of components.",
            "type": "string",
            "required": False,
        },
    ],
    "output": {
        "description": (
            "A date object with properties: year, month, day, "
            "epochMillis, dayOfWeek, dayOfYear, quarter, formatted"
        ),
        "type": "object",
    },
    "examples": [
        "RETURN date() AS today",
        "RETURN date('2025-06-15') AS d",
        "RETURN date({year: 2025, month: 6, day: 15}) AS d",
        "WITH date() AS d RETURN d.year, d.month, d.dayOfWeek",
    ],
})
class DateFunction(Function):
    """Date function.

    Returns a date value (no time component).
    When called with no arguments, returns the current date.
    When called with a string argument, parses it as an ISO 8601 date.
    """

    def __init__(self) -> None:
        super().__init__("date")
        self._expected_parameter_count = None

    def value(self) -> Any:
        children = self.get_children()
        if len(children) > 1:
            raise ValueError("date() accepts at most one argument")

        if len(children) == 1:
            d = parse_temporal_arg(children[0].value(), "date")
        else:
            d = datetime.now()

        return build_date_object(d)
