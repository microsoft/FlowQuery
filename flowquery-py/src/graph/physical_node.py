"""Physical node representation for FlowQuery."""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

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
        self._is_static: bool = False
        self._refresh_every_ms: Optional[int] = None
        self._cache: Optional[List[Dict[str, Any]]] = None
        self._cached_at: float = 0.0

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
        self.invalidate_cache()

    @property
    def is_static(self) -> bool:
        return self._is_static

    @is_static.setter
    def is_static(self, value: bool) -> None:
        self._is_static = value

    @property
    def refresh_every_ms(self) -> Optional[int]:
        return self._refresh_every_ms

    @refresh_every_ms.setter
    def refresh_every_ms(self, value: Optional[int]) -> None:
        self._refresh_every_ms = value

    def invalidate_cache(self) -> None:
        self._cache = None
        self._cached_at = 0.0

    async def data(self, args: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        if self._statement is None:
            raise ValueError("Statement is null")
        # Filter pass-down queries (with args) bypass the persistent cache
        # because results depend on runtime parameter values.
        if args is None and self._is_static and self._cache is not None:
            fresh = (
                self._refresh_every_ms is None
                or (time.monotonic() * 1000 - self._cached_at) < self._refresh_every_ms
            )
            if fresh:
                return self._cache
        # Import at runtime to avoid circular dependency
        from ..compute.runner import Runner
        runner = Runner(ast=self._statement, args=args)
        await runner.run()
        result = runner.results
        if args is None and self._is_static:
            self._cache = result
            self._cached_at = time.monotonic() * 1000
        return result
