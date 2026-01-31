"""Graph pattern representation for FlowQuery."""

from __future__ import annotations

from typing import Any, Generator, List, Optional, Sequence, Union

from ..parsing.ast_node import ASTNode
from .database import Database
from .node import Node
from .node_data import NodeData
from .relationship import Relationship
from .relationship_data import RelationshipData


class Pattern(ASTNode):
    """Represents a graph pattern for matching."""

    def __init__(self) -> None:
        super().__init__()
        self._identifier: Optional[str] = None
        self._chain: List[Union['Node', 'Relationship']] = []

    @property
    def identifier(self) -> Optional[str]:
        return self._identifier

    @identifier.setter
    def identifier(self, value: str) -> None:
        self._identifier = value

    @property
    def chain(self) -> List[Union['Node', 'Relationship']]:
        return self._chain

    @property
    def elements(self) -> Sequence[ASTNode]:
        return self._chain

    def add_element(self, element: Union['Node', 'Relationship']) -> None:
        if (len(self._chain) > 0 and
            type(self._chain[-1]) is type(element)):
            raise ValueError("Cannot add two consecutive elements of the same type to the graph pattern")

        if len(self._chain) > 0:
            last = self._chain[-1]
            if isinstance(last, Node) and isinstance(element, Relationship):
                last.outgoing = element
                element.source = last
            if isinstance(last, Relationship) and isinstance(element, Node):
                last.target = element
                element.incoming = last

        self._chain.append(element)
        self.add_child(element)

    @property
    def start_node(self) -> 'Node':
        if len(self._chain) == 0:
            raise ValueError("Pattern is empty")
        first = self._chain[0]
        if isinstance(first, Node):
            return first
        raise ValueError("Pattern does not start with a node")

    @property
    def end_node(self) -> 'Node':
        if len(self._chain) == 0:
            raise ValueError("Pattern is empty")
        last = self._chain[-1]
        if isinstance(last, Node):
            return last
        raise ValueError("Pattern does not end with a node")

    def first_node(self) -> Optional[Union['Node', 'Relationship']]:
        if len(self._chain) > 0:
            return self._chain[0]
        return None

    def value(self) -> List[Any]:
        return list(self.values())

    def values(self) -> Generator[Any, None, None]:
        for i, element in enumerate(self._chain):
            if isinstance(element, Node):
                # Skip node if previous element was a zero-hop relationship (no matches)
                prev = self._chain[i-1] if i > 0 else None
                if isinstance(prev, Relationship) and len(prev.matches) == 0:
                    continue
                yield element.value()
            elif isinstance(element, Relationship):
                for j, match in enumerate(element.matches):
                    yield match
                    if j < len(element.matches) - 1:
                        yield match["endNode"]

    async def fetch_data(self) -> None:
        """Loads data from the database for all elements."""
        db = Database.get_instance()
        for element in self._chain:
            # Use type name comparison to avoid issues with module double-loading
            if type(element).__name__ in ('NodeReference', 'RelationshipReference'):
                continue
            data = await db.get_data(element)
            if isinstance(element, Node) and isinstance(data, NodeData):
                element.set_data(data)
            elif isinstance(element, Relationship) and isinstance(data, RelationshipData):
                element.set_data(data)

    async def initialize(self) -> None:
        await self.fetch_data()

    async def traverse(self) -> None:
        first = self.first_node()
        if first and isinstance(first, Node):
            await first.next()
