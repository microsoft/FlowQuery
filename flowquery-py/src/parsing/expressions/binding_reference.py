"""Reference to a LET-bound binding by name."""

from typing import Any

from .identifier import Identifier


class BindingReference(Identifier):
    """Reference to a LET-bound binding, resolved at execution time
    against the global :class:`Bindings` singleton."""

    def __init__(self, value: str):
        super().__init__(value)

    @property
    def name(self) -> str:
        return self._value

    def __str__(self) -> str:
        return f"BindingReference ({self._value})"

    def value(self) -> Any:
        from ...graph.bindings import Bindings

        bindings = Bindings.get_instance()
        if not bindings.has(self._value):
            raise RuntimeError(f"Binding '{self._value}' is not defined")
        return bindings.get(self._value)
