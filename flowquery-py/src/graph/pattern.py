"""Graph pattern representation for FlowQuery."""

from typing import Any, Generator, List, Optional, TYPE_CHECKING, Union

from ..parsing.ast_node import ASTNode

if TYPE_CHECKING:
    from .node import Node
    from .relationship import Relationship


class Pattern(ASTNode):
    """Represents a graph pattern for matching."""

    def __init__(self):
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
    def elements(self) -> List[ASTNode]:
        return self._chain

    def add_element(self, element: Union['Node', 'Relationship']) -> None:
        from .node import Node
        from .relationship import Relationship
        
        if (len(self._chain) > 0 and 
            type(self._chain[-1]) == type(element)):
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
        from .node import Node
        if len(self._chain) == 0:
            raise ValueError("Pattern is empty")
        first = self._chain[0]
        if isinstance(first, Node):
            return first
        raise ValueError("Pattern does not start with a node")

    @property
    def end_node(self) -> 'Node':
        from .node import Node
        if len(self._chain) == 0:
            raise ValueError("Pattern is empty")
        last = self._chain[-1]
        if isinstance(last, Node):
            return last
        raise ValueError("Pattern does not end with a node")

    def first_node(self) -> Optional['Node']:
        if len(self._chain) > 0:
            return self._chain[0]
        return None

    def value(self) -> List[Any]:
        return list(self.values())

    def values(self) -> Generator[Any, None, None]:
        from .node import Node
        from .relationship import Relationship
        
        for i, element in enumerate(self._chain):
            if isinstance(element, Node):
                # Skip node if previous element was a zero-hop relationship (no matches)
                if i > 0 and isinstance(self._chain[i-1], Relationship) and len(self._chain[i-1].matches) == 0:
                    continue
                yield element.value()
            elif isinstance(element, Relationship):
                j = 0
                for match in element.matches:
                    yield match
                    if j < len(element.matches) - 1:
                        yield match["endNode"]
                    j += 1

    async def fetch_data(self) -> None:
        """Loads data from the database for all elements."""
        from .database import Database
        from .node import Node
        from .relationship import Relationship
        from .node_reference import NodeReference
        from .relationship_reference import RelationshipReference
        from .node_data import NodeData
        from .relationship_data import RelationshipData
        
        db = Database.get_instance()
        for element in self._chain:
            if isinstance(element, (NodeReference, RelationshipReference)):
                continue
            data = await db.get_data(element)
            if isinstance(element, Node):
                element.set_data(data)
            elif isinstance(element, Relationship):
                element.set_data(data)

    async def initialize(self) -> None:
        await self.fetch_data()

    async def traverse(self) -> None:
        first = self.first_node()
        if first:
            await first.next()
