"""Duration function."""

import re
from typing import Any, Dict

from .function import Function
from .function_metadata import FunctionDef

ISO_DURATION_REGEX = re.compile(
    r"^P(?:(\d+(?:\.\d+)?)Y)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)W)?"
    r"(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?"
    r"(?:(\d+(?:\.\d+)?)S)?)?$"
)


def _parse_duration_string(s: str) -> Dict[str, float]:
    """Parse an ISO 8601 duration string into components."""
    match = ISO_DURATION_REGEX.match(s)
    if not match:
        raise ValueError(f"duration(): Invalid ISO 8601 duration string: '{s}'")
    return {
        "years": float(match.group(1)) if match.group(1) else 0,
        "months": float(match.group(2)) if match.group(2) else 0,
        "weeks": float(match.group(3)) if match.group(3) else 0,
        "days": float(match.group(4)) if match.group(4) else 0,
        "hours": float(match.group(5)) if match.group(5) else 0,
        "minutes": float(match.group(6)) if match.group(6) else 0,
        "seconds": float(match.group(7)) if match.group(7) else 0,
    }


def _build_duration_object(components: Dict[str, Any]) -> Dict[str, Any]:
    """Build a duration result object from components."""
    years = components.get("years", 0) or 0
    months = components.get("months", 0) or 0
    weeks = components.get("weeks", 0) or 0
    days = components.get("days", 0) or 0
    hours = components.get("hours", 0) or 0
    minutes = components.get("minutes", 0) or 0
    raw_seconds = components.get("seconds", 0) or 0
    seconds = int(raw_seconds)
    fractional_seconds = raw_seconds - seconds

    if "milliseconds" in components and components["milliseconds"]:
        milliseconds = int(components["milliseconds"])
    else:
        milliseconds = round(fractional_seconds * 1000)

    if "nanoseconds" in components and components["nanoseconds"]:
        nanoseconds = int(components["nanoseconds"])
    else:
        nanoseconds = round(fractional_seconds * 1_000_000_000) % 1_000_000

    # Total days including weeks
    total_days = int(days + weeks * 7)

    # Total seconds for the time portion
    total_seconds = int(hours * 3600 + minutes * 60 + seconds)

    # Total months
    total_months = int(years * 12 + months)

    # Build ISO 8601 formatted string
    formatted = "P"
    if years:
        formatted += f"{int(years)}Y"
    if months:
        formatted += f"{int(months)}M"
    if weeks:
        formatted += f"{int(weeks)}W"
    raw_days = int(total_days - weeks * 7)
    if raw_days:
        formatted += f"{raw_days}D"
    has_time = hours or minutes or seconds or milliseconds
    if has_time:
        formatted += "T"
        if hours:
            formatted += f"{int(hours)}H"
        if minutes:
            formatted += f"{int(minutes)}M"
        if seconds or milliseconds:
            if milliseconds:
                formatted += f"{seconds}.{milliseconds:03d}S"
            else:
                formatted += f"{seconds}S"
    if formatted == "P":
        formatted = "PT0S"

    return {
        "years": int(years),
        "months": int(months),
        "weeks": int(weeks),
        "days": total_days,
        "hours": int(hours),
        "minutes": int(minutes),
        "seconds": seconds,
        "milliseconds": milliseconds,
        "nanoseconds": nanoseconds,
        "totalMonths": total_months,
        "totalDays": total_days,
        "totalSeconds": total_seconds,
        "formatted": formatted,
    }


@FunctionDef({
    "description": (
        "Creates a duration value representing a span of time. "
        "Accepts an ISO 8601 duration string (e.g., 'P1Y2M3DT4H5M6S') or a map of components "
        "(years, months, weeks, days, hours, minutes, seconds, milliseconds, nanoseconds)."
    ),
    "category": "scalar",
    "parameters": [
        {
            "name": "input",
            "description": (
                "An ISO 8601 duration string or a map of components "
                "(years, months, weeks, days, hours, minutes, seconds, milliseconds, nanoseconds)"
            ),
            "type": "any",
        }
    ],
    "output": {
        "description": (
            "A duration object with properties: years, months, weeks, days, hours, minutes, seconds, "
            "milliseconds, nanoseconds, totalMonths, totalDays, totalSeconds, formatted"
        ),
        "type": "object",
    },
    "examples": [
        "RETURN duration('P1Y2M3D') AS d",
        "RETURN duration('PT2H30M') AS d",
        "RETURN duration({days: 14, hours: 16}) AS d",
        "RETURN duration({months: 5, days: 1, hours: 12}) AS d",
    ],
})
class Duration(Function):
    """Duration function.

    Creates a duration value representing a span of time.
    """

    def __init__(self) -> None:
        super().__init__("duration")
        self._expected_parameter_count = 1

    def value(self) -> Any:
        arg = self.get_children()[0].value()
        if arg is None:
            return None

        if isinstance(arg, str):
            components = _parse_duration_string(arg)
            return _build_duration_object(components)

        if isinstance(arg, dict):
            return _build_duration_object(arg)

        raise ValueError("duration() expects a string or map argument")
