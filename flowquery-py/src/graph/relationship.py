"""Graph relationship representation for FlowQuery."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, List, Optional, Union

from ..parsing.ast_node import ASTNode
from .hops import Hops
from .relationship_data import RelationshipData
from .relationship_match_collector import RelationshipMatchCollector, RelationshipMatchRecord

if TYPE_CHECKING:
    from .node import Node


class Relationship(ASTNode):
    """Represents a relationship in a graph pattern."""

    def __init__(self) -> None:
        super().__init__()
        self._identifier: Optional[str] = None
        self._type: Optional[str] = None
        self._hops: Hops = Hops()
        self._source: Optional['Node'] = None
        self._target: Optional['Node'] = None
        self._direction: str = "right"
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
        return self._properties

    @properties.setter
    def properties(self, value: Dict[str, Any]) -> None:
        self._properties = value

    def _matches_properties(self, hop: int = 0) -> bool:
        """Check if current record matches all constraint properties."""
        if not self._properties:
            return True
        if self._data is None:
            return True
        for key, expression in self._properties.items():
            record = self._data.current(hop)
            if record is None:
                raise ValueError("No current relationship data available")
            if key not in record:
                raise ValueError("Relationship does not have property")
            return bool(record[key] == expression.value())
        return True

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

    @property
    def direction(self) -> str:
        return self._direction

    @direction.setter
    def direction(self, value: str) -> None:
        self._direction = value

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

    def get_data(self) -> Optional['RelationshipData']:
        return self._data

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
        is_left = self._direction == "left"
        if hop > 0:
            # For hops greater than 0, the source becomes the target of the previous hop
            self._source = self._target
        if hop == 0:
            if self._data:
                self._data.reset()

            # Handle zero-hop case: when min is 0 on a variable-length relationship,
            # match source node as target (no traversal)
            if self._hops and self._hops.multi() and self._hops.min == 0 and self._target:
                # For zero-hop, target finds the same node as source (left_id)
                # No relationship match is pushed since no edge is traversed
                await self._target.find(left_id, hop)

        def find_match(id_: str, h: int) -> bool:
            if self._data is None:
                return False
            if is_left:
                return self._data.find_reverse(id_, h)
            return self._data.find(id_, h)
        follow_id = 'left_id' if is_left else 'right_id'
        while self._data and find_match(left_id, hop):
            data = self._data.current(hop)
            if data and self._hops and hop + 1 >= self._hops.min:
                self.set_value(self)
                if not self._matches_properties(hop):
                    continue
                if self._target and follow_id in data:
                    await self._target.find(data[follow_id], hop)
                if self._matches.is_circular():
                    raise ValueError("Circular relationship detected")
                if self._hops and hop + 1 < self._hops.max:
                    await self.find(data[follow_id], hop + 1)
                self._matches.pop()
            elif data and self._hops:
                # Below minimum hops: traverse the edge without yielding a match
                if follow_id in data:
                    await self.find(data[follow_id], hop + 1)

        # Restore original source node
        self._source = original
