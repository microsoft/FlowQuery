"""Singleton store for LET-bound values."""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional


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

    def merge(
        self,
        name: str,
        incoming: List[Any],
        keys: List[str],
        set_fields: Optional[List[str]] = None,
        when_matched: bool = True,
        when_not_matched: bool = True,
    ) -> None:
        """Merge incoming rows into an existing array-binding using one
        or more keys.

        For every incoming row whose key tuple matches an existing row,
        the existing row is replaced (or partially updated when
        ``set_fields`` is provided).  Incoming rows with no match are
        appended to the end (preserving the existing order of matched
        rows).  Rows that aren't dicts or are missing one of the keys
        are appended unconditionally.

        The ``when_matched`` / ``when_not_matched`` flags suppress the
        corresponding branch, mirroring SQL ``MERGE``'s
        ``WHEN MATCHED`` / ``WHEN NOT MATCHED`` clauses.
        """
        if len(keys) == 0:
            raise ValueError("UPDATE ... MERGE requires at least one key")
        key_label = keys[0] if len(keys) == 1 else f"({', '.join(keys)})"
        if not isinstance(incoming, list):
            raise ValueError(
                f"UPDATE ... MERGE ON {key_label} requires the right-hand "
                "side to evaluate to a list of rows"
            )
        existing = Bindings._values.get(name)
        if not isinstance(existing, list):
            # First-ever MERGE on a missing / non-list binding inserts the
            # incoming rows wholesale (filtered by when_not_matched).
            Bindings._values[name] = list(incoming) if when_not_matched else []
            return

        def row_key(row: Any) -> Optional[str]:
            if not isinstance(row, dict):
                return None
            parts: List[Any] = []
            for k in keys:
                if k not in row:
                    return None
                parts.append(row[k])
            return json.dumps(parts, sort_keys=False, default=str)

        index_by_key: Dict[str, int] = {}
        for i, row in enumerate(existing):
            k = row_key(row)
            if k is not None:
                index_by_key[k] = i
        result = list(existing)
        for row in incoming:
            k = row_key(row)
            if k is None:
                if when_not_matched:
                    result.append(row)
                continue
            matched = index_by_key.get(k)
            if matched is not None:
                if not when_matched:
                    continue
                if set_fields is not None:
                    updated = dict(result[matched])
                    for f in set_fields:
                        if f in row:
                            updated[f] = row[f]
                    result[matched] = updated
                else:
                    result[matched] = row
            else:
                if not when_not_matched:
                    continue
                index_by_key[k] = len(result)
                result.append(row)
        Bindings._values[name] = result

