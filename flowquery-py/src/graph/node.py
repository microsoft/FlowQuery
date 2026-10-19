"""Graph node representation for FlowQuery."""

from __future__ import annotations

from contextlib import aclosing
from typing import TYPE_CHECKING, Any, AsyncGenerator, Dict, List, Optional

from ..parsing.ast_node import ASTNode
from ..parsing.expressions.expression import Expression
from .graph_records import (
    common_namespace,
    endpoint_namespace,
    has_property,
    labels_of,
    namespace_of,
    origin_matches,
    property_of,
)
from .node_data import NodeData, NodeRecord
from .source_access import PushedPredicate, SourceTerms, build_terms

if TYPE_CHECKING:
    from .relationship import Relationship


class Node(ASTNode):
    """Represents a node in a graph pattern."""

    def __init__(
        self,
        identifier: Optional[str] = None,
        label: Optional[str] = None
    ):
        super().__init__()
        self._identifier = identifier
        self._label = label
        self._labels: list[str] = [label] if label is not None else []
        #: (n:A:B): a match must carry every label (graphs only).
        self._all_labels = False
        #: Graph named by a qualified label, ``(n:hr.Person)``; None when unqualified.
        self._graph: Optional[str] = None
        self._identity: Optional[Expression] = None
        self._properties: Dict[str, Expression] = {}
        self._value: Optional['NodeRecord'] = None
        self._incoming: Optional['Relationship'] = None
        self._outgoing: Optional['Relationship'] = None
        self._data: Optional['NodeData'] = None
        self._access: Any = None
        self._pushed_predicates: List[PushedPredicate] = []

    @property
    def identifier(self) -> Optional[str]:
        return self._identifier

    @identifier.setter
    def identifier(self, value: str) -> None:
        self._identifier = value

    @property
    def label(self) -> Optional[str]:
        return self._label

    @label.setter
    def label(self, value: Optional[str]) -> None:
        self._label = value
        self._labels = [value] if value is not None else []

    @property
    def labels(self) -> list[str]:
        return self._labels

    @labels.setter
    def labels(self, value: list[str]) -> None:
        self._labels = value
        self._label = value[0] if value else None

    @property
    def all_labels(self) -> bool:
        """True for ``(n:A:B)`` (every label required), False for a single
        label or ``(n:A|B)`` (any of the labels)."""
        return self._all_labels and len(self._labels) > 1

    @all_labels.setter
    def all_labels(self, value: bool) -> None:
        self._all_labels = value

    @property
    def graph(self) -> Optional[str]:
        return self._graph

    @graph.setter
    def graph(self, value: Optional[str]) -> None:
        self._graph = value

    @property
    def properties(self) -> Dict[str, Expression]:
        return self._properties

    @properties.setter
    def properties(self, value: Dict[str, Expression]) -> None:
        self._properties = value

    def set_property(self, key: str, value: Expression) -> None:
        self._properties[key] = value

    def get_property(self, key: str) -> Optional[Expression]:
        return self._properties.get(key)

    def _matches_properties(self, hop: int = 0) -> bool:
        """Check if current record matches all constraint properties."""
        if not self._properties and self._identity is None:
            return True
        if self._data is None:
            return True
        record = self._data.current(hop)
        if record is None:
            raise ValueError("No current node data available")
        return self.matches_constraints(record)

    def matches_constraints(self, record: Dict[str, Any]) -> bool:
        """The row satisfies the pattern's identity (``id(n) = ...``) and property
        constraints.  Graph nodes are matched on their stored user
        properties; definition rows on their columns."""
        if self._identity is not None and record.get("id") != self._identity.value():
            return False
        for key, expression in self._properties.items():
            if not has_property(record, key):
                return False
            if property_of(record, key) != expression.value():
                return False
        return True

    @property
    def identity(self) -> Optional[Expression]:
        """``id(n) = value`` from the WHERE clause (set by MATCH), or None."""
        return self._identity

    @identity.setter
    def identity(self, expression: Optional[Expression]) -> None:
        self._identity = expression

    def set_value(self, value: Optional[Dict[str, Any]]) -> None:
        self._value = value  # type: ignore[assignment]

    def value(self) -> Optional['NodeRecord']:
        return self._value

    @property
    def outgoing(self) -> Optional['Relationship']:
        return self._outgoing

    @outgoing.setter
    def outgoing(self, relationship: Optional['Relationship']) -> None:
        self._outgoing = relationship

    @property
    def incoming(self) -> Optional['Relationship']:
        return self._incoming

    @incoming.setter
    def incoming(self, relationship: Optional['Relationship']) -> None:
        self._incoming = relationship

    def set_data(self, data: Optional['NodeData']) -> None:
        self._data = data

    def get_data(self) -> Optional['NodeData']:
        return self._data

    def set_access(self, access: Any) -> None:
        """Provider-backed access; when set, rows are fetched on demand."""
        self._access = access

    @property
    def access(self) -> Any:
        return self._access

    @property
    def pushed_predicates(self) -> List[PushedPredicate]:
        """WHERE comparisons pushed to this node's source (set by MATCH)."""
        return self._pushed_predicates

    @pushed_predicates.setter
    def pushed_predicates(self, predicates: List[PushedPredicate]) -> None:
        self._pushed_predicates = predicates

    def source_terms(self) -> SourceTerms:
        return build_terms(self._properties, self._pushed_predicates, self._identity)

    def matches_labels(self, record: Dict[str, Any]) -> bool:
        """Every label of ``(n:A:B)`` is carried by the row (always true otherwise)."""
        if not self.all_labels:
            return True
        labels = labels_of(record)
        return all(label in labels for label in self._labels)

    def matches_record(self, record: Dict[str, Any]) -> bool:
        """Residual check of the pattern's own property constraints against a row."""
        return self.matches_labels(record) and self.matches_constraints(record)

    async def next(self) -> AsyncGenerator[None, None]:
        if self._access is not None:
            async with aclosing(self._deferred_next()) as gen:
                async for _ in gen:
                    yield
            return
        if self._data:
            self._data.reset()
            while self._data.next():
                current = self._data.current()
                if current is not None:
                    self.set_value(current)
                    if not self._matches_properties() or not self.matches_labels(current):
                        continue
                    if self._outgoing and self._value:
                        async for _ in self._outgoing.find(
                            self._value['id'], 0, namespace_of(self._value)
                        ):
                            yield
                    else:
                        yield

    async def find(
        self, id_: Any, hop: int = 0, origin: Optional[str] = None
    ) -> AsyncGenerator[None, None]:
        """Bind the node with id ``id_``, reached through a relationship.
        ``origin`` keeps the step within the relationship's graph (see
        :class:`NodeSourceAccess`)."""
        if self._access is not None:
            async with aclosing(self._deferred_find(id_, hop, origin)) as gen:
                async for _ in gen:
                    yield
            return
        if self._data:
            self._data.reset()
            while self._data.find(id_, hop):
                current = self._data.current(hop)
                if current is not None:
                    if not origin_matches(current, origin):
                        continue
                    self.set_value(current)
                    # Always record this node as the endNode of the incoming
                    # relationship match. For variable-length patterns, the same
                    # target node instance is reused at every intermediate hop, so
                    # we must set end_node BEFORE filtering on this node's
                    # properties. Otherwise, intermediate matches keep
                    # endNode=None and pattern values collapse to
                    # [startNode, endNode] when the property filter only matches
                    # the final node in a *m..n traversal.
                    if self._incoming:
                        self._incoming.set_end_node(self)
                    if not self._matches_properties(hop) or not self.matches_labels(current):
                        continue
                    if self._outgoing and self._value:
                        async for _ in self._outgoing.find(
                            self._value['id'], hop, namespace_of(self._value)
                        ):
                            yield
                    else:
                        yield

    async def _deferred_next(self) -> AsyncGenerator[None, None]:
        access = self._access
        terms, args = self.source_terms()
        pages = access.start(terms, args)
        async with aclosing(pages) as page_iter:
            async for page in page_iter:
                rows = [row for row in page if self.matches_record(row)]
                if self._outgoing is not None and len(rows) > 1:
                    await Node.prefetch_chain(self, rows)
                for row in rows:
                    self.set_value(row)
                    if self._outgoing:
                        row_id: Any = row.get("id")
                        async with aclosing(
                            self._outgoing.find(row_id, 0, namespace_of(row))
                        ) as inner:
                            async for _ in inner:
                                yield
                    else:
                        yield

    async def _deferred_find(
        self, id_: Any, hop: int, origin: Optional[str]
    ) -> AsyncGenerator[None, None]:
        terms, args = self.source_terms()
        rows = await self._access.lookup(id_, terms, args, origin)
        for row in rows:
            self.set_value(row)
            if self._incoming:
                self._incoming.set_end_node(self)
            if not self.matches_record(row):
                continue
            if self._outgoing:
                async with aclosing(
                    self._outgoing.find(row.get("id"), hop, namespace_of(row))
                ) as inner:
                    async for _ in inner:
                        yield
            else:
                yield

    @staticmethod
    async def prefetch_chain(node: 'Node', anchor_rows: List[Dict[str, Any]]) -> None:
        """Batch-prefetch the single-hop provider-backed chain that follows
        ``node`` for a page of anchor rows, so traversal issues one request
        per batch instead of one per row."""
        current: Node = node
        anchors = [row.get("id") for row in anchor_rows]
        origin = common_namespace(anchor_rows, namespace_of)
        while current.outgoing is not None:
            rel = current.outgoing
            target = rel.target
            if (
                rel.access is None
                or not rel.access.deferred
                or (rel.hops is not None and rel.hops.multi())
                or target is None
            ):
                return
            rel_terms, rel_args = rel.source_terms()
            rows = await rel.access.prefetch(
                anchors, rel.anchor_side, rel_terms, rel_args, origin
            )
            if rows is None:
                return
            next_ids = [row.get(rel.next_field) for row in rows]
            if target.access is None or not target.access.deferred:
                return
            target_terms, target_args = target.source_terms()
            origin = common_namespace(
                rows, lambda row: endpoint_namespace(row, rel.next_side)
            )
            await target.access.prefetch(next_ids, target_terms, target_args, origin)
            anchors = next_ids
            current = target
