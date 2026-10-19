"""In-memory graph store behind the built-in ``memorygraph`` function.

A schema-free property graph: nodes with any number of labels,
relationships with one type, graph-wide integer ids.  It answers the
default-graph request protocol (``graph: true`` reads returning
``{id, labels, properties}`` / ``{id, type, left_id, right_id, properties}``
rows, and write change sets).

A committed store is never mutated: a transaction works on a copy that
replaces the store when it commits, so readers keep a consistent
snapshot.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set

from .source_context import UNDEFINED, canonical_key
from .source_provider import SourceRow, matches_predicate


@dataclass
class _StoredNode:
    id: int
    labels: List[str] = field(default_factory=list)
    properties: Dict[str, Any] = field(default_factory=dict)


@dataclass
class _StoredRelationship:
    id: int
    type: str
    start: int
    end: int
    properties: Dict[str, Any] = field(default_factory=dict)


def _copy_node(n: _StoredNode) -> _StoredNode:
    return _StoredNode(n.id, list(n.labels), dict(n.properties))


def _copy_relationship(r: _StoredRelationship) -> _StoredRelationship:
    return _StoredRelationship(r.id, r.type, r.start, r.end, dict(r.properties))


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


class MemoryGraphStore:
    """A schema-free in-memory property graph (see the module docstring)."""

    def __init__(self) -> None:
        self._nodes: Dict[int, _StoredNode] = {}
        self._relationships: Dict[int, _StoredRelationship] = {}
        #: Relationship ids by endpoint node id.
        self._adjacent: Dict[int, Dict[int, None]] = {}
        self._next_id = 1

    def clone(self) -> "MemoryGraphStore":
        copy = MemoryGraphStore()
        copy._nodes = {id_: _copy_node(n) for id_, n in self._nodes.items()}
        copy._relationships = {id_: _copy_relationship(r) for id_, r in self._relationships.items()}
        copy._adjacent = {id_: dict(rids) for id_, rids in self._adjacent.items()}
        copy._next_id = self._next_id
        return copy

    @property
    def node_count(self) -> int:
        return len(self._nodes)

    @property
    def relationship_count(self) -> int:
        return len(self._relationships)

    def read(self, request: Dict[str, Any]) -> List[SourceRow]:
        """Answer a ``scan``, ``lookup`` or ``expand`` request of the default-graph protocol."""
        raw_ids = request.get("ids")
        ids: Optional[List[Any]] = raw_ids if isinstance(raw_ids, list) else None
        if "type" in request:
            return self._read_relationships(request, ids)
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
            if not all(label in n.labels for label in wanted):
                continue
            if not matches_predicate(request.get("predicate"), {**n.properties, "id": n.id}):
                continue
            out.append({"id": n.id, "labels": list(n.labels), "properties": dict(n.properties)})
        return out

    def _read_relationships(
        self, request: Dict[str, Any], ids: Optional[List[Any]]
    ) -> List[SourceRow]:
        candidates: List[_StoredRelationship]
        if ids is not None:
            use_end = request.get("side") == "right"
            seen: Set[int] = set()
            candidates = []
            for id_ in ids:
                for rid in _get(self._adjacent, id_) or {}:
                    r = self._relationships[rid]
                    endpoint = r.end if use_end else r.start
                    if endpoint == id_ and rid not in seen:
                        seen.add(rid)
                        candidates.append(r)
        else:
            candidates = list(self._relationships.values())
        out: List[SourceRow] = []
        rel_type = request.get("type")
        for r in candidates:
            if rel_type is not None and r.type != rel_type:
                continue
            flat = {**r.properties, "id": r.id, "left_id": r.start, "right_id": r.end}
            if not matches_predicate(request.get("predicate"), flat):
                continue
            out.append({
                "id": r.id,
                "type": r.type,
                "left_id": r.start,
                "right_id": r.end,
                "properties": dict(r.properties),
            })
        return out

    def _link(self, r: _StoredRelationship) -> None:
        for id_ in (r.start, r.end):
            self._adjacent.setdefault(id_, {})[r.id] = None

    def _unlink(self, r: _StoredRelationship) -> None:
        self._adjacent.get(r.start, {}).pop(r.id, None)
        self._adjacent.get(r.end, {}).pop(r.id, None)
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

        def node(target: Any) -> _StoredNode:
            n = _get(self._nodes, resolve(target))
            if n is None:
                raise ValueError(f"Unknown node {_json(target)}")
            result: _StoredNode = n
            return result

        def relationship(target: Any) -> _StoredRelationship:
            id_ = resolve(target)
            r: Optional[_StoredRelationship]
            if isinstance(id_, dict):
                r = next(
                    (
                        x
                        for x in self._relationships.values()
                        if _same(x.start, id_.get("left_id", UNDEFINED))
                        and _same(x.end, id_.get("right_id", UNDEFINED))
                    ),
                    None,
                )
            else:
                r = _get(self._relationships, id_)
            if r is None:
                raise ValueError(f"Unknown relationship {_json(target)}")
            return r

        def create_node(ref: str, labels: Optional[List[str]], properties: Any) -> None:
            n = _StoredNode(self._next_id)
            self._next_id += 1
            for label in labels or []:
                if label not in n.labels:
                    n.labels.append(label)
            stats["propertiesSet"] += _assign(n.properties, properties)
            self._nodes[n.id] = n
            ids[ref] = n.id
            stats["nodesCreated"] += 1

        def create_relationship(
            ref: str, rel_type: Any, start: int, end: int, properties: Any
        ) -> None:
            if not isinstance(rel_type, str):
                raise ValueError("A relationship needs exactly one type")
            r = _StoredRelationship(self._next_id, rel_type, start, end)
            self._next_id += 1
            stats["propertiesSet"] += _assign(r.properties, properties)
            self._relationships[r.id] = r
            self._link(r)
            ids[ref] = r.id
            stats["relationshipsCreated"] += 1

        def is_deleted(kind: str, target: Any) -> bool:
            return f"{kind}:{canonical_key(resolve(target))}" in deleted

        def key_matches(properties: Dict[str, Any], key: Any) -> bool:
            return all(
                _same(properties.get(k, UNDEFINED), v) for k, v in (key or {}).items()
            )

        for change in changes:
            is_relationship = "type" in change and "label" not in change
            op = change.get("op")
            if op == "createNode":
                create_node(change.get("ref", ""), change.get("labels"), change.get("properties"))
            elif op == "createRelationship":
                create_relationship(
                    change.get("ref", ""),
                    change.get("type"),
                    node(change.get("start")).id,
                    node(change.get("end")).id,
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
                        if all(label in n.labels for label in labels)
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
                        labels,
                        {**(change.get("key") or {}), **(change.get("onCreate") or {})},
                    )
            elif op == "mergeRelationship":
                start = node(change.get("start")).id
                end = node(change.get("end")).id
                existing_rel = next(
                    (
                        r
                        for r in (self._relationships[rid] for rid in self._adjacent.get(start, {}))
                        if r.type == change.get("type")
                        and r.start == start
                        and r.end == end
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
                        change.get("type"),
                        start,
                        end,
                        {**(change.get("key") or {}), **(change.get("onCreate") or {})},
                    )
            elif op in ("setProperties", "replaceProperties"):
                target_properties = (
                    relationship(change.get("target")).properties
                    if is_relationship
                    else node(change.get("target")).properties
                )
                if op == "replaceProperties":
                    target_properties.clear()
                stats["propertiesSet"] += _assign(target_properties, change.get("properties"))
            elif op == "addLabels":
                n = node(change.get("target"))
                for label in change.get("labels") or []:
                    if label not in n.labels:
                        n.labels.append(label)
                        stats["labelsAdded"] += 1
            elif op == "removeLabels":
                n = node(change.get("target"))
                for label in change.get("labels") or []:
                    if label in n.labels:
                        n.labels.remove(label)
                        stats["labelsRemoved"] += 1
            elif op == "deleteRelationship":
                if is_deleted("relationship", change.get("target")):
                    continue
                r = relationship(change.get("target"))
                self._unlink(r)
                deleted.add(f"relationship:{canonical_key(r.id)}")
                stats["relationshipsDeleted"] += 1
            elif op == "deleteNode":
                if is_deleted("node", change.get("target")):
                    continue
                n = node(change.get("target"))
                attached = list(self._adjacent.get(n.id, {}))
                if len(attached) > 0 and change.get("detach") is not True:
                    raise ValueError(
                        f"Cannot delete node {_json(n.id)}: it still has relationships"
                    )
                for rid in attached:
                    attached_rel = self._relationships.get(rid)
                    if attached_rel is None:
                        continue
                    self._unlink(attached_rel)
                    deleted.add(f"relationship:{canonical_key(rid)}")
                    stats["relationshipsDeleted"] += 1
                self._adjacent.pop(n.id, None)
                self._nodes.pop(n.id, None)
                deleted.add(f"node:{canonical_key(n.id)}")
                stats["nodesDeleted"] += 1
            else:
                raise ValueError(f"Unsupported change {_json(op)}")
        return {"ids": ids, "stats": stats}
