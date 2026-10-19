"""In-memory graph store behind the built-in ``memorygraph`` function.

A schema-free property graph store holding any number of graphs:
nodes with any number of labels, relationships with one type, and
integer ids unique across the whole store.  It answers the graph
request protocol (``graph: true`` reads returning
``{id, labels, properties}`` / ``{id, type, left_id, right_id, properties}``
rows, and write change sets), selecting the graph by ``graphName``
(``"default"`` when absent).

A relationship belongs to one graph but may connect nodes of other
graphs of the store, or nodes it does not hold (definition nodes, or
nodes of graphs bound to other backends); every endpoint is stored as
a ``(graph, id)`` reference.  Within the store, references are checked:
an endpoint in a graph the store holds must exist, a plain delete of a
node with relationships in any of its graphs fails, and a detach
delete removes them all, atomically with the rest of the change set.

A committed store is never mutated: a transaction works on a copy that
replaces the store when it commits, so readers keep a consistent
snapshot.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set

from .graph_records import DEFAULT_GRAPH
from .source_context import UNDEFINED, canonical_key
from .source_provider import SourceRow, matches_predicate


@dataclass(frozen=True)
class _Ref:
    """A node reference: its namespace (graph name, or ``"virtual"``) and id."""

    graph: str
    id: Any


@dataclass
class _StoredNode:
    id: int
    graph: str
    labels: List[str] = field(default_factory=list)
    properties: Dict[str, Any] = field(default_factory=dict)


@dataclass
class _StoredRelationship:
    id: int
    graph: str
    type: str
    start: _Ref
    end: _Ref
    properties: Dict[str, Any] = field(default_factory=dict)


def _ref_key(ref: _Ref) -> str:
    return canonical_key([ref.graph, ref.id])


def _copy_node(n: _StoredNode) -> _StoredNode:
    return _StoredNode(n.id, n.graph, list(n.labels), dict(n.properties))


def _copy_relationship(r: _StoredRelationship) -> _StoredRelationship:
    return _StoredRelationship(r.id, r.graph, r.type, r.start, r.end, dict(r.properties))


def _same(a: Any, b: Any) -> bool:
    return canonical_key(a) == canonical_key(b)


def _json(value: Any) -> str:
    try:
        return json.dumps(value)
    except (TypeError, ValueError):
        return str(value)


def _assign(target: Dict[str, Any], properties: Optional[Dict[str, Any]]) -> int:
    """Apply ``properties`` to ``target``; ``None`` removes a key.  Returns the number of keys set."""
    count = 0
    for k, v in (properties or {}).items():
        if v is None:
            target.pop(k, None)
        else:
            target[k] = v
        count += 1
    return count


def _get(mapping: Dict[Any, Any], key: Any) -> Any:
    try:
        return mapping.get(key)
    except TypeError:
        return None


def _graph_of(request: Dict[str, Any]) -> str:
    name = request.get("graphName")
    return name if isinstance(name, str) else DEFAULT_GRAPH


class MemoryGraphStore:
    """A schema-free in-memory property graph store (see the module docstring)."""

    def __init__(self) -> None:
        self._nodes: Dict[int, _StoredNode] = {}
        self._relationships: Dict[int, _StoredRelationship] = {}
        #: Relationship ids by endpoint reference.
        self._adjacent: Dict[str, Dict[int, None]] = {}
        #: Graphs that have held nodes in this store (their references are checked).
        self._graphs: Set[str] = set()
        self._next_id = 1

    def clone(self) -> "MemoryGraphStore":
        copy = MemoryGraphStore()
        copy._nodes = {id_: _copy_node(n) for id_, n in self._nodes.items()}
        copy._relationships = {id_: _copy_relationship(r) for id_, r in self._relationships.items()}
        copy._adjacent = {key: dict(rids) for key, rids in self._adjacent.items()}
        copy._graphs = set(self._graphs)
        copy._next_id = self._next_id
        return copy

    def node_count(self, graph: Optional[str] = None) -> int:
        """Number of nodes, in ``graph`` or in the whole store."""
        if graph is None:
            return len(self._nodes)
        return sum(1 for n in self._nodes.values() if n.graph == graph)

    def relationship_count(self, graph: Optional[str] = None) -> int:
        """Number of relationships, in ``graph`` or in the whole store."""
        if graph is None:
            return len(self._relationships)
        return sum(1 for r in self._relationships.values() if r.graph == graph)

    def read(self, request: Dict[str, Any]) -> List[SourceRow]:
        """Answer a ``scan``, ``lookup`` or ``expand`` request of the graph protocol."""
        graph = _graph_of(request)
        raw_ids = request.get("ids")
        ids: Optional[List[Any]] = raw_ids if isinstance(raw_ids, list) else None
        if "type" in request:
            return self._read_relationships(request, graph, ids)
        labels = request.get("labels")
        if isinstance(labels, list):
            wanted: List[str] = labels
        elif request.get("label") is not None:
            wanted = [request["label"]]
        else:
            wanted = []
        if ids is not None:
            candidates = [n for n in (_get(self._nodes, i) for i in ids) if n is not None]
        else:
            candidates = list(self._nodes.values())
        out: List[SourceRow] = []
        for n in candidates:
            if n.graph != graph:
                continue
            if not all(label in n.labels for label in wanted):
                continue
            if not matches_predicate(request.get("predicate"), {**n.properties, "id": n.id}):
                continue
            out.append({"id": n.id, "labels": list(n.labels), "properties": dict(n.properties)})
        return out

    def _read_relationships(
        self, request: Dict[str, Any], graph: str, ids: Optional[List[Any]]
    ) -> List[SourceRow]:
        candidates: List[_StoredRelationship]
        if ids is not None:
            use_end = request.get("side") == "right"
            anchor_graph = request.get("anchorGraph")
            if not isinstance(anchor_graph, str):
                anchor_graph = graph
            seen: Set[int] = set()
            candidates = []
            for id_ in ids:
                anchor_key = _ref_key(_Ref(anchor_graph, id_))
                for rid in self._adjacent.get(anchor_key) or {}:
                    r = self._relationships[rid]
                    endpoint = r.end if use_end else r.start
                    if _ref_key(endpoint) == anchor_key and rid not in seen:
                        seen.add(rid)
                        candidates.append(r)
        else:
            candidates = list(self._relationships.values())
        out: List[SourceRow] = []
        rel_type = request.get("type")
        for r in candidates:
            if r.graph != graph:
                continue
            if rel_type is not None and r.type != rel_type:
                continue
            flat = {**r.properties, "id": r.id, "left_id": r.start.id, "right_id": r.end.id}
            if not matches_predicate(request.get("predicate"), flat):
                continue
            row: SourceRow = {
                "id": r.id,
                "type": r.type,
                "left_id": r.start.id,
                "right_id": r.end.id,
                "properties": dict(r.properties),
            }
            if r.start.graph != graph:
                row["left_graph"] = r.start.graph
            if r.end.graph != graph:
                row["right_graph"] = r.end.graph
            out.append(row)
        return out

    def _link(self, r: _StoredRelationship) -> None:
        for ref in (r.start, r.end):
            self._adjacent.setdefault(_ref_key(ref), {})[r.id] = None

    def _unlink(self, r: _StoredRelationship) -> None:
        self._adjacent.get(_ref_key(r.start), {}).pop(r.id, None)
        self._adjacent.get(_ref_key(r.end), {}).pop(r.id, None)
        self._relationships.pop(r.id, None)

    def apply(self, changes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Apply a change set in place and return ``{ids, stats}``.

        Callers apply it to a copy so that a failing change leaves the
        published store untouched.
        """
        ids: Dict[str, Any] = {}
        deleted: Set[str] = set()
        stats: Dict[str, int] = {
            "nodesCreated": 0,
            "nodesDeleted": 0,
            "relationshipsCreated": 0,
            "relationshipsDeleted": 0,
            "propertiesSet": 0,
            "labelsAdded": 0,
            "labelsRemoved": 0,
        }

        def resolve(value: Any) -> Any:
            return ids[value] if isinstance(value, str) and value in ids else value

        def node(target: Any, graph: str) -> _StoredNode:
            n = _get(self._nodes, resolve(target))
            if n is None or n.graph != graph:
                raise ValueError(f"Unknown node {_json(target)} in graph {graph}")
            result: _StoredNode = n
            return result

        def endpoint(target: Any, graph: str) -> _Ref:
            """An endpoint reference; endpoints in graphs this store holds must exist."""
            ref = _Ref(graph, resolve(target))
            n = _get(self._nodes, ref.id)
            if graph in self._graphs and (n is None or n.graph != graph):
                raise ValueError(f"Unknown node {_json(target)} in graph {graph}")
            return ref

        def relationship(target: Any, graph: str) -> _StoredRelationship:
            id_ = resolve(target)
            r: Optional[_StoredRelationship]
            if isinstance(id_, dict):
                r = next(
                    (
                        x
                        for x in self._relationships.values()
                        if x.graph == graph
                        and _same(x.start.id, id_.get("left_id", UNDEFINED))
                        and _same(x.end.id, id_.get("right_id", UNDEFINED))
                    ),
                    None,
                )
            else:
                r = _get(self._relationships, id_)
            if r is None or r.graph != graph:
                raise ValueError(f"Unknown relationship {_json(target)} in graph {graph}")
            return r

        def create_node(
            ref: str, graph: str, labels: Optional[List[str]], properties: Any
        ) -> None:
            n = _StoredNode(self._next_id, graph)
            self._next_id += 1
            for label in labels or []:
                if label not in n.labels:
                    n.labels.append(label)
            stats["propertiesSet"] += _assign(n.properties, properties)
            self._nodes[n.id] = n
            self._graphs.add(graph)
            ids[ref] = n.id
            stats["nodesCreated"] += 1

        def create_relationship(
            ref: str, graph: str, rel_type: Any, start: _Ref, end: _Ref, properties: Any
        ) -> None:
            if not isinstance(rel_type, str):
                raise ValueError("A relationship needs exactly one type")
            r = _StoredRelationship(self._next_id, graph, rel_type, start, end)
            self._next_id += 1
            stats["propertiesSet"] += _assign(r.properties, properties)
            self._relationships[r.id] = r
            self._link(r)
            ids[ref] = r.id
            stats["relationshipsCreated"] += 1

        def deleted_key(kind: str, graph: str, target: Any) -> str:
            return f"{kind}:{graph}:{canonical_key(resolve(target))}"

        def key_matches(properties: Dict[str, Any], key: Any) -> bool:
            return all(
                _same(properties.get(k, UNDEFINED), v) for k, v in (key or {}).items()
            )

        def endpoint_graph(change: Dict[str, Any], key: str, graph: str) -> str:
            value = change.get(key)
            return value if value is not None else graph

        for change in changes:
            graph = _graph_of(change)
            is_relationship = "type" in change and "label" not in change
            op = change.get("op")
            if op == "createNode":
                create_node(
                    change.get("ref", ""), graph, change.get("labels"), change.get("properties")
                )
            elif op == "createRelationship":
                create_relationship(
                    change.get("ref", ""),
                    graph,
                    change.get("type"),
                    endpoint(change.get("start"), endpoint_graph(change, "startGraph", graph)),
                    endpoint(change.get("end"), endpoint_graph(change, "endGraph", graph)),
                    change.get("properties"),
                )
            elif op == "mergeNode":
                labels = change.get("labels")
                if labels is None:
                    labels = [change["label"]] if change.get("label") is not None else []
                existing = next(
                    (
                        n
                        for n in self._nodes.values()
                        if n.graph == graph
                        and all(label in n.labels for label in labels)
                        and key_matches(n.properties, change.get("key"))
                    ),
                    None,
                )
                if existing is not None:
                    stats["propertiesSet"] += _assign(existing.properties, change.get("onMatch"))
                    ids[change.get("ref", "")] = existing.id
                else:
                    create_node(
                        change.get("ref", ""),
                        graph,
                        labels,
                        {**(change.get("key") or {}), **(change.get("onCreate") or {})},
                    )
            elif op == "mergeRelationship":
                start = endpoint(change.get("start"), endpoint_graph(change, "startGraph", graph))
                end = endpoint(change.get("end"), endpoint_graph(change, "endGraph", graph))
                start_key = _ref_key(start)
                end_key = _ref_key(end)
                existing_rel = next(
                    (
                        r
                        for r in (
                            self._relationships[rid]
                            for rid in self._adjacent.get(start_key, {})
                        )
                        if r.graph == graph
                        and r.type == change.get("type")
                        and _ref_key(r.start) == start_key
                        and _ref_key(r.end) == end_key
                        and key_matches(r.properties, change.get("key"))
                    ),
                    None,
                )
                if existing_rel is not None:
                    stats["propertiesSet"] += _assign(existing_rel.properties, change.get("onMatch"))
                    ids[change.get("ref", "")] = existing_rel.id
                else:
                    create_relationship(
                        change.get("ref", ""),
                        graph,
                        change.get("type"),
                        start,
                        end,
                        {**(change.get("key") or {}), **(change.get("onCreate") or {})},
                    )
            elif op in ("setProperties", "replaceProperties"):
                if is_relationship:
                    target_rel = relationship(change.get("target"), graph)
                    if op == "replaceProperties":
                        target_rel.properties = {}
                    target_properties = target_rel.properties
                else:
                    target_node = node(change.get("target"), graph)
                    if op == "replaceProperties":
                        target_node.properties = {}
                    target_properties = target_node.properties
                stats["propertiesSet"] += _assign(target_properties, change.get("properties"))
            elif op == "addLabels":
                n = node(change.get("target"), graph)
                for label in change.get("labels") or []:
                    if label not in n.labels:
                        n.labels.append(label)
                        stats["labelsAdded"] += 1
            elif op == "removeLabels":
                n = node(change.get("target"), graph)
                for label in change.get("labels") or []:
                    if label in n.labels:
                        n.labels.remove(label)
                        stats["labelsRemoved"] += 1
            elif op == "deleteRelationship":
                if deleted_key("relationship", graph, change.get("target")) in deleted:
                    continue
                r = relationship(change.get("target"), graph)
                self._unlink(r)
                deleted.add(deleted_key("relationship", graph, r.id))
                stats["relationshipsDeleted"] += 1
            elif op == "deleteNode":
                if deleted_key("node", graph, change.get("target")) in deleted:
                    continue
                n = node(change.get("target"), graph)
                key = _ref_key(_Ref(graph, n.id))
                attached = list(self._adjacent.get(key, {}))
                if len(attached) > 0 and change.get("detach") is not True:
                    raise ValueError(
                        f"Cannot delete node {_json(n.id)}: it still has relationships"
                    )
                for rid in attached:
                    attached_rel = self._relationships.get(rid)
                    if attached_rel is None:
                        continue
                    self._unlink(attached_rel)
                    deleted.add(deleted_key("relationship", attached_rel.graph, rid))
                    stats["relationshipsDeleted"] += 1
                self._adjacent.pop(key, None)
                self._nodes.pop(n.id, None)
                deleted.add(deleted_key("node", graph, n.id))
                stats["nodesDeleted"] += 1
            else:
                raise ValueError(f"Unsupported change {_json(op)}")
        return {"ids": ids, "stats": stats}
