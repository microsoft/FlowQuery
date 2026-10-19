"""Represents an async data provider function call for use in LOAD operations."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, AsyncGenerator, Dict, List, Optional

from ..ast_node import ASTNode
from .function import Function

if TYPE_CHECKING:
    from ...graph.source_context import SourceContext
    from ...graph.source_provider import SourceSignal


@dataclass
class FunctionContext:
    """Query-scoped context visible to an async function as ``self.context``
    while it runs (also inside ``CREATE VIRTUAL`` definition bodies)."""

    #: Aborted when the query is cancelled or finishes.
    signal: "SourceSignal"
    #: Value returned by the function class's ``open_read_context()`` hook,
    #: opened once per query and shared by every call of the function in
    #: that query (``None`` when the hook is absent).
    snapshot: Any
    #: The query's source counters; functions may add to them.
    stats: Dict[str, Any]


class AsyncFunction(Function):
    """Represents an async data provider function call for use in LOAD operations.

    This class holds the function name and arguments, and provides async iteration
    over the results from a registered async data provider.

    Subclasses may declare ``open_read_context()`` /
    ``close_read_context(snapshot)`` hooks as static or class methods: the
    first is called once per query before the function's first call and
    its result is exposed as ``self.context.snapshot``; the second is called
    once when the query ends, including on error or cancellation.

    Example:
        # Used in: LOAD JSON FROM myDataSource('arg1', 'arg2') AS data
        async_func = AsyncFunction("myDataSource")
        async_func.parameters = [arg1_node, arg2_node]
        async for item in async_func.execute():
            print(item)
    """

    _source_context: Optional["SourceContext"] = None
    _context: Optional[FunctionContext] = None

    @property
    def parameters(self) -> List[ASTNode]:
        return self.children

    @parameters.setter
    def parameters(self, nodes: List[ASTNode]) -> None:
        """Sets the function parameters.

        Args:
            nodes: Array of AST nodes representing the function arguments
        """
        self.children = nodes

    @property
    def source_context(self) -> Optional["SourceContext"]:
        """Query context assigned by the runner (internal)."""
        return self._source_context

    @source_context.setter
    def source_context(self, ctx: Optional["SourceContext"]) -> None:
        self._source_context = ctx
        self._context = None

    @property
    def context(self) -> Optional[FunctionContext]:
        """Query-scoped context (``signal``, ``snapshot``, ``stats``) of the
        running query, or ``None`` when the function is called outside a query."""
        return self._context

    async def prepare_context(self) -> None:
        """Opens the class's read context for this query (once) and exposes
        the query's signal, snapshot and stats as ``self.context`` (internal)."""
        ctx = self._source_context
        if ctx is None:
            self._context = None
            return
        ctx.throw_if_cancelled()
        read_context = await ctx.read_context(type(self))
        self._context = FunctionContext(
            signal=read_context.signal,
            snapshot=read_context.snapshot,
            stats=ctx.stats,
        )

    def get_arguments(self) -> List[Any]:
        """Evaluates all parameters and returns their values.
        Used by the framework to pass arguments to generate().

        Returns:
            Array of parameter values
        """
        return [child.value() for child in self.children]

    async def generate(self, *args: Any) -> AsyncGenerator[Any, None]:
        """Generates the async data provider function results.

        Subclasses override this method with their own typed parameters.
        The framework automatically evaluates the AST children and spreads
        them as arguments when calling this method.

        Args:
            args: Arguments passed from the query (e.g., myFunc(arg1, arg2))

        Yields:
            Data items from the async provider

        Raises:
            NotImplementedError: If the function is not registered as an async provider
        """
        raise NotImplementedError("generate method must be overridden in subclasses.")
        # Note: yield is here only to make this a generator function
        # It will never be reached due to the raise above
        if False:  # pragma: no cover
            yield  # Make this a generator
