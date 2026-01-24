"""Base class for all FlowQuery operations."""

from abc import ABC
from typing import Any, Dict, List, Optional

from ..ast_node import ASTNode


class Operation(ASTNode, ABC):
    """Base class for all FlowQuery operations.
    
    Operations represent the main statements in FlowQuery (WITH, UNWIND, RETURN, LOAD, WHERE).
    They form a linked list structure and can be executed sequentially.
    """

    def __init__(self):
        super().__init__()
        self._previous: Optional[Operation] = None
        self._next: Optional[Operation] = None

    @property
    def previous(self) -> Optional['Operation']:
        return self._previous

    @previous.setter
    def previous(self, value: Optional['Operation']) -> None:
        self._previous = value

    @property
    def next(self) -> Optional['Operation']:
        return self._next

    @next.setter
    def next(self, value: Optional['Operation']) -> None:
        self._next = value

    def add_sibling(self, operation: 'Operation') -> None:
        if self._parent:
            self._parent.add_child(operation)
        operation.previous = self
        self.next = operation

    @property
    def is_last(self) -> bool:
        return self._next is None

    async def run(self) -> None:
        """Executes this operation. Must be implemented by subclasses.
        
        Raises:
            NotImplementedError: If not implemented by subclass
        """
        raise NotImplementedError("Not implemented")

    async def finish(self) -> None:
        """Finishes execution by calling finish on the next operation in the chain."""
        if self.next:
            await self.next.finish()

    async def initialize(self) -> None:
        if self.next:
            await self.next.initialize()

    def reset(self) -> None:
        pass

    @property
    def results(self) -> List[Dict[str, Any]]:
        raise NotImplementedError("Not implemented")
