"""Graph relationship representation for FlowQuery."""

from typing import Any, Dict, List, Optional, TYPE_CHECKING, Union

from ..parsing.ast_node import ASTNode
from .hops import Hops
from .relationship_match_collector import RelationshipMatchCollector, RelationshipMatchRecord

if TYPE_CHECKING:
    from .node import Node
    from .relationship_data import RelationshipData, RelationshipRecord


class Relationship(ASTNode):
    """Represents a relationship in a graph pattern."""

    def __init__(self):
        super().__init__()
        self._identifier: Optional[str] = None
        self._type: Optional[str] = None
        self._hops: Hops = Hops()
        self._source: Optional['Node'] = None
        self._target: Optional['Node'] = None
        self._data: Optional['RelationshipData'] = None
        self._value: Optional[Union[RelationshipMatchRecord, List[RelationshipMatchRecord]]] = None
        self._matches: RelationshipMatchCollector = RelationshipMatchCollector()
        self._properties: Dict[str, Any] = {}

    @property
    def identifier(self) -> Optional[str]:
        return self._identifier

    @identifier.setter
    def identifier(self, value: str) -> None:
        self._identifier = value

    @property
    def type(self) -> Optional[str]:
        return self._type

    @type.setter
    def type(self, value: str) -> None:
        self._type = value

    @property
    def hops(self) -> Hops:
        return self._hops

    @hops.setter
    def hops(self, value: Hops) -> None:
        self._hops = value

    @property
    def properties(self) -> Dict[str, Any]:
        """Get properties from relationship data."""
        if self._data:
            return self._data.properties() or {}
        return {}

    @property
    def source(self) -> Optional['Node']:
        return self._source

    @source.setter
    def source(self, value: 'Node') -> None:
        self._source = value

    @property
    def target(self) -> Optional['Node']:
        return self._target

    @target.setter
    def target(self, value: 'Node') -> None:
        self._target = value

    # Keep start/end aliases for backward compatibility
    @property
    def start(self) -> Optional['Node']:
        return self._source

    @start.setter
    def start(self, value: 'Node') -> None:
        self._source = value

    @property
    def end(self) -> Optional['Node']:
        return self._target

    @end.setter
    def end(self, value: 'Node') -> None:
        self._target = value

    def set_data(self, data: Optional['RelationshipData']) -> None:
        self._data = data

    def set_value(self, relationship: 'Relationship') -> None:
        """Set value by pushing match to collector."""
        self._matches.push(relationship)
        self._value = self._matches.value()

    def value(self) -> Optional[Union[RelationshipMatchRecord, List[RelationshipMatchRecord]]]:
        return self._value

    @property
    def matches(self) -> List[RelationshipMatchRecord]:
        return self._matches.matches

    def set_end_node(self, node: 'Node') -> None:
        """Set the end node for the current match."""
        self._matches.end_node = node

    async def find(self, left_id: str, hop: int = 0) -> None:
        """Find relationships starting from the given node ID."""
        # Save original source node
        original = self._source
        if hop > 0:
            # For hops greater than 0, the source becomes the target of the previous hop
            self._source = self._target
        if hop == 0:
            self._data.reset() if self._data else None
            
            # Handle zero-hop case: when min is 0 on a variable-length relationship,
            # match source node as target (no traversal)
            if self._hops and self._hops.multi() and self._hops.min == 0 and self._target:
                # For zero-hop, target finds the same node as source (left_id)
                # No relationship match is pushed since no edge is traversed
                await self._target.find(left_id, hop)
        
        while self._data and self._data.find(left_id, hop):
            data = self._data.current(hop)
            if data and self._hops and hop >= self._hops.min:
                self.set_value(self)
                if self._target and 'right_id' in data:
                    await self._target.find(data['right_id'], hop)
                if self._matches.is_circular():
                    raise ValueError("Circular relationship detected")
                if self._hops and hop + 1 < self._hops.max:
                    await self.find(data['right_id'], hop + 1)
                self._matches.pop()
        
        # Restore original source node
        self._source = original
