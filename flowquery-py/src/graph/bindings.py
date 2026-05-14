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

    Eager (non-STATIC) bindings store their materialised ``value``
    directly; STATIC bindings additionally store the backing
    ``statement`` and refresh metadata so the value can be (re)computed
    lazily on read.
    """

    __slots__ = (
        "value",
        "statement",
        "is_static",
        "refresh_every_ms",
        "cached_at",
        "primed",
    )

    def __init__(self) -> None:
        self.value: Any = None
        self.statement: Optional["ASTNode"] = None
        self.is_static: bool = False
        self.refresh_every_ms: Optional[int] = None
        self.cached_at: int = 0
        self.primed: bool = False


class Bindings:
    """Singleton store for LET-bound values.

    Bindings live alongside virtual node/relationship definitions in
    Database: they are persistent across statements for the lifetime
    of the process.

    ``LET STATIC name = { ... } [REFRESH EVERY n unit]`` registers a
    deferred provider: the sub-query is stored, not the value, and is
    (re)evaluated lazily by :meth:`materialize` on first access or
    after the TTL elapses.
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
        """Eager set, used by non-STATIC LET, UPDATE, and MERGE INTO."""
        entry = Bindings._entries.get(name)
        if entry is None:
            entry = BindingEntry()
            Bindings._entries[name] = entry
        entry.value = value
        entry.statement = None
        entry.is_static = False
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

    def is_static(self, name: str) -> bool:
        entry = Bindings._entries.get(name)
        return entry is not None and entry.is_static

    def register_static(
        self,
        name: str,
        statement: "ASTNode",
        refresh_every_ms: Optional[int],
    ) -> None:
        """Register a STATIC binding with a deferred sub-query.

        Raises ``ValueError`` if a binding with the same name already
        exists; callers must ``DROP BINDING`` first.
        """
        if name in Bindings._entries:
            raise ValueError(
                f"Binding '{name}' already exists; DROP BINDING {name} first"
            )
        entry = BindingEntry()
        entry.statement = statement
        entry.is_static = True
        entry.refresh_every_ms = refresh_every_ms
        entry.primed = False
        Bindings._entries[name] = entry

    def invalidate(self, name: str) -> None:
        """Clear the cached value for a STATIC binding so the next
        :meth:`materialize` call re-executes the backing sub-query.
        No-op for non-STATIC bindings.
        """
        entry = Bindings._entries.get(name)
        if entry is None or not entry.is_static:
            return
        entry.value = None
        entry.primed = False
        entry.cached_at = 0

    async def materialize(self, name: str) -> None:
        """Lazily evaluate a STATIC binding's backing sub-query if it
        has never been primed or the TTL has elapsed.  No-op for
        non-STATIC bindings or for STATIC bindings that are still fresh.
        """
        entry = Bindings._entries.get(name)
        if entry is None or not entry.is_static or entry.statement is None:
            return
        is_fresh = entry.primed and (
            entry.refresh_every_ms is None
            or _now_ms() - entry.cached_at < entry.refresh_every_ms
        )
        if is_fresh:
            return
        if name in Bindings._materializing:
            raise ValueError(
                f"Cyclic STATIC binding dependency detected while materialising '{name}'"
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
