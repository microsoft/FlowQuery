"""Shared utility functions for temporal (date/time) operations.

These helpers are used by the datetime_, date_, time_, localdatetime,
localtime, and timestamp functions.
"""

from datetime import date, datetime, timezone
from typing import Any, Dict


def iso_day_of_week(d: date) -> int:
    """Computes the ISO day of the week (1 = Monday, 7 = Sunday)."""
    return d.isoweekday()


def day_of_year(d: date) -> int:
    """Computes the day of the year (1-based)."""
    return d.timetuple().tm_yday


def quarter(month: int) -> int:
    """Computes the quarter (1-4) from a month (1-12)."""
    return (month - 1) // 3 + 1


def parse_temporal_arg(arg: Any, fn_name: str) -> datetime:
    """Parses a temporal argument (string, number, or map) into a datetime object.

    Args:
        arg: The argument to parse (string, number, or dict with components)
        fn_name: The calling function name for error messages

    Returns:
        A datetime object
    """
    if isinstance(arg, str):
        try:
            return datetime.fromisoformat(arg.replace("Z", "+00:00"))
        except ValueError:
            raise ValueError(f"{fn_name}(): Invalid temporal string: '{arg}'")

    if isinstance(arg, (int, float)):
        # Treat as epoch milliseconds
        return datetime.fromtimestamp(arg / 1000, tz=timezone.utc)

    if isinstance(arg, dict):
        # Map-style construction: {year, month, day, hour, minute, second, millisecond}
        now = datetime.now()
        year = arg.get("year", now.year)
        month = arg.get("month", 1)
        day = arg.get("day", 1)
        hour = arg.get("hour", 0)
        minute = arg.get("minute", 0)
        second = arg.get("second", 0)
        millisecond = arg.get("millisecond", 0)
        return datetime(year, month, day, hour, minute, second, millisecond * 1000)

    raise ValueError(
        f"{fn_name}(): Expected a string, number (epoch millis), or map argument, "
        f"got {type(arg).__name__}"
    )


def build_datetime_object(d: datetime, utc: bool) -> Dict[str, Any]:
    """Builds a datetime result object with full temporal properties.

    Args:
        d: The datetime object
        utc: If True, use UTC values; if False, use local values

    Returns:
        A dict with year, month, day, hour, minute, second, millisecond,
        epochMillis, epochSeconds, dayOfWeek, dayOfYear, quarter, formatted
    """
    if utc:
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        d_utc = d.astimezone(timezone.utc)
        year = d_utc.year
        month = d_utc.month
        day = d_utc.day
        hour = d_utc.hour
        minute = d_utc.minute
        second = d_utc.second
        millisecond = d_utc.microsecond // 1000
        formatted = d_utc.strftime("%Y-%m-%dT%H:%M:%S.") + f"{millisecond:03d}Z"
    else:
        if d.tzinfo is not None:
            d = d.astimezone(tz=None).replace(tzinfo=None)
        year = d.year
        month = d.month
        day = d.day
        hour = d.hour
        minute = d.minute
        second = d.second
        millisecond = d.microsecond // 1000
        formatted = d.strftime("%Y-%m-%dT%H:%M:%S.") + f"{millisecond:03d}"

    date_part = date(year, month, day)
    epoch_millis = int(d.timestamp() * 1000) if d.tzinfo else int(
        datetime(year, month, day, hour, minute, second, millisecond * 1000).timestamp() * 1000
    )

    return {
        "year": year,
        "month": month,
        "day": day,
        "hour": hour,
        "minute": minute,
        "second": second,
        "millisecond": millisecond,
        "epochMillis": epoch_millis,
        "epochSeconds": epoch_millis // 1000,
        "dayOfWeek": iso_day_of_week(date_part),
        "dayOfYear": day_of_year(date_part),
        "quarter": quarter(month),
        "formatted": formatted,
    }


def build_date_object(d: datetime) -> Dict[str, Any]:
    """Builds a date result object (no time component).

    Args:
        d: The datetime object

    Returns:
        A dict with year, month, day, epochMillis, dayOfWeek, dayOfYear, quarter, formatted
    """
    year = d.year
    month = d.month
    day_val = d.day

    date_only = datetime(year, month, day_val)
    epoch_millis = int(date_only.timestamp() * 1000)

    date_part = date(year, month, day_val)

    return {
        "year": year,
        "month": month,
        "day": day_val,
        "epochMillis": epoch_millis,
        "dayOfWeek": iso_day_of_week(date_part),
        "dayOfYear": day_of_year(date_part),
        "quarter": quarter(month),
        "formatted": f"{year}-{month:02d}-{day_val:02d}",
    }


def build_time_object(d: datetime, utc: bool) -> Dict[str, Any]:
    """Builds a time result object (no date component).

    Args:
        d: The datetime object
        utc: If True, use UTC values; if False, use local values

    Returns:
        A dict with hour, minute, second, millisecond, formatted
    """
    if utc:
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        d_utc = d.astimezone(timezone.utc)
        hour = d_utc.hour
        minute = d_utc.minute
        second = d_utc.second
        millisecond = d_utc.microsecond // 1000
    else:
        if d.tzinfo is not None:
            d = d.astimezone(tz=None).replace(tzinfo=None)
        hour = d.hour
        minute = d.minute
        second = d.second
        millisecond = d.microsecond // 1000

    time_part = f"{hour:02d}:{minute:02d}:{second:02d}.{millisecond:03d}"
    formatted = f"{time_part}Z" if utc else time_part

    return {
        "hour": hour,
        "minute": minute,
        "second": second,
        "millisecond": millisecond,
        "formatted": formatted,
    }
