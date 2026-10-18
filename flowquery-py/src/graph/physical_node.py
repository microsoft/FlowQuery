"""Physical node representation for FlowQuery."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from ..parsing.ast_node import ASTNode
from .node import Node
from .virtual_statement import VirtualStatement


class PhysicalNode(Node):
    """Represents a physical node in the graph database."""

    def __init__(self, id_: Optional[str], label: str, properties: Optional[Dict[str, Any]] = None):
        super().__init__(id_, label)
        # Store additional physical properties in a separate dict
        # (Node.properties is for Expression-based pattern properties)
        self._physical_properties = properties or {}
        self._virtual = VirtualStatement()
        self._provider: Any = None

    @property
    def physical_properties(self) -> Dict[str, Any]:
        """Get the physical properties (values, not expressions)."""
        return self._physical_properties
    @property
    def statement(self) -> Optional[ASTNode]:
        return self._virtual.statement

    @statement.setter
    def statement(self, value: Optional[ASTNode]) -> None:
        self._virtual.statement = value

    @property
    def virtual(self) -> VirtualStatement:
        """The backing statement wrapper (internal; used for capability opt-in)."""
        return self._virtual

    @property
    def provider(self) -> Any:
        """Source provider serving this element, or None for legacy eager loading."""
        return self._provider

    @provider.setter
    def provider(self, value: Any) -> None:
        self._provider = value

    @property
    def is_static(self) -> bool:
        return self._virtual.is_static

    @is_static.setter
    def is_static(self, value: bool) -> None:
        self._virtual.is_static = value

    @property
    def refresh_every_ms(self) -> Optional[int]:
        return self._virtual.refresh_every_ms

    @refresh_every_ms.setter
    def refresh_every_ms(self, value: Optional[int]) -> None:
        self._virtual.refresh_every_ms = value

    def invalidate_cache(self) -> None:
        self._virtual.invalidate_cache()

    async def data(
        self,
        args: Optional[Dict[str, Any]] = None,
        provenance: bool = False,
        source_context: Any = None,
    ) -> List[Dict[str, Any]]:
        if self._virtual.statement is None and self._provider is not None:
            from .statement_source import materialize_scan

            return await materialize_scan(
                self._provider,
                "node",
                self.label or "",
                {"label": self.label},
                args,
                source_context,
            )
        return await self._virtual.data(args, provenance, source_context)
