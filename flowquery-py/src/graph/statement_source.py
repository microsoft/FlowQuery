"""Adapter exposing ``CREATE VIRTUAL`` definitions as source providers."""

from __future__ import annotations

from contextlib import aclosing
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from .source_context import SourceContext, context_of

if TYPE_CHECKING:
    from .virtual_statement import VirtualStatement


class StatementSourceProvider:
    """Adapts a ``CREATE VIRTUAL`` definition to the source provider contract.

    The definition is opted in with explicit capabilities; every request
    runs the inner statement with ``$request`` bound to the request envelope
    (``operation``, ``label``/``type``, ``ids``, ``side``, ``predicate``,
    ``pageSize``) while ``$args`` keeps its legacy meaning.  Statements that
    ignore part of the request remain correct because FlowQuery re-checks
    every row.
    """

    def __init__(self, virtual: "VirtualStatement", capabilities: Dict[str, Any]) -> None:
        self._virtual = virtual
        self.capabilities = capabilities

    def _run(self, request: Dict[str, Any], context: Any) -> Any:
        return self._virtual.request(
            request, self.capabilities.get("streaming") is True, context_of(context)
        )

    def scan(self, request: Dict[str, Any], context: Any) -> Any:
        return self._run(request, context)

    def lookup(self, request: Dict[str, Any], context: Any) -> Any:
        return self._run(request, context)

    def expand(self, request: Dict[str, Any], context: Any) -> Any:
        return self._run(request, context)


async def materialize_scan(
    provider: Any,
    kind: str,
    name: str,
    base: Dict[str, Any],
    args: Optional[Dict[str, Any]],
    ctx: Optional[SourceContext],
) -> List[Dict[str, Any]]:
    """Fully read a provider's scan (legacy eager paths)."""
    context = ctx if ctx is not None else SourceContext()
    try:
        context.stats["materializations"] += 1
        rows: List[Dict[str, Any]] = []
        request = {
            "operation": "scan",
            **base,
            "predicate": None,
            "args": args,
            "pageSize": context.options.page_size,
        }
        async with aclosing(context.call(provider, "scan", name, kind, request)) as pages:
            async for page in pages:
                rows.extend(page)
        return rows
    finally:
        if ctx is None:
            await context.close()
