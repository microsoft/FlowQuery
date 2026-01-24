"""Node reference for FlowQuery."""

from typing import Optional, TYPE_CHECKING

from .node import Node

if TYPE_CHECKING:
    from ..parsing.ast_node import ASTNode


class NodeReference(Node):
    """Represents a reference to an existing node variable."""

    def __init__(self, base: Node, reference: Node):
        super().__init__(base.identifier, base.label)
        self._reference: Node = reference
        # Copy properties from base
        self._properties = base._properties
        self._outgoing = base.outgoing
        self._incoming = base.incoming

    @property
    def reference(self) -> Node:
        return self._reference

    # Keep referred as alias for backward compatibility
    @property
    def referred(self) -> Node:
        return self._reference

    def value(self):
        return self._reference.value() if self._reference else None

    async def next(self) -> None:
        """Process next using the referenced node's value."""
        self.set_value(self._reference.value())
        if self._outgoing and self._value:
            await self._outgoing.find(self._value['id'])
        await self.run_todo_next()

    async def find(self, id_: str, hop: int = 0) -> None:
        """Find by ID, only matching if it equals the referenced node's ID."""
        referenced = self._reference.value()
        if referenced is None or id_ != referenced.get('id'):
            return
        self.set_value(referenced)
        if self._outgoing and self._value:
            await self._outgoing.find(self._value['id'], hop)
        await self.run_todo_next()
