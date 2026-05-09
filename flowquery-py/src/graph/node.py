"""Graph node representation for FlowQuery."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, AsyncIterator, Dict, Optional

from ..parsing.ast_node import ASTNode
from ..parsing.expressions.expression import Expression
from .node_data import NodeData, NodeRecord

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
        self._properties: Dict[str, Expression] = {}
        self._value: Optional['NodeRecord'] = None
        self._incoming: Optional['Relationship'] = None
        self._outgoing: Optional['Relationship'] = None
        self._data: Optional['NodeData'] = None

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
        if not self._properties:
            return True
        if self._data is None:
            return True
        for key, expression in self._properties.items():
            record = self._data.current(hop)
            if record is None:
                raise ValueError("No current node data available")
            if key not in record:
                return False
            if record[key] != expression.value():
                return False
        return True

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

    async def next(self) -> AsyncIterator[None]:
        if self._data:
            self._data.reset()
            while self._data.next():
                current = self._data.current()
                if current is not None:
                    self.set_value(current)
                    if not self._matches_properties():
                        continue
                    if self._outgoing and self._value:
                        async for _ in self._outgoing.find(self._value['id']):
                            yield
                    else:
                        yield

    async def find(self, id_: str, hop: int = 0) -> AsyncIterator[None]:
        if self._data:
            self._data.reset()
            while self._data.find(id_, hop):
                current = self._data.current(hop)
                if current is not None:
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
                    if not self._matches_properties(hop):
                        continue
                    if self._outgoing and self._value:
                        async for _ in self._outgoing.find(self._value['id'], hop):
                            yield
                    else:
                        yield
