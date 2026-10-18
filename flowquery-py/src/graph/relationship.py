"""Graph relationship representation for FlowQuery."""

from __future__ import annotations

from contextlib import aclosing
from typing import TYPE_CHECKING, Any, AsyncGenerator, Dict, List, Optional, Union

from ..parsing.ast_node import ASTNode
from .hops import Hops
from .relationship_data import RelationshipData
from .relationship_match_collector import RelationshipMatchCollector, RelationshipMatchRecord
from .source_access import SourceTerms, build_terms

if TYPE_CHECKING:
    from .node import Node


class Relationship(ASTNode):
    """Represents a relationship in a graph pattern."""

    def __init__(self) -> None:
        super().__init__()
        self._identifier: Optional[str] = None
        self._types: List[str] = []
        self._hops: Hops = Hops()
        self._source: Optional['Node'] = None
        self._target: Optional['Node'] = None
        self._direction: str = "right"
        self._data: Optional['RelationshipData'] = None
        self._value: Optional[Union[RelationshipMatchRecord, List[RelationshipMatchRecord]]] = None
        self._matches: RelationshipMatchCollector = RelationshipMatchCollector()
        self._properties: Dict[str, Any] = {}
        self._access: Any = None
        self._frames: Dict[int, Dict[str, Any]] = {}

    @property
    def identifier(self) -> Optional[str]:
        return self._identifier

    @identifier.setter
    def identifier(self, value: str) -> None:
        self._identifier = value

    @property
    def type(self) -> Optional[str]:
        return self._types[0] if self._types else None

    @type.setter
    def type(self, value: str) -> None:
        self._types = [value]

    @property
    def types(self) -> List[str]:
        return self._types

    @types.setter
    def types(self, value: List[str]) -> None:
        self._types = value

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
            if record[key] != expression.value():
                return False
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

    def set_access(self, access: Any) -> None:
        """Internal: provider-backed access; when set, rows are fetched on demand."""
        self._access = access
        self._frames.clear()

    @property
    def access(self) -> Any:
        return self._access

    def source_terms(self) -> SourceTerms:
        return build_terms(self._properties, [])

    @property
    def anchor_side(self) -> str:
        """Stored endpoint matched against the traversal's current node id."""
        return "right" if self._direction == "left" else "left"

    @property
    def next_field(self) -> str:
        """Stored endpoint holding the id of the next node in traversal order."""
        return "left_id" if self._direction == "left" else "right_id"

    def current_record(self, hop: int = 0) -> Optional[Dict[str, Any]]:
        """The relationship row bound at ``hop`` (deferred frames or legacy data cursor)."""
        if hop in self._frames:
            return self._frames[hop]
        if self._access is not None:
            return None
        if self._data is None:
            return None
        return self._data.current(hop)

    def set_frame(self, hop: int, record: Dict[str, Any]) -> None:
        """Internal: bind a row for ``hop`` (used by reversed plans)."""
        self._frames[hop] = record

    def clear_frame(self, hop: int) -> None:
        """Internal: unbind the row for ``hop`` (end of a reversed match)."""
        self._frames.pop(hop, None)

    def push_match(self, record: Dict[str, Any], traversal_id: str) -> None:
        """Internal: push a match for an explicitly supplied row."""
        self._matches.push(self, traversal_id, record)
        self._value = self._matches.value()

    def pop_match(self) -> None:
        """Internal: pop the most recent match."""
        self._matches.pop()
        self._value = self._matches.value()

    def set_value(self, relationship: 'Relationship', traversal_id: str = "") -> None:
        """Set value by pushing match to collector."""
        self._matches.push(relationship, traversal_id)
        self._value = self._matches.value()

    def value(self) -> Optional[Union[RelationshipMatchRecord, List[RelationshipMatchRecord]]]:
        return self._value

    @property
    def matches(self) -> List[RelationshipMatchRecord]:
        return self._matches.matches

    def set_end_node(self, node: 'Node') -> None:
        """Set the end node for the current match."""
        self._matches.end_node = node

    def _left_id_or_right_id(self) -> str:
        return "left_id" if self._direction == "left" else "right_id"

    async def find(self, left_id: str, hop: int = 0) -> AsyncGenerator[None, None]:
        """Find relationships starting from the given node ID."""
        if self._access is not None:
            async with aclosing(self._deferred_find(left_id, hop)) as gen:
                async for _ in gen:
                    yield
            return
        # Save original source node
        original = self._source
        if hop > 0:
            # For hops greater than 0, the source becomes the target of the previous hop
            self._source = self._target
        try:
            if hop == 0:
                if self._data:
                    self._data.reset()

                # Handle zero-hop case: when min is 0 on a variable-length relationship,
                # match source node as target (no traversal)
                if self._hops and self._hops.multi() and self._hops.min == 0 and self._target:
                    # For zero-hop, target finds the same node as source (left_id)
                    # No relationship match is pushed since no edge is traversed
                    async for _ in self._target.find(left_id, hop):
                        yield

            while self._data and self._data.find(left_id, hop, self._direction):
                data = self._data.current(hop)
                if data is None:
                    continue
                id = data[self._left_id_or_right_id()]
                if hop + 1 >= self._hops.min:
                    self.set_value(self, left_id)
                    if not self._matches_properties(hop):
                        continue
                    if self._target:
                        async for _ in self._target.find(id, hop):
                            yield
                    if hop + 1 < self._hops.max:
                        if self._matches.is_circular(id):
                            self._matches.pop()
                            continue
                        async for _ in self.find(id, hop + 1):
                            yield
                    self._matches.pop()
                else:
                    # Below minimum hops: traverse the edge without yielding a match
                    async for _ in self.find(id, hop + 1):
                        yield
        finally:
            # Restore original source node
            self._source = original

    async def _deferred_find(self, left_id: Any, hop: int) -> AsyncGenerator[None, None]:
        original = self._source
        if hop > 0:
            self._source = self._target
        try:
            if (
                hop == 0
                and self._hops is not None
                and self._hops.multi()
                and self._hops.min == 0
                and self._target is not None
            ):
                async with aclosing(self._target.find(left_id, hop)) as zero:
                    async for _ in zero:
                        yield
            all_terms, args = self.source_terms()
            # Hops below the minimum are not property-checked, so nothing is pushed.
            terms = all_terms if hop + 1 >= self._hops.min else []
            target = self._target
            access = self._access
            async with aclosing(access.expand(left_id, self.anchor_side, terms, args)) as pages:
                async for page in pages:
                    target_access = target.access if target is not None else None
                    if (
                        target is not None
                        and target_access is not None
                        and getattr(target_access, "deferred", False)
                        and len(page) > 1
                    ):
                        t_terms, t_args = target.source_terms()
                        await target_access.prefetch(
                            [row.get(self.next_field) for row in page], t_terms, t_args
                        )
                    for row in page:
                        async with aclosing(self._visit(row, left_id, hop)) as visit:
                            async for _ in visit:
                                yield
        finally:
            self._source = original

    async def _visit(
        self, record: Dict[str, Any], left_id: Any, hop: int
    ) -> AsyncGenerator[None, None]:
        self._frames[hop] = record
        id_: Any = record.get(self.next_field)
        if hop + 1 >= self._hops.min:
            if not self.matches_record(record):
                return
            self.push_match(record, left_id)
            try:
                if self._target is not None:
                    async with aclosing(self._target.find(id_, hop)) as found:
                        async for _ in found:
                            yield
                if hop + 1 < self._hops.max and not self._matches.is_circular(id_):
                    async with aclosing(self.find(id_, hop + 1)) as deeper:
                        async for _ in deeper:
                            yield
            finally:
                self._matches.pop()
        else:
            async with aclosing(self.find(id_, hop + 1)) as below:
                async for _ in below:
                    yield

    def matches_record(self, record: Dict[str, Any]) -> bool:
        """Re-check relationship property constraints against a provider row."""
        for key, expression in self._properties.items():
            if key not in record:
                raise ValueError("Relationship does not have property")
            if record[key] != expression.value():
                return False
        return True
