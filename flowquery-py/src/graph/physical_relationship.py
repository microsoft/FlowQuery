"""Physical relationship representation for FlowQuery."""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

from ..parsing.ast_node import ASTNode
from .relationship import Relationship


class PhysicalRelationship(Relationship):
    """Represents a physical relationship in the graph database."""

    def __init__(self) -> None:
        super().__init__()
        self._statement: Optional[ASTNode] = None
        self._is_static: bool = False
        self._refresh_every_ms: Optional[int] = None
        self._cache: Optional[List[Dict[str, Any]]] = None
        self._cached_at: float = 0.0

    @property
    def statement(self) -> Optional[ASTNode]:
        """Get the statement for this relationship."""
        return self._statement

    @statement.setter
    def statement(self, value: Optional[ASTNode]) -> None:
        """Set the statement for this relationship."""
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

    async def data(
        self,
        args: Optional[Dict[str, Any]] = None,
        provenance: bool = False,
    ) -> List[Dict[str, Any]]:
        """Execute the statement and return results."""
        if self._statement is None:
            raise ValueError("Statement is null")
        if (
            not provenance
            and args is None
            and self._is_static
            and self._cache is not None
        ):
            fresh = (
                self._refresh_every_ms is None
                or (time.monotonic() * 1000 - self._cached_at) < self._refresh_every_ms
            )
            if fresh:
                return self._cache
        # Import at runtime to avoid circular dependency
        from ..compute.runner import Runner, RunnerOptions
        runner = Runner(
            None,
            self._statement,
            args=args,
            options=RunnerOptions(provenance=provenance),
        )
        await runner.run()
        result = runner.results
        if provenance:
            from .virtual_sources import attach_virtual_source

            prov = runner.provenance
            if prov is not None:
                length = min(len(prov), len(result))
                for i in range(length):
                    row = result[i]
                    if isinstance(row, dict):
                        attach_virtual_source(row, prov[i])
        if not provenance and args is None and self._is_static:
            self._cache = result
            self._cached_at = time.monotonic() * 1000
        return result
