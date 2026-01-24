"""Physical node representation for FlowQuery."""

from typing import Any, Dict, List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from ..parsing.ast_node import ASTNode

from .node import Node


class PhysicalNode(Node):
    """Represents a physical node in the graph database."""

    def __init__(self, id_: Optional[str], label: str, properties: Optional[Dict[str, Any]] = None):
        super().__init__(id_, label)
        # Store additional physical properties in a separate dict
        # (Node.properties is for Expression-based pattern properties)
        self._physical_properties = properties or {}
        self._statement: Optional["ASTNode"] = None

    @property
    def physical_properties(self) -> Dict[str, Any]:
        """Get the physical properties (values, not expressions)."""
        return self._physical_properties

    @property
    def statement(self) -> Optional["ASTNode"]:
        return self._statement

    @statement.setter
    def statement(self, value: Optional["ASTNode"]) -> None:
        self._statement = value

    async def data(self) -> List[Dict[str, Any]]:
        if self._statement is None:
            raise ValueError("Statement is null")
        from ..compute.runner import Runner
        runner = Runner(ast=self._statement)
        await runner.run()
        return runner.results
