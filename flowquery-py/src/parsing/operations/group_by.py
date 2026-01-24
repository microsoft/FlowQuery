"""GroupBy implementation for aggregate operations."""

from typing import Any, Dict, Generator, List, Optional

from ..expressions.expression import Expression
from ..functions.aggregate_function import AggregateFunction
from ..functions.reducer_element import ReducerElement
from .projection import Projection


class GroupByNode:
    """Represents a node in the group-by tree."""

    def __init__(self, value: Any = None):
        self._value = value
        self._children: Dict[Any, 'GroupByNode'] = {}
        self._elements: Optional[List[ReducerElement]] = None

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


class GroupBy(Projection):
    """Implements grouping and aggregation for FlowQuery operations."""

    def __init__(self, expressions: List[Expression]):
        super().__init__(expressions)
        self._root = GroupByNode()
        self._current = self._root
        self._mappers: Optional[List[Expression]] = None
        self._reducers: Optional[List[AggregateFunction]] = None
        self._where = None

    async def run(self) -> None:
        self._reset_tree()
        self._map()
        self._reduce()

    @property
    def _root_node(self) -> GroupByNode:
        return self._root

    def _reset_tree(self) -> None:
        self._current = self._root

    def _map(self) -> None:
        node = self._current
        for mapper in self.mappers:
            value = mapper.value()
            child = node.children.get(value)
            if child is None:
                child = GroupByNode(value)
                node.children[value] = child
            node = child
        self._current = node

    def _reduce(self) -> None:
        if self._current.elements is None:
            self._current.elements = [reducer.element() for reducer in self.reducers]
        elements = self._current.elements
        for i, reducer in enumerate(self.reducers):
            reducer.reduce(elements[i])

    @property
    def mappers(self) -> List[Expression]:
        if self._mappers is None:
            self._mappers = list(self._generate_mappers())
        return self._mappers

    def _generate_mappers(self) -> Generator[Expression, None, None]:
        for expression, _ in self.expressions():
            if expression.mappable():
                yield expression

    @property
    def reducers(self) -> List[AggregateFunction]:
        if self._reducers is None:
            self._reducers = []
            for child in self.children:
                self._reducers.extend(child.reducers())
        return self._reducers

    def generate_results(
        self, 
        mapper_index: int = 0, 
        node: Optional[GroupByNode] = None
    ) -> Generator[Dict[str, Any], None, None]:
        if node is None:
            node = self._root
        
        if len(node.children) > 0:
            for child in node.children.values():
                self.mappers[mapper_index].overridden = child.value
                yield from self.generate_results(mapper_index + 1, child)
        else:
            if node.elements:
                for i, element in enumerate(node.elements):
                    self.reducers[i].overridden = element.value
            record: Dict[str, Any] = {}
            for expression, alias in self.expressions():
                record[alias] = expression.value()
            if self.where_condition:
                yield record

    @property
    def where(self):
        return self._where

    @where.setter
    def where(self, where) -> None:
        self._where = where

    @property
    def where_condition(self) -> bool:
        if self._where is None:
            return True
        return self._where.value()
