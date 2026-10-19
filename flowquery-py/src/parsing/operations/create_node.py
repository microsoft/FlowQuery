"""Represents a CREATE operation for creating virtual nodes."""

from typing import Any, Dict, List, Optional

from ...graph.database import Database
from ...graph.node import Node
from ...graph.source_provider import SOURCE_CONTRACT_VERSION, merge_capabilities
from ..ast_node import ASTNode
from ..data_structures.associative_array import AssociativeArray
from .definition_backend import declared_capabilities, definition_backend
from .operation import Operation


class CreateNode(Operation):
    """Represents a CREATE operation for creating virtual nodes."""

    def __init__(
        self,
        node: Node,
        statement: ASTNode,
        is_static: bool = False,
        refresh_every_ms: Optional[int] = None,
        capabilities: Optional[AssociativeArray] = None,
    ) -> None:
        super().__init__()
        self._node = node
        self._statement = statement
        self._is_static = is_static
        self._refresh_every_ms = refresh_every_ms
        self._capabilities = capabilities

    @property
    def node(self) -> Node:
        return self._node

    @property
    def statement(self) -> ASTNode:
        return self._statement

    @property
    def is_static(self) -> bool:
        return self._is_static

    @property
    def refresh_every_ms(self) -> Optional[int]:
        return self._refresh_every_ms

    @property
    def capabilities(self) -> Optional[Dict[str, Any]]:
        """Source capabilities declared with ``WITH CAPABILITIES { ... }``, if any."""
        if self._capabilities is None:
            return None
        return {"version": SOURCE_CONTRACT_VERSION, **self._capabilities.value()}

    async def effective_capabilities(self) -> Optional[Dict[str, Any]]:
        """Effective capabilities: those declared by the body's backend
        function (``LOAD ... FROM fn($request)``), overridden by an explicit
        ``WITH CAPABILITIES`` clause.  ``None`` keeps legacy eager loading."""
        declared = await declared_capabilities(
            definition_backend(self._statement),
            {
                "operation": "capabilities",
                "label": self._node.label if self._node is not None else None,
            },
        )
        return merge_capabilities(declared, self.capabilities, "node")

    async def run(self) -> None:
        if self._node is None:
            raise ValueError("Node is null")
        db = Database.get_instance()
        capabilities = await self.effective_capabilities()
        db.add_node(
            self._node,
            self._statement,
            self._is_static,
            self._refresh_every_ms,
        )
        if capabilities is not None:
            try:
                db.set_node_source_capabilities(self._node.label or "", capabilities)
            except Exception:
                db.remove_node(self._node)
                raise

    @property
    def results(self) -> List[Dict[str, Any]]:
        return []
