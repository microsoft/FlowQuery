"""Singleton store for LET-bound values."""

from __future__ import annotations

import time
from typing import TYPE_CHECKING, Any, Dict, Optional, Set

if TYPE_CHECKING:
    from ..parsing.ast_node import ASTNode


def _now_ms() -> int:
    return int(time.monotonic() * 1000)


class BindingEntry:
    """One entry in the Bindings singleton.

    Plain bindings store their materialised ``value`` directly;
    refreshable bindings (created by ``LET name = { ... } REFRESH
    EVERY n unit``) additionally store the backing ``statement`` and
    TTL so the value can be re-evaluated on read once stale.
    """

    __slots__ = (
        "value",
        "statement",
        "is_refreshable",
        "refresh_every_ms",
        "cached_at",
        "primed",
    )

    def __init__(self) -> None:
        self.value: Any = None
        self.statement: Optional["ASTNode"] = None
        self.is_refreshable: bool = False
        self.refresh_every_ms: Optional[int] = None
        self.cached_at: int = 0
        self.primed: bool = False


class Bindings:
    """Singleton store for LET-bound values.

    Bindings live alongside virtual node/relationship definitions in
    Database: they are persistent across statements for the lifetime
    of the process.

    ``LET name = { ... } REFRESH EVERY n unit`` registers a
    refreshable binding: the sub-query is evaluated eagerly and the
    result is cached, but the TTL causes the next read after expiry
    to re-execute the sub-query.  Refreshable bindings cannot be
    silently overwritten by another ``LET``, ``UPDATE``, or
    ``MERGE``; callers must ``DROP BINDING`` first.
    """

    _instance: "Bindings | None" = None
    _entries: Dict[str, BindingEntry] = {}
    _materializing: Set[str] = set()

    @classmethod
    def get_instance(cls) -> "Bindings":
        if cls._instance is None:
            cls._instance = Bindings()
        return cls._instance

    def set(self, name: str, value: Any) -> None:
        """Eager set, used by plain LET, UPDATE, and MERGE INTO.

        Raises ``ValueError`` if the name is currently bound to a
        refreshable binding; the caller must ``DROP BINDING`` first.
        """
        existing = Bindings._entries.get(name)
        if existing is not None and existing.is_refreshable:
            raise ValueError(
                f"Binding '{name}' is refreshable; DROP BINDING {name} first"
            )
        entry = existing
        if entry is None:
            entry = BindingEntry()
            Bindings._entries[name] = entry
        entry.value = value
        entry.statement = None
        entry.is_refreshable = False
        entry.refresh_every_ms = None
        entry.cached_at = _now_ms()
        entry.primed = True

    def get(self, name: str) -> Any:
        entry = Bindings._entries.get(name)
        return None if entry is None else entry.value

    def has(self, name: str) -> bool:
        return name in Bindings._entries

    def delete(self, name: str) -> None:
        Bindings._entries.pop(name, None)

    def clear(self) -> None:
        Bindings._entries.clear()

    def get_entry(self, name: str) -> Optional[BindingEntry]:
        return Bindings._entries.get(name)

    def is_refreshable(self, name: str) -> bool:
        entry = Bindings._entries.get(name)
        return entry is not None and entry.is_refreshable

    def register_refreshable(
        self,
        name: str,
        value: Any,
        statement: "ASTNode",
        refresh_every_ms: int,
    ) -> None:
        """Register a refreshable binding with an eagerly evaluated
        value and a backing sub-query that is re-executed when the
        TTL has elapsed.

        Raises ``ValueError`` if a binding with the same name already
        exists; callers must ``DROP BINDING`` first.
        """
        if name in Bindings._entries:
            raise ValueError(
                f"Binding '{name}' already exists; DROP BINDING {name} first"
            )
        entry = BindingEntry()
        entry.value = value
        entry.statement = statement
        entry.is_refreshable = True
        entry.refresh_every_ms = refresh_every_ms
        entry.primed = True
        entry.cached_at = _now_ms()
        Bindings._entries[name] = entry

    def invalidate(self, name: str) -> None:
        """Clear the cached value of a refreshable binding so the
        next :meth:`materialize` call re-executes the backing
        sub-query.  No-op for plain bindings.
        """
        entry = Bindings._entries.get(name)
        if entry is None or not entry.is_refreshable:
            return
        entry.value = None
        entry.primed = False
        entry.cached_at = 0

    async def materialize(self, name: str) -> None:
        """Re-evaluate a refreshable binding's backing sub-query if
        the cached value is stale (TTL elapsed or invalidated).
        No-op for plain bindings or for refreshable bindings that are
        still fresh.
        """
        entry = Bindings._entries.get(name)
        if entry is None or not entry.is_refreshable or entry.statement is None:
            return
        is_fresh = (
            entry.primed
            and entry.refresh_every_ms is not None
            and _now_ms() - entry.cached_at < entry.refresh_every_ms
        )
        if is_fresh:
            return
        if name in Bindings._materializing:
            raise ValueError(
                f"Cyclic refreshable binding dependency detected while materialising '{name}'"
            )
        Bindings._materializing.add(name)
        try:
            # Lazy import to avoid a load-time cycle.
            from ..compute.runner import Runner

            runner = Runner(None, entry.statement, None)
            await runner.run()
            entry.value = runner.results
            entry.primed = True
            entry.cached_at = _now_ms()
        finally:
            Bindings._materializing.discard(name)
