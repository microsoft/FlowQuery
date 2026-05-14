"""Singleton store for LET-bound values."""

from __future__ import annotations

from typing import Any, Dict, List


class Bindings:
    """Singleton store for LET-bound values.

    Bindings live alongside virtual node/relationship definitions in
    Database — they are persistent across statements within a top-level
    Runner invocation.

    A binding's value may be any JSON-serialisable value: a primitive,
    a list, or a dict.  Bindings are referenced by name inside virtual
    definitions and inside ``LOAD JSON FROM <name>`` expressions; the
    ``UPDATE`` statement replaces or merges into an existing binding.
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

    def merge(self, name: str, key: str, incoming: List[Any]) -> None:
        """Merge incoming rows into an existing array-binding keyed by ``key``.

        Rows in the existing binding with a matching key value are
        replaced entirely; rows whose key is not present are appended.
        """
        if not isinstance(incoming, list):
            raise ValueError(
                f"UPDATE ... MERGE ON {key} requires the right-hand side "
                "to evaluate to a list of rows"
            )
        existing = Bindings._values.get(name)
        if not isinstance(existing, list):
            Bindings._values[name] = list(incoming)
            return
        index_by_key: Dict[Any, int] = {}
        for i, row in enumerate(existing):
            if isinstance(row, dict) and key in row:
                index_by_key[row[key]] = i
        result = list(existing)
        for row in incoming:
            if isinstance(row, dict) and key in row:
                matched = index_by_key.get(row[key])
                if matched is not None:
                    result[matched] = row
                else:
                    index_by_key[row[key]] = len(result)
                    result.append(row)
            else:
                result.append(row)
        Bindings._values[name] = result
