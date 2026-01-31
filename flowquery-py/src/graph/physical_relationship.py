"""Physical relationship representation for FlowQuery."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from ..parsing.ast_node import ASTNode
from .relationship import Relationship


class PhysicalRelationship(Relationship):
    """Represents a physical relationship in the graph database."""

    def __init__(self) -> None:
        super().__init__()
        self._statement: Optional[ASTNode] = None

    @property
    def statement(self) -> Optional[ASTNode]:
        """Get the statement for this relationship."""
        return self._statement

    @statement.setter
    def statement(self, value: Optional[ASTNode]) -> None:
        """Set the statement for this relationship."""
        self._statement = value

    async def data(self) -> List[Dict[str, Any]]:
        """Execute the statement and return results."""
        if self._statement is None:
            raise ValueError("Statement is null")
        # Import at runtime to avoid circular dependency
        from ..compute.runner import Runner
        runner = Runner(None, self._statement)
        await runner.run()
        return runner.results
