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
- ``{op: "addLabels" | "removeLabels", target, label, labels}``
- ``{op: "deleteRelationship", target, type}``
- ``{op: "deleteNode", target, label, detach}``

A relationship ``target`` is the row's ``id`` column when the definition
returns one, otherwise ``{left_id, right_id}``.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set

WRITE_CONTRACT_VERSION = 1

WriteChange = Dict[str, Any]


@dataclass
class WriteResult:
    """Outcome of a committed change set."""

    #: Final ids of the temporary refs (``"$1"`` -> backend id).
    ids: Dict[str, Any] = field(default_factory=dict)
    #: Backend-reported counters (``nodesCreated``, ``propertiesSet``, ...).
    stats: Dict[str, Any] = field(default_factory=dict)
    #: The change set that was sent.
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


class WriteSet:
    """Query-scoped collector of write changes."""

    def __init__(self) -> None:
        self.changes: List[WriteChange] = []
        self.backend: Optional[WriteBackend] = None
        self._next = 1

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
