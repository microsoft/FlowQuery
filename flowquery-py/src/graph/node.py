"""Graph node representation for FlowQuery."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Awaitable, Callable, Dict, Optional, Union

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
        self._properties: Dict[str, Expression] = {}
        self._value: Optional['NodeRecord'] = None
        self._incoming: Optional['Relationship'] = None
        self._outgoing: Optional['Relationship'] = None
        self._data: Optional['NodeData'] = None
        self._todo_next: Optional[Callable[[], Union[None, Awaitable[None]]]] = None

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

    @property
    def properties(self) -> Dict[str, Expression]:
        return self._properties

    def set_property(self, key: str, value: Expression) -> None:
        self._properties[key] = value

    def get_property(self, key: str) -> Optional[Expression]:
        return self._properties.get(key)

    def set_value(self, value: Dict[str, Any]) -> None:
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

    async def next(self) -> None:
        if self._data:
            self._data.reset()
            while self._data.next():
                current = self._data.current()
                if current is not None:
                    self.set_value(current)
                    if self._outgoing and self._value:
                        await self._outgoing.find(self._value['id'])
                    await self.run_todo_next()

    async def find(self, id_: str, hop: int = 0) -> None:
        if self._data:
            self._data.reset()
            while self._data.find(id_, hop):
                current = self._data.current(hop)
                if current is not None:
                    self.set_value(current)
                    if self._incoming:
                        self._incoming.set_end_node(self)
                    if self._outgoing and self._value:
                        await self._outgoing.find(self._value['id'], hop)
                    await self.run_todo_next()

    @property
    def todo_next(self) -> Optional[Callable[[], Union[None, Awaitable[None]]]]:
        return self._todo_next

    @todo_next.setter
    def todo_next(self, func: Optional[Callable[[], Union[None, Awaitable[None]]]]) -> None:
        self._todo_next = func

    async def run_todo_next(self) -> None:
        if self._todo_next:
            result = self._todo_next()
            if result is not None:
                await result
