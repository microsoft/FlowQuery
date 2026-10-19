"""``USE GRAPH`` / ``DROP GRAPH``: bind or clear the registry's default graph."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, List, Optional

from ...graph.database import Database
from ...graph.default_graph import DefaultGraph
from ..functions.async_function import AsyncFunction
from .definition_backend import DefinitionBackend, declared_capabilities, references_request
from .operation import Operation

if TYPE_CHECKING:
    from ...graph.source_context import SourceContext


class GraphBinding(Operation):
    """Base of the statements that change the registry's default graph."""

    def __init__(self) -> None:
        super().__init__()
        self._context: Optional["SourceContext"] = None

    @property
    def source_context(self) -> Optional["SourceContext"]:
        """Query context assigned by the runner (internal)."""
        return self._context

    @source_context.setter
    def source_context(self, ctx: Optional["SourceContext"]) -> None:
        self._context = ctx

    def bind(self, graph: Optional[DefaultGraph]) -> None:
        """Publish ``graph`` to the registry (queries started from now on) and
        to the running query (its later statements).  Queries already running
        keep the binding they pinned when they started."""
        Database.get_instance().default_graph = graph
        if self._context is not None:
            self._context.graph = graph
            # Routes resolved against the previous binding are stale.
            if self._context.writes is not None:
                self._context.writes.routes.clear()

    @property
    def results(self) -> List[Any]:
        return []


class UseGraph(GraphBinding):
    """``USE GRAPH fn($request, ...)``: bind ``fn`` as the default graph,
    replacing any previous binding.  Labels and relationship types without
    a ``CREATE VIRTUAL`` definition are then read and written through
    ``fn``.  The function's capabilities are inferred once, here."""

    def __init__(self, function: AsyncFunction) -> None:
        super().__init__()
        self._function = function
        self.add_child(function)

    @property
    def function(self) -> AsyncFunction:
        return self._function

    async def run(self) -> None:
        func = self._function
        request_index = next(
            (i for i, child in enumerate(func.get_children()) if references_request(child)), -1
        )
        if request_index < 0:
            raise ValueError(
                "USE GRAPH must pass $request to the backend function, "
                f"e.g. USE GRAPH {func.name}($request)"
            )
        declared = await declared_capabilities(
            DefinitionBackend(func, type(func), func.name, request_index),
            {"operation": "capabilities", "graph": True},
        )
        args = [
            None if i == request_index else child.value()
            for i, child in enumerate(func.get_children())
        ]
        self.bind(DefaultGraph(func.name, type(func), request_index, args, declared))
        if self.next:
            await self.next.run()


class DropGraph(GraphBinding):
    """``DROP GRAPH``: clear the default graph binding (no-op when none is bound)."""

    async def run(self) -> None:
        self.bind(None)
        if self.next:
            await self.next.run()
