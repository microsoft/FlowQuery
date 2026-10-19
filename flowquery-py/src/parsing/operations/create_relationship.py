"""Represents a CREATE operation for creating virtual relationships."""

from typing import Any, Dict, List, Optional

from ...graph.database import Database
from ...graph.relationship import Relationship
from ...graph.source_provider import SOURCE_CONTRACT_VERSION, merge_capabilities
from ..ast_node import ASTNode
from ..data_structures.associative_array import AssociativeArray
from .definition_backend import declared_capabilities, definition_backend
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

    async def effective_capabilities(self) -> Optional[Dict[str, Any]]:
        """Effective capabilities: those declared by the body's backend
        function, overridden by an explicit ``WITH CAPABILITIES`` clause."""
        rel = self._relationship
        declared = await declared_capabilities(
            definition_backend(self._statement),
            {
                "operation": "capabilities",
                "type": rel.type if rel is not None else None,
                "sourceLabel": rel.source.label if rel is not None and rel.source is not None else None,
                "targetLabel": rel.target.label if rel is not None and rel.target is not None else None,
            },
        )
        return merge_capabilities(declared, self.capabilities, "relationship")

    async def run(self) -> None:
        if self._relationship is None:
            raise ValueError("Relationship is null")
        db = Database.get_instance()
        capabilities = await self.effective_capabilities()
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
