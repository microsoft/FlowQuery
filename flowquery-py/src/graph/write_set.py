"""Write change sets (``CREATE`` / ``MERGE`` / ``SET`` / ``REMOVE`` / ``DELETE``
against statement-backed definitions).

While a query runs, write clauses append changes here instead of applying
them.  When the query succeeds FlowQuery sends the whole list to the
definitions' backend function in one call::

    {"version": 1, "operation": "write", "changes": [...]}

and the backend applies it atomically and answers
``{"ids": {"$1": 1001, ...}, "stats": {"nodesCreated": ..., ...}}``.  New
nodes and relationships get temporary refs (``"$1"``, ``"$2"``, ...) that
later changes in the same list may refer to.

Change entries (node targets carry ``label``, relationship targets ``type``):

- ``{op: "createNode", ref, labels, properties}``
- ``{op: "createRelationship", ref, type, start, end, properties}``
- ``{op: "mergeNode", ref, label, key, onCreate, onMatch}``
- ``{op: "mergeRelationship", ref, type, start, end, key, onCreate, onMatch}``
- ``{op: "setProperties", target, label | type, properties}`` — ``None`` removes
- ``{op: "replaceProperties", target, label | type, properties}`` — ``SET x = {...}``
- ``{op: "addLabels" | "removeLabels", target, label, labels}``
- ``{op: "deleteRelationship", target, type}``
- ``{op: "deleteNode", target, label, detach}``

A relationship ``target`` is the row's ``id`` column when the definition
returns one, otherwise ``{left_id, right_id}``.

**Default graph.**  Writes to labels and types without a definition go
to the default graph (``USE GRAPH fn($request)``); its requests carry
``graph: true``.  Targets are graph-wide entity ids, ``createNode.labels``
may hold zero or several labels, ``mergeNode`` adds ``labels`` (all of
them; ``label`` is the first), and relationship changes carry the stored
``type`` of the relationship.

**Transactions.**  Backends declaring ``transactions: true`` (with
``writes: true``) run each query in one transaction, opened by the
function's ``open_read_context()`` and shared by reads and writes.  Change
sets are then sent as the query goes (before a read that follows a write,
and at the end of every statement) so later clauses and statements read
the query's own writes, and the query ends with
``{"version": 1, "operation": "commit"}``, or ``{"operation": "rollback"}``
when it fails or is cancelled.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Set

WRITE_CONTRACT_VERSION = 1

WriteChange = Dict[str, Any]


@dataclass
class WriteResult:
    """Outcome of a committed change set."""

    #: Final ids of the temporary refs (``"$1"`` -> backend id).
    ids: Dict[str, Any] = field(default_factory=dict)
    #: Backend-reported counters (``nodesCreated``, ``propertiesSet``, ...).
    stats: Dict[str, Any] = field(default_factory=dict)
    #: Every change that was sent, in order.
    changes: List[WriteChange] = field(default_factory=list)


@dataclass
class WriteBackend:
    """The backend function a query writes to."""

    name: str
    function_class: Any
    #: Position of the ``$request`` argument in the definition's call.
    request_index: int
    #: The other arguments, evaluated from the definition's call.
    args: List[Any] = field(default_factory=list)
    #: The backend is the default graph (requests carry ``graph: True``).
    graph: bool = False


@dataclass
class WriteRoute:
    """Where a write goes: the backend function and whether it is transactional."""

    backend: WriteBackend
    transactions: bool


def _describe_backend(backend: WriteBackend) -> str:
    name = f"default graph {backend.name}" if backend.graph else backend.name
    args = [a for i, a in enumerate(backend.args) if i != backend.request_index]
    if len(args) == 0:
        return name
    return f"{name}({', '.join(json.dumps(a) for a in args)})"


class WriteSet:
    """Query-scoped collector of write changes."""

    def __init__(self) -> None:
        #: Every change recorded by the query, in order.
        self.changes: List[WriteChange] = []
        self.backend: Optional[WriteBackend] = None
        #: True when every target declares ``transactions: true``.
        self.transactional = True
        #: Send changes after each write-clause row (reads follow the writes).
        self.per_row = False
        #: Changes were sent inside the backend's transaction.
        self.sent = False
        #: The transaction was committed.
        self.committed = False
        #: Final ids of temporary refs, merged across sends.
        self.ids: Dict[str, Any] = {}
        #: Backend counters, summed across sends.
        self.stats: Dict[str, Any] = {}
        #: Routes resolved for this query, by target key (internal).
        self.routes: Dict[str, WriteRoute] = {}
        self._pending: List[WriteChange] = []
        self._deleted: Set[str] = set()
        self._bindings: Dict[str, Callable[[Any], None]] = {}
        self._next = 1

    def route(self, route: WriteRoute) -> None:
        """Pin the query to ``route``'s backend.

        A query writes through one backend function, so a second one is
        rejected; nothing has been applied at that point unless a
        transactional backend already received changes, which are then
        rolled back.
        """
        current = self.backend
        if current is None:
            self.backend = route.backend
        elif (
            current.function_class is not route.backend.function_class
            or current.graph != route.backend.graph
            or _canonical_key(current.args) != _canonical_key(route.backend.args)
        ):
            raise ValueError(
                "A query can only write through one backend function "
                f"({_describe_backend(current)} and {_describe_backend(route.backend)})"
            )
        self.transactional = self.transactional and route.transactions

    def mark_deleted(self, kind: str, target: Any) -> bool:
        """Record that the query deletes ``target`` (``kind`` scopes the id: a
        definition's label or type, or the default graph).

        Returns False when it was already deleted earlier in the query, so
        repeated deletes (the same entity bound in several rows) are sent once.
        """
        key = f"{kind}:{_canonical_key(target)}"
        if key in self._deleted:
            return False
        self._deleted.add(key)
        return True

    def ref(self) -> str:
        """A fresh temporary ref for a new node or relationship."""
        ref = f"${self._next}"
        self._next += 1
        return ref

    @property
    def refs(self) -> Set[str]:
        return {f"${i}" for i in range(1, self._next)}

    def add(self, change: WriteChange) -> None:
        self.changes.append(change)
        self._pending.append(change)

    @property
    def pending(self) -> int:
        return len(self._pending)

    def take_pending(self) -> List[WriteChange]:
        """Take the changes not sent yet, with refs resolved by earlier sends
        replaced by their final ids."""
        refs = self.refs
        out = [replace_refs(_copy(change), self.ids, refs) for change in self._pending]
        self._pending = []
        return out

    def bind(self, ref: str, rebind: Callable[[Any], None]) -> None:
        """Rebind a variable once the backend has assigned ``ref`` an id."""
        self._bindings[ref] = rebind

    def absorb(self, response: Dict[str, Any]) -> None:
        """Record a backend response: final ids (rebinding variables) and stats."""
        for ref, id_ in (response.get("ids") or {}).items():
            self.ids[ref] = id_
            rebind = self._bindings.pop(ref, None)
            if rebind is not None:
                rebind(id_)
        for key, value in (response.get("stats") or {}).items():
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                self.stats[key] = self.stats.get(key, 0) + value


def _canonical_key(value: Any) -> str:
    from .source_context import canonical_key

    return canonical_key(value)


def _copy(value: Any) -> Any:
    if isinstance(value, list):
        return [_copy(item) for item in value]
    if isinstance(value, dict):
        return {k: _copy(v) for k, v in value.items()}
    return value


def replace_refs(value: Any, ids: Dict[str, Any], refs: Set[str]) -> Any:
    """Replace temporary refs by their final ids, in place, throughout
    ``value`` (result rows, nested maps and lists).  Returns the new value."""
    if isinstance(value, str):
        return ids[value] if value in refs and value in ids else value
    if isinstance(value, list):
        for i, item in enumerate(value):
            value[i] = replace_refs(item, ids, refs)
        return value
    if isinstance(value, dict):
        for key in list(value.keys()):
            value[key] = replace_refs(value[key], ids, refs)
        return value
    return value
