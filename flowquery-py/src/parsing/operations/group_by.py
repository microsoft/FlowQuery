"""GroupBy implementation for aggregate operations."""

import json
from typing import Any, Dict, Generator, List, Optional

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

    def __init__(self, expressions: List[ASTNode]) -> None:
        super().__init__(expressions)
        self._root = GroupByNode()
        self._current = self._root
        self._mappers: Optional[List[Any]] = None
        self._reducers: Optional[List[AggregateFunction]] = None
        self._where: Optional[ASTNode] = None
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

    def generate_results(
        self,
        mapper_index: int = 0,
        node: Optional[GroupByNode] = None
    ) -> Generator[Dict[str, Any], None, None]:
        if node is None:
            node = self._root

        if mapper_index == 0 and len(node.children) == 0 and len(self.mappers) > 0:
            return

        if len(node.children) > 0:
            for child in node.children.values():
                self.mappers[mapper_index].overridden = child.value
                yield from self.generate_results(mapper_index + 1, child)
        else:
            if node.elements is None:
                node.elements = [reducer.element() for reducer in self.reducers]
            if node.elements:
                for i, element in enumerate(node.elements):
                    self.reducers[i].overridden = element.value
            record: Dict[str, Any] = {}
            for expression, alias in self.expressions():
                record[alias] = expression.value()
            if self.where_condition:
                yield record

    def generate_provenance(
        self,
        mapper_index: int = 0,
        node: Optional[GroupByNode] = None,
    ) -> Generator[RowProvenance, None, None]:
        """Walks the group tree in the same traversal order as
        :meth:`generate_results`, yielding the materialised
        :class:`RowProvenance` for each emitted group.
        """
        if node is None:
            node = self._root

        if mapper_index == 0 and len(node.children) == 0 and len(self.mappers) > 0:
            return

        if len(node.children) > 0:
            for child in node.children.values():
                self.mappers[mapper_index].overridden = child.value
                yield from self.generate_provenance(mapper_index + 1, child)
        else:
            if node.elements is None:
                node.elements = [reducer.element() for reducer in self.reducers]
            if node.elements:
                for i, element in enumerate(node.elements):
                    self.reducers[i].overridden = element.value
            if not self.where_condition:
                return
            yield RowProvenance(
                nodes=list(node.provenance_nodes.values()),
                relationships=list(node.provenance_relationships.values()),
                rows=list(node.provenance_rows),
            )

    @property
    def where(self) -> Optional[ASTNode]:
        return self._where

    @where.setter
    def where(self, where: Optional[ASTNode]) -> None:
        self._where = where

    @property
    def where_condition(self) -> Any:
        if self._where is None:
            return True
        return self._where.value()
