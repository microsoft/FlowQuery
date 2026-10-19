"""``mockbackend($request)``: a small mock async function for tests of
statement-backed definitions.  It serves scan / lookup / expand requests
from in-memory sources over a tiny graph store, records every request with
its query context (signal, snapshot), and applies write change sets
atomically so tests can read the result back.

Like FlowQuery, the store scopes node ids to their label: each label has
its own table.  A node with several labels is one stored object listed in
several tables.  Relationships have ids and are exposed per type as
``{id, left_id, right_id, ...properties}`` rows.
"""

import json
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Dict, Iterable, List, Optional, Set

from flowquery.graph.testing import in_memory_node_source, in_memory_relationship_source
from flowquery.parsing.functions.async_function import AsyncFunction
from flowquery.parsing.functions.function_metadata import FunctionDef


def key(id_: Any) -> str:
    return json.dumps(id_)


@dataclass(eq=False)
class StoredNode:
    id: Any
    labels: Set[str] = field(default_factory=set)
    properties: Dict[str, Any] = field(default_factory=dict)


@dataclass(eq=False)
class StoredRelationship:
    id: Any
    type: str
    start: Any
    end: Any
    properties: Dict[str, Any] = field(default_factory=dict)


class Store:
    def __init__(self) -> None:
        self.labels: Dict[str, Dict[str, StoredNode]] = {}
        self.relationships: Dict[str, StoredRelationship] = {}
        self.next_id = 1000

    def table(self, label: str) -> Dict[str, StoredNode]:
        return self.labels.setdefault(label, {})

    def place(self, node: StoredNode, label: str) -> None:
        node.labels.add(label)
        self.table(label)[key(node.id)] = node

    def find(self, id_: Any, label: Optional[str] = None) -> Optional[StoredNode]:
        """Find a node by id, within ``label`` when given."""
        if label is not None:
            return self.labels.get(label, {}).get(key(id_))
        for table in self.labels.values():
            node = table.get(key(id_))
            if node is not None:
                return node
        return None

    def remove(self, node: StoredNode) -> None:
        for label in node.labels:
            self.labels.get(label, {}).pop(key(node.id), None)

    def clone(self) -> "Store":
        copy = Store()
        copies: Dict[int, StoredNode] = {}
        for label, table in self.labels.items():
            target = copy.table(label)
            for k, n in table.items():
                c = copies.get(id(n))
                if c is None:
                    c = StoredNode(n.id, set(n.labels), dict(n.properties))
                    copies[id(n)] = c
                target[k] = c
        for k, r in self.relationships.items():
            copy.relationships[k] = StoredRelationship(r.id, r.type, r.start, r.end, dict(r.properties))
        copy.next_id = self.next_id
        return copy


class Mock:
    """Shared state of the mock backend."""

    def __init__(self) -> None:
        self.store = Store()
        self.log: List[Dict[str, Any]] = []
        self.change_sets: List[List[Dict[str, Any]]] = []
        self.yielded = 0
        self.opened = 0
        self.closed = 0
        self.fail_on: Optional[str] = None

    @property
    def requests(self) -> List[Any]:
        """Requests of the current log."""
        return [e["request"] for e in self.log]

    def reset(self) -> None:
        """Clear logs and counters (keeps the data)."""
        self.log = []
        self.change_sets = []
        self.yielded = 0
        self.opened = 0
        self.closed = 0
        self.fail_on = None

    def clear(self) -> None:
        """Drop all data."""
        self.store = Store()

    def add_nodes(self, label: str, rows: List[Dict[str, Any]]) -> None:
        """Add rows (each with an ``id``) to the table of ``label``."""
        for row in rows:
            properties = {k: v for k, v in row.items() if k != "id"}
            self.store.place(StoredNode(row["id"], set(), properties), label)

    def add_relationships(self, rel_type: str, rows: List[Dict[str, Any]]) -> None:
        """Add rows (``left_id``, ``right_id``, optional ``id``) of relationship ``rel_type``."""
        for row in rows:
            properties = {k: v for k, v in row.items() if k not in ("id", "left_id", "right_id")}
            rid = row.get("id")
            if rid is None:
                rid = f"{rel_type}:{self.store.next_id}"
                self.store.next_id += 1
            self.store.relationships[key(rid)] = StoredRelationship(
                rid, rel_type, row["left_id"], row["right_id"], properties
            )

    def node_rows(self, label: str) -> List[Dict[str, Any]]:
        """Current rows of a node label (definition shape)."""
        return [{"id": n.id, **n.properties} for n in self.store.labels.get(label, {}).values()]

    def relationship_rows(self, rel_type: str) -> List[Dict[str, Any]]:
        """Current rows of a relationship type (definition shape)."""
        return [
            {"id": r.id, "left_id": r.start, "right_id": r.end, **r.properties}
            for r in self.store.relationships.values()
            if r.type == rel_type
        ]

    def node(self, id_: Any, label: Optional[str] = None) -> Optional[StoredNode]:
        return self.store.find(id_, label)


mock = Mock()


def _resolve(value: Any, ids: Dict[str, Any]) -> Any:
    return ids[value] if isinstance(value, str) and value in ids else value


def _find_relationship(store: Store, change: Dict[str, Any], ids: Dict[str, Any]) -> StoredRelationship:
    target = _resolve(change["target"], ids)
    if isinstance(target, dict):
        for r in store.relationships.values():
            if (
                r.type == change["type"]
                and key(r.start) == key(target.get("left_id"))
                and key(r.end) == key(target.get("right_id"))
            ):
                return r
    else:
        found = store.relationships.get(key(target))
        if found is not None:
            return found
    raise ValueError(f"Unknown relationship {json.dumps(change['target'])}")


def _set_properties(target: Dict[str, Any], properties: Optional[Dict[str, Any]]) -> int:
    count = 0
    for k, v in (properties or {}).items():
        if v is None:
            target.pop(k, None)
        else:
            target[k] = v
        count += 1
    return count


def _matches_key(properties: Dict[str, Any], match: Optional[Dict[str, Any]]) -> bool:
    return all(k in properties and properties[k] == v for k, v in (match or {}).items())


def apply_changes(changes: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Apply a change set to a copy of the store; commit only if every change succeeds."""
    store = mock.store.clone()
    ids: Dict[str, Any] = {}
    created: Dict[str, StoredNode] = {}
    stats = {
        "nodesCreated": 0,
        "nodesDeleted": 0,
        "relationshipsCreated": 0,
        "relationshipsDeleted": 0,
        "propertiesSet": 0,
        "labelsAdded": 0,
        "labelsRemoved": 0,
    }

    def node(target: Any, label: Optional[str] = None) -> StoredNode:
        n = created.get(target) if isinstance(target, str) else None
        if n is None:
            n = store.find(_resolve(target, ids), label)
        if n is None:
            raise ValueError(f"Unknown node {json.dumps(target)}")
        return n

    def create(ref: str, labels: List[str], properties: Dict[str, Any]) -> StoredNode:
        n = StoredNode(store.next_id)
        store.next_id += 1
        stats["propertiesSet"] += _set_properties(n.properties, properties)
        for label in labels:
            store.place(n, label)
        ids[ref] = n.id
        created[ref] = n
        stats["nodesCreated"] += 1
        return n

    for change in changes:
        op = change["op"]
        if op == "createNode":
            create(change["ref"], change["labels"], change["properties"])
        elif op == "createRelationship":
            rid = store.next_id
            store.next_id += 1
            store.relationships[key(rid)] = StoredRelationship(
                rid,
                change["type"],
                node(change["start"]).id,
                node(change["end"]).id,
                dict(change.get("properties") or {}),
            )
            ids[change["ref"]] = rid
            stats["relationshipsCreated"] += 1
            stats["propertiesSet"] += len(change.get("properties") or {})
        elif op == "setProperties":
            target_properties = (
                _find_relationship(store, change, ids).properties
                if "type" in change
                else node(change["target"], change.get("label")).properties
            )
            stats["propertiesSet"] += _set_properties(target_properties, change["properties"])
        elif op == "addLabels":
            n = node(change["target"], change.get("label"))
            for label in change["labels"]:
                if label not in n.labels:
                    stats["labelsAdded"] += 1
                store.place(n, label)
        elif op == "removeLabels":
            n = node(change["target"], change.get("label"))
            for label in change["labels"]:
                if label in n.labels:
                    n.labels.discard(label)
                    store.labels.get(label, {}).pop(key(n.id), None)
                    stats["labelsRemoved"] += 1
        elif op == "deleteRelationship":
            r = _find_relationship(store, change, ids)
            del store.relationships[key(r.id)]
            stats["relationshipsDeleted"] += 1
        elif op == "deleteNode":
            n = node(change["target"], change.get("label"))
            attached = [
                r
                for r in store.relationships.values()
                if key(r.start) == key(n.id) or key(r.end) == key(n.id)
            ]
            if attached and change.get("detach") is not True:
                raise ValueError(f"Cannot delete node {json.dumps(n.id)}: it still has relationships")
            for r in attached:
                del store.relationships[key(r.id)]
                stats["relationshipsDeleted"] += 1
            store.remove(n)
            stats["nodesDeleted"] += 1
        elif op == "mergeNode":
            existing = next(
                (n for n in store.table(change["label"]).values() if _matches_key(n.properties, change["key"])),
                None,
            )
            if existing is not None:
                stats["propertiesSet"] += _set_properties(existing.properties, change["onMatch"])
                ids[change["ref"]] = existing.id
                created[change["ref"]] = existing
            else:
                create(change["ref"], [change["label"]], {**change["key"], **change["onCreate"]})
        elif op == "mergeRelationship":
            start = node(change["start"]).id
            end = node(change["end"]).id
            existing_rel = next(
                (
                    r
                    for r in store.relationships.values()
                    if r.type == change["type"]
                    and key(r.start) == key(start)
                    and key(r.end) == key(end)
                    and _matches_key(r.properties, change.get("key"))
                ),
                None,
            )
            if existing_rel is not None:
                stats["propertiesSet"] += _set_properties(existing_rel.properties, change["onMatch"])
                ids[change["ref"]] = existing_rel.id
            else:
                rid = store.next_id
                store.next_id += 1
                properties: Dict[str, Any] = {}
                stats["propertiesSet"] += _set_properties(
                    properties, {**(change.get("key") or {}), **change["onCreate"]}
                )
                store.relationships[key(rid)] = StoredRelationship(
                    rid, change["type"], start, end, properties
                )
                ids[change["ref"]] = rid
                stats["relationshipsCreated"] += 1
        else:
            raise ValueError(f"Unknown change {op}")
    mock.store = store
    return {"ids": ids, "stats": stats}


def _rows_of(pages: Iterable[List[Dict[str, Any]]]) -> Iterable[Dict[str, Any]]:
    for page in pages:
        yield from page


@FunctionDef({
    "description": "Mock backend for statement-backed definitions (tests only)",
    "category": "async",
    "parameters": [],
    "output": {"description": "rows or write result", "type": "object"},
})
class MockBackend(AsyncFunction):
    capabilities: Any = {
        "lookup": True,
        "expand": True,
        "streaming": True,
        "cacheable": True,
        "predicates": True,
        "writes": True,
    }

    @staticmethod
    def open_read_context() -> Dict[str, Any]:
        mock.opened += 1
        return {"snapshot": mock.opened}

    @staticmethod
    def close_read_context(snapshot: Any) -> None:
        mock.closed += 1

    def __init__(self, name: str = "mockbackend") -> None:
        super().__init__(name)

    async def generate(self, request: Any = None, fallback: Optional[str] = None) -> AsyncIterator[Any]:
        """``request`` is the source request (``None`` in eager definitions,
        which then pass ``fallback``: a label, or ``rel:TYPE`` for relationships)."""
        context = self.context
        mock.log.append({
            "request": request,
            "signal": context.signal if context is not None else None,
            "snapshot": context.snapshot if context is not None else None,
        })
        if mock.fail_on is not None and isinstance(request, dict) and request.get("operation") == mock.fail_on:
            raise RuntimeError("backend failure")
        if isinstance(request, dict) and request.get("operation") == "write":
            mock.change_sets.append(request["changes"])
            yield apply_changes(request["changes"])
            return
        req = request if request is not None else {"operation": "scan", "predicate": None, "pageSize": 1000}
        if request is not None:
            is_relationship = "type" in request
        else:
            is_relationship = (fallback or "").startswith("rel:")
        pages: Any
        if not is_relationship:
            label = request.get("label") if request is not None else fallback
            node_source: Any = in_memory_node_source(mock.node_rows(label or ""))
            pages = node_source.lookup(req, None) if req.get("operation") == "lookup" else node_source.scan(req, None)
        else:
            rel_type = request["type"] if request is not None else (fallback or "")[4:]
            rel_source: Any = in_memory_relationship_source(mock.relationship_rows(rel_type))
            pages = rel_source.expand(req, None) if req.get("operation") == "expand" else rel_source.scan(req, None)
        for row in _rows_of(pages):
            mock.yielded += 1
            yield row
