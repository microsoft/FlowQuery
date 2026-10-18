"""Represents a CREATE operation for creating virtual relationships."""

from typing import Any, Dict, List, Optional

from ...graph.database import Database
from ...graph.relationship import Relationship
from ...graph.source_provider import SOURCE_CONTRACT_VERSION
from ..ast_node import ASTNode
from ..data_structures.associative_array import AssociativeArray
from .operation import Operation


class CreateRelationship(Operation):
    """Represents a CREATE operation for creating virtual relationships."""

    def __init__(
        self,
        relationship: Relationship,
        statement: ASTNode,
        is_static: bool = False,
        refresh_every_ms: Optional[int] = None,
        capabilities: Optional[AssociativeArray] = None,
    ) -> None:
        super().__init__()
        self._relationship = relationship
        self._statement = statement
        self._is_static = is_static
        self._refresh_every_ms = refresh_every_ms
        self._capabilities = capabilities

    @property
    def relationship(self) -> Relationship:
        return self._relationship

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

    async def run(self) -> None:
        if self._relationship is None:
            raise ValueError("Relationship is null")
        db = Database.get_instance()
        capabilities = self.capabilities
        db.add_relationship(
            self._relationship,
            self._statement,
            self._is_static,
            self._refresh_every_ms,
        )
        if capabilities is not None:
            rel = self._relationship
            try:
                db.set_relationship_source_capabilities(
                    rel.type or "",
                    rel.source.label if rel.source is not None else None,
                    rel.target.label if rel.target is not None else None,
                    capabilities,
                )
            except Exception:
                db.remove_relationship(rel)
                raise

    @property
    def results(self) -> List[Dict[str, Any]]:
        return []
