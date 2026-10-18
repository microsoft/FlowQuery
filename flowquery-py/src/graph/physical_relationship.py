"""Physical relationship representation for FlowQuery."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from ..parsing.ast_node import ASTNode
from .relationship import Relationship
from .virtual_statement import VirtualStatement


class PhysicalRelationship(Relationship):
    """Represents a physical relationship in the graph database."""

    def __init__(self) -> None:
        super().__init__()
        self._virtual = VirtualStatement()
        self._provider: Any = None

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
        """Execute the statement (or provider scan) and return results."""
        if self._virtual.statement is None and self._provider is not None:
            from .statement_source import materialize_scan

            source_label = self.source.label if self.source is not None else None
            target_label = self.target.label if self.target is not None else None
            return await materialize_scan(
                self._provider,
                "relationship",
                f"(:{source_label or ''})-[:{self.type}]->(:{target_label or ''})",
                {"type": self.type, "sourceLabel": source_label, "targetLabel": target_label},
                args,
                source_context,
            )
        return await self._virtual.data(args, provenance, source_context)
