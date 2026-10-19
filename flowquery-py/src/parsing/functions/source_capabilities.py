"""Built-in function listing the effective source capabilities."""

from typing import Any, AsyncGenerator

from .async_function import AsyncFunction
from .function_metadata import FunctionDef


def _mode_of(physical: Any) -> str:
    if physical.provider is None:
        return "eager"
    return "statement" if physical.statement is not None else "provider"


@FunctionDef({
    "description": (
        "Lists virtual nodes and relationships with their effective source capabilities "
        "(lookup, expand, predicate push-down, streaming, writes)."
    ),
    "category": "async",
    "parameters": [],
    "output": {
        "description": "Entry with kind, label or type/endpoints, mode and capabilities",
        "type": "object",
    },
    "examples": ["LOAD JSON FROM source_capabilities() AS s RETURN s"],
})
class SourceCapabilities(AsyncFunction):
    """Lists every virtual node and relationship with the source
    capabilities FlowQuery plans against.  Use it to see which operations
    and filters reach a backend.

    Nodes: ``{kind: 'node', label, mode, capabilities}``
    Relationships: ``{kind: 'relationship', type, from_label, to_label, mode, capabilities}``
    Default graph: ``{kind: 'graph', function, mode: 'graph', capabilities}``

    ``mode`` is ``'eager'`` (legacy definition, no capabilities),
    ``'statement'`` (``CREATE VIRTUAL`` opted into the source contract) or
    ``'provider'`` (registered provider object).
    """

    def __init__(self) -> None:
        super().__init__("source_capabilities")
        self._expected_parameter_count = 0

    async def generate(self) -> AsyncGenerator[Any, None]:
        from ...graph.database import Database

        db = Database.get_instance()
        for label, physical in list(db.nodes.items()):
            provider = physical.provider
            yield {
                "kind": "node",
                "label": label,
                "mode": _mode_of(physical),
                "capabilities": getattr(provider, "capabilities", None) if provider is not None else None,
            }
        for rel_type, by_endpoints in list(db.relationships.items()):
            for rel in list(by_endpoints.values()):
                provider = rel.provider
                yield {
                    "kind": "relationship",
                    "type": rel_type,
                    "from_label": rel.source.label if rel.source is not None else None,
                    "to_label": rel.target.label if rel.target is not None else None,
                    "mode": _mode_of(rel),
                    "capabilities": getattr(provider, "capabilities", None) if provider is not None else None,
                }
        ctx = self.source_context
        graph = ctx.graph if ctx is not None else db.default_graph
        if graph is not None:
            yield {
                "kind": "graph",
                "function": graph.name,
                "mode": "graph",
                "capabilities": graph.capabilities,
            }
