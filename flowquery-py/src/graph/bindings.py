"""Singleton store for LET-bound values."""

from __future__ import annotations

from typing import Any, Dict


class Bindings:
    """Singleton store for LET-bound values.

    Bindings live alongside virtual node/relationship definitions in
    Database — they are persistent across statements within a top-level
    Runner invocation.

    A binding's value may be any JSON-serialisable value: a primitive,
    a list, or a dict.  Bindings are referenced by name inside virtual
    definitions and inside ``LOAD JSON FROM <name>`` expressions; the
    ``UPDATE`` statement replaces an existing binding wholesale, while
    ``MERGE INTO … USING …`` upserts per row.
    """

    _instance: 'Bindings | None' = None
    _values: Dict[str, Any] = {}

    @classmethod
    def get_instance(cls) -> 'Bindings':
        if cls._instance is None:
            cls._instance = Bindings()
        return cls._instance

    def set(self, name: str, value: Any) -> None:
        Bindings._values[name] = value

    def get(self, name: str) -> Any:
        return Bindings._values.get(name)

    def has(self, name: str) -> bool:
        return name in Bindings._values

    def delete(self, name: str) -> None:
        Bindings._values.pop(name, None)

    def clear(self) -> None:
        Bindings._values.clear()
