"""Reducer element for aggregate functions."""

from typing import Any


class ReducerElement:
    """Base class for reducer elements used in aggregate functions."""

    @property
    def value(self) -> Any:
        raise NotImplementedError("Method not implemented.")

    @value.setter
    def value(self, val: Any) -> None:
        raise NotImplementedError("Method not implemented.")
