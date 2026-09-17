"""GroupBy implementation for aggregate operations."""

import json
from typing import Any, Callable, Dict, Generator, List, Optional, Tuple

from ...compute.provenance import (
    NodeBinding,
    ProvenanceSource,
    RelationshipBinding,
    RowProvenance,
    RowSegment,
    node_binding_key,
    relationship_binding_key,
)
from ..ast_node import ASTNode
from ..functions.aggregate_function import AggregateFunction
from ..functions.reducer_element import ReducerElement
from .projection import Projection


def _make_hashable(value: Any) -> Any:
    """Convert a value to a hashable form for use as a dict key."""
    if isinstance(value, dict):
        return json.dumps(value, sort_keys=True, default=str)
    if isinstance(value, list):
        return json.dumps(value, sort_keys=True, default=str)
    return value


class GroupByNode:
    """Represents a node in the group-by tree."""

    def __init__(self, value: Any = None):
        self._value = value
        self._children: Dict[Any, 'GroupByNode'] = {}
        self._elements: Optional[List[ReducerElement]] = None
        self._provenance_nodes: Optional[Dict[str, NodeBinding]] = None
        self._provenance_rels: Optional[Dict[str, RelationshipBinding]] = None
        self._provenance_rows: Optional[List[RowSegment]] = None

    @property
    def value(self) -> Any:
        return self._value

    @property
    def children(self) -> Dict[Any, 'GroupByNode']:
        return self._children

    @property
    def elements(self) -> Optional[List[ReducerElement]]:
        return self._elements

    @elements.setter
    def elements(self, elements: List[ReducerElement]) -> None:
        self._elements = elements

    @property
    def provenance_nodes(self) -> Dict[str, NodeBinding]:
        """Per-group dedup map for contributing node bindings (lazy)."""
        if self._provenance_nodes is None:
            self._provenance_nodes = {}
        return self._provenance_nodes

    @property
    def provenance_relationships(self) -> Dict[str, RelationshipBinding]:
        """Per-group dedup map for contributing relationship bindings (lazy)."""
        if self._provenance_rels is None:
            self._provenance_rels = {}
        return self._provenance_rels

    @property
    def provenance_rows(self) -> List[RowSegment]:
        """Per-input-row contribution segments in arrival order.  One
        entry is appended per :meth:`GroupBy.run` call that lands in
        this group, so an aggregate row's ``provenance.rows`` aligns
        positionally with ``collect(...)`` outputs from the same
        group.
        """
        if self._provenance_rows is None:
            self._provenance_rows = []
        return self._provenance_rows


class GroupBy(Projection):
    """Implements grouping and aggregation for FlowQuery operations."""

    def __init__(
        self,
        expressions: List[ASTNode],
        where_provider: Optional[Callable[[], Optional[ASTNode]]] = None,
    ) -> None:
        super().__init__(expressions)
        self._root = GroupByNode()
        self._current = self._root
        self._mappers: Optional[List[Any]] = None
        self._reducers: Optional[List[AggregateFunction]] = None
        self._where_provider = where_provider
        self._provenance_sources: Optional[List[ProvenanceSource]] = None

    async def run(self) -> None:
        self._reset_tree()
        self._map()
        self._reduce()
        self._record_provenance()

    def add_provenance_source(self, source: ProvenanceSource) -> None:
        """Register a provenance source whose snapshot is folded into
        the currently active group on every :meth:`run`.  May be called
        multiple times to compose contributions from several upstream
        MATCHes or upstream aggregation boundaries.
        """
        if self._provenance_sources is None:
            self._provenance_sources = []
        self._provenance_sources.append(source)

    @property
    def provenance_enabled(self) -> bool:
        return self._provenance_sources is not None

    def _record_provenance(self) -> None:
        if self._provenance_sources is None:
            return
        node_map = self._current.provenance_nodes
        rel_map = self._current.provenance_relationships
        # Per-input-row segment: a single merged contribution for THIS run().
        row_segment = RowSegment(nodes=[], relationships=[], data_sources=None)
        for src in self._provenance_sources:
            snap = src.snapshot()
            for nb in snap.nodes:
                row_segment.nodes.append(nb)
                k = node_binding_key(nb)
                if k not in node_map:
                    node_map[k] = nb
            for rb in snap.relationships:
                row_segment.relationships.append(rb)
                k = relationship_binding_key(rb)
                if k not in rel_map:
                    rel_map[k] = rb
            if snap.data_sources is not None and len(snap.data_sources) > 0:
                if row_segment.data_sources is None:
                    row_segment.data_sources = []
                for d in snap.data_sources:
                    row_segment.data_sources.append(d)
        self._current.provenance_rows.append(row_segment)

    @property
    def _root_node(self) -> GroupByNode:
        return self._root

    def _reset_tree(self) -> None:
        self._current = self._root

    def _map(self) -> None:
        node = self._current
        for mapper in self.mappers:
            value = mapper.value()
            key = _make_hashable(value)
            child = node.children.get(key)
            if child is None:
                child = GroupByNode(value)
                node.children[key] = child
            node = child
        self._current = node

    def _reduce(self) -> None:
        if self._current.elements is None:
            self._current.elements = [reducer.element() for reducer in self.reducers]
        elements = self._current.elements
        if elements:
            for i, reducer in enumerate(self.reducers):
                reducer.reduce(elements[i])

    @property
    def mappers(self) -> List[Any]:
        if self._mappers is None:
            self._mappers = list(self._generate_mappers())
        return self._mappers

    def _generate_mappers(self) -> Generator[Any, None, None]:
        for expression, _ in self.expressions():
            if hasattr(expression, 'mappable') and expression.mappable():
                yield expression

    @property
    def reducers(self) -> List[AggregateFunction]:
        if self._reducers is None:
            self._reducers = []
            for child in self.children:
                if hasattr(child, 'reducers'):
                    self._reducers.extend(child.reducers())
        return self._reducers

    def _generate_leaves(
        self,
        mapper_index: int = 0,
        node: Optional[GroupByNode] = None,
        path: Optional[List[Any]] = None,
    ) -> Generator[Tuple[GroupByNode, List[Any]], None, None]:
        """Depth-first walk over the group tree that applies each
        group's mapper and reducer overrides before yielding its leaf,
        together with the mapper values collected along the path.
        Shared by the result, group and provenance generators so they
        always traverse in identical order.
        """
        if node is None:
            node = self._root
        if path is None:
            path = []

        if mapper_index == 0 and len(node.children) == 0 and len(self.mappers) > 0:
            return

        if len(node.children) > 0:
            for child in node.children.values():
                self.mappers[mapper_index].overridden = child.value
                yield from self._generate_leaves(
                    mapper_index + 1, child, path + [child.value]
                )
        else:
            if node.elements is None:
                node.elements = [reducer.element() for reducer in self.reducers]
            if node.elements:
                for i, element in enumerate(node.elements):
                    self.reducers[i].overridden = element.value
            yield node, path

    def _make_restore(
        self, path: List[Any], element_values: List[Any]
    ) -> Callable[[], None]:
        # A factory, not an inline closure: consumers hold restorers past
        # the yield, so the captured values must not be late-bound.
        def restore() -> None:
            for i, value in enumerate(path):
                self.mappers[i].overridden = value
            for i, value in enumerate(element_values):
                self.reducers[i].overridden = value

        return restore

    def generate_groups(
        self,
    ) -> Generator[Tuple[Dict[str, Any], Callable[[], None]], None, None]:
        """Yields each emitted group together with a callback that
        re-applies that group's mapper and reducer overrides.  Lets
        callers replay groups in an order other than tree-traversal
        order (e.g. after ORDER BY) while keeping downstream expression
        evaluation correct.
        """
        for node, path in self._generate_leaves():
            record: Dict[str, Any] = {}
            for expression, alias in self.expressions():
                record[alias] = expression.value()
            if not self.where_condition:
                continue
            element_values = [element.value for element in (node.elements or [])]
            yield record, self._make_restore(path, element_values)

    def generate_results(self) -> Generator[Dict[str, Any], None, None]:
        for record, _ in self.generate_groups():
            yield record

    def generate_provenance(self) -> Generator[RowProvenance, None, None]:
        """Walks the group tree in the same traversal order as
        :meth:`generate_results`, yielding the materialised
        :class:`RowProvenance` for each emitted group.
        """
        for node, _ in self._generate_leaves():
            if not self.where_condition:
                continue
            yield RowProvenance(
                nodes=list(node.provenance_nodes.values()),
                relationships=list(node.provenance_relationships.values()),
                rows=list(node.provenance_rows),
            )

    @property
    def where_condition(self) -> Any:
        where = self._where_provider() if self._where_provider is not None else None
        if where is None:
            return True
        return where.value()
