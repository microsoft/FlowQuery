"""Row-level provenance / data lineage primitives.

Mirrors :mod:`flowquery (TypeScript) compute/provenance`. Defines the
shapes used by the deep-mode lineage feature:

* :class:`NodeBinding` / :class:`RelationshipHop` /
  :class:`RelationshipBinding` -- per-row observations of a MATCH's
  Node / Relationship slot bindings.
* :class:`DataSourceBinding` -- per-row observation of a ``LOAD``
  contribution; threads ``source_provenance`` for ``LET``-backed
  datasets so traceability survives across query boundaries.
* :class:`RowSegment` -- one flat slice of bindings: the union of
  contributing ``NodeBinding`` / ``RelationshipBinding`` /
  ``DataSourceBinding`` for a single emitted row, or one input row's
  contribution to an aggregate group.
* :class:`RowProvenance` -- extends :class:`RowSegment` with ``rows``,
  the ordered per-input-row segments. ``rows`` always has length 1 for
  non-aggregate rows; aggregate rows expand to one segment per input
  row so ``collect()``-style outputs can be aligned positionally.
* :class:`ProvenanceSites` -- registry that snapshots the live
  bindings of a MATCH's Node / Relationship slots at projection time.
* :class:`ProvenanceSource` -- abstract source of a ``RowSegment``;
  implemented by :class:`ProvenanceSites`, by
  ``AggregatedWith.as_provenance_source`` (groups), and by
  ``Load.as_provenance_source`` (data-source bindings).

The collector is opt-in via the ``provenance`` :class:`Runner`
option and zero-cost when disabled.
"""

from __future__ import annotations

import json
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Mapping, Optional, Set

from ..graph.node import Node
from ..graph.node_reference import NodeReference
from ..graph.relationship import Relationship
from ..graph.relationship_reference import RelationshipReference
from ..graph.virtual_sources import get_virtual_source


@dataclass
class NodeBinding:
    """One observation that a particular alias was bound to a particular
    node id while a result row was being projected.
    """

    alias: Optional[str] = None
    label: Optional[str] = None
    id: Any = None
    properties: Optional[Dict[str, Any]] = None
    source: Optional["RowProvenance"] = None


@dataclass
class RelationshipHop:
    """One traversed edge in a relationship binding.

    Variable-length matches (``[:T*m..n]``) contribute multiple hops;
    single-hop matches contribute one.
    """

    left_id: Any = None
    right_id: Any = None
    type: str = ""
    properties: Optional[Dict[str, Any]] = None
    source: Optional["RowProvenance"] = None


@dataclass
class RelationshipBinding:
    """One observation that a particular relationship alias was bound
    to a concrete path of one or more hops while a result row was being
    projected.
    """

    alias: Optional[str] = None
    type: Optional[str] = None
    hops: List[RelationshipHop] = field(default_factory=list)
    path: List[Any] = field(default_factory=list)


@dataclass
class DataSourceBinding:
    """One observation that a particular ``LOAD`` operation contributed
    a row to the projected result.

    ``source`` is the resolved source identifier: a URL, file URI,
    async-function name, or ``let://<name>`` reference for a
    ``LET``-bound dataset. ``source_provenance`` is the inner
    :class:`RowProvenance` for the loaded record when the source was a
    ``LET``-backed array whose inner runner was executed with
    provenance.
    """

    source: str = ""
    source_provenance: Optional["RowProvenance"] = None


@dataclass
class RowSegment:
    """One flat slice of bindings.

    Either a single non-aggregate row's contribution, or one input
    row's contribution to an aggregate group. Sources
    (:meth:`ProvenanceSource.snapshot`) and the entries in
    :attr:`RowProvenance.rows` are all :class:`RowSegment` instances.
    """

    nodes: List[NodeBinding] = field(default_factory=list)
    relationships: List[RelationshipBinding] = field(default_factory=list)
    data_sources: Optional[List[DataSourceBinding]] = None


@dataclass
class RowProvenance(RowSegment):
    """Row-level lineage aligned by index with :attr:`Runner.results`.

    Extends a single segment (the union of contributing bindings) with
    :attr:`rows`, the ordered per-input-row segments. For non-aggregate
    rows ``len(rows)`` is 1; for aggregates it equals the number of
    input rows that fed the group.
    """

    rows: List[RowSegment] = field(default_factory=list)


def merge_provenance_segment(into: RowSegment, segment: RowSegment) -> None:
    """Concatenate one segment into a destination segment.

    Lives here so the merge order stays consistent across consumers
    (``Return``, ``GroupBy``, ``AggregatedWith``).
    """
    for n in segment.nodes:
        into.nodes.append(n)
    for r in segment.relationships:
        into.relationships.append(r)
    if segment.data_sources is not None and len(segment.data_sources) > 0:
        if into.data_sources is None:
            into.data_sources = []
        for d in segment.data_sources:
            into.data_sources.append(d)


class ProvenanceSource(ABC):
    """Anything that can produce a :class:`RowSegment` for the row
    currently being emitted.
    """

    @abstractmethod
    def snapshot(self) -> RowSegment: ...


def _extract_node_properties(record: Mapping[str, Any]) -> Dict[str, Any]:
    """Shallow copy a node record's user-visible property values,
    stripping ``id`` and the internal ``_label`` injected by
    :class:`DataResolver`.
    """
    out: Dict[str, Any] = {}
    for key, val in record.items():
        if key == "id" or key == "_label":
            continue
        out[key] = val
    return out


def _extract_relationship_properties(match: Dict[str, Any]) -> Dict[str, Any]:
    """Shallow copy a relationship match record's property values,
    stripping the structural fields (``type``, ``startNode``, etc.) so
    what remains are the user-declared edge properties.
    """
    nested = match.get("properties") if isinstance(match, dict) else None
    if isinstance(nested, dict):
        return dict(nested)
    out: Dict[str, Any] = {}
    structural = {
        "type",
        "startNode",
        "endNode",
        "properties",
        "left_id",
        "right_id",
        "_type",
    }
    for key, val in match.items():
        if key in structural:
            continue
        out[key] = val
    return out


class ProvenanceSites(ProvenanceSource):
    """Holds the set of :class:`Node` and :class:`Relationship` slots
    discovered in a query's MATCH operations.

    These are stable references; their live state is read on each
    :meth:`snapshot` call to capture the bindings active at that
    moment.
    """

    def __init__(self) -> None:
        self.nodes: List[Node] = []
        self.relationships: List[Relationship] = []
        self._seen_node_identifiers: Set[str] = set()
        self._seen_relationship_identifiers: Set[str] = set()
        self._capture_properties: bool = False

    @property
    def capture_properties(self) -> bool:
        return self._capture_properties

    @capture_properties.setter
    def capture_properties(self, value: bool) -> None:
        self._capture_properties = value

    def add_node(self, node: Node) -> None:
        if isinstance(node, NodeReference):
            return
        identifier = node.identifier
        if identifier is not None:
            if identifier in self._seen_node_identifiers:
                return
            self._seen_node_identifiers.add(identifier)
        self.nodes.append(node)

    def add_relationship(self, rel: Relationship) -> None:
        if isinstance(rel, RelationshipReference):
            return
        identifier = rel.identifier
        if identifier is not None:
            if identifier in self._seen_relationship_identifiers:
                return
            self._seen_relationship_identifiers.add(identifier)
        self.relationships.append(rel)

    @property
    def is_empty(self) -> bool:
        return len(self.nodes) == 0 and len(self.relationships) == 0

    def snapshot(self) -> RowSegment:
        capture_props = self._capture_properties
        nodes: List[NodeBinding] = []
        for node in self.nodes:
            v = node.value()
            binding = NodeBinding(
                alias=node.identifier,
                label=node.label,
                id=None if v is None else v.get("id"),
            )
            if capture_props and isinstance(v, dict):
                binding.properties = _extract_node_properties(v)
            if v is not None:
                src = get_virtual_source(v)
                if src is not None:
                    binding.source = src
            nodes.append(binding)
        relationships: List[RelationshipBinding] = []
        for rel in self.relationships:
            matches = rel.matches
            hops: List[RelationshipHop] = []
            for m in matches:
                start = m.get("startNode") if isinstance(m, dict) else None
                end = m.get("endNode") if isinstance(m, dict) else None
                hop = RelationshipHop(
                    left_id=None if not isinstance(start, dict) else start.get("id"),
                    right_id=None if not isinstance(end, dict) else end.get("id"),
                    type=m.get("type", "") if isinstance(m, dict) else "",
                )
                if capture_props and isinstance(m, dict):
                    hop.properties = _extract_relationship_properties(m)
                src = get_virtual_source(m)
                if src is not None:
                    hop.source = src
                hops.append(hop)
            path: List[Any] = []
            if hops:
                path.append(hops[0].left_id)
                for h in hops:
                    path.append(h.right_id)
            relationships.append(
                RelationshipBinding(
                    alias=rel.identifier,
                    type=rel.type,
                    hops=hops,
                    path=path,
                )
            )
        return RowSegment(nodes=nodes, relationships=relationships)


def node_binding_key(b: NodeBinding) -> str:
    """Stable canonical key for deduplicating a :class:`NodeBinding`
    within an aggregate group.

    Uses :func:`json.dumps` to preserve scalar type distinctions
    (``1`` vs ``"1"``).
    """
    return f"{b.alias or ''}\x00{json.dumps(b.id, default=str)}"


def relationship_binding_key(b: RelationshipBinding) -> str:
    """Stable canonical key for deduplicating a
    :class:`RelationshipBinding` within an aggregate group.

    Includes every hop so variable-length paths with the same alias
    but different traversals are treated as distinct.
    """
    parts: List[str] = [f"{b.alias or ''}\x00"]
    for h in b.hops:
        parts.append(
            f"{json.dumps(h.left_id, default=str)}|"
            f"{json.dumps(h.right_id, default=str)}|"
            f"{h.type};"
        )
    return "".join(parts)
