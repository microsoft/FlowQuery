"""Reference to a LET-bound binding by name."""

from typing import Any

from .identifier import Identifier


class BindingReference(Identifier):
    """Reference to a LET-bound binding, resolved at execution time
    against the global :class:`Bindings` singleton."""

    def __init__(self, value: str, optional: bool = False):
        super().__init__(value)
        # When True, resolving a name absent from the global Bindings
        # store yields None instead of raising.  Used for projection
        # references (``RETURN name`` / ``WITH name``), where a bare
        # unresolved identifier historically evaluated to None; lenient
        # mode preserves that behaviour for genuinely unknown names
        # while still resolving real LET bindings.
        self._optional = optional

    @property
    def name(self) -> str:
        return self._value

    def __str__(self) -> str:
        return f"BindingReference ({self._value})"

    def value(self) -> Any:
        from ...graph.bindings import Bindings

        bindings = Bindings.get_instance()
        if not bindings.has(self._value):
            if self._optional:
                return None
            raise RuntimeError(f"Binding '{self._value}' is not defined")
        return bindings.get(self._value)
