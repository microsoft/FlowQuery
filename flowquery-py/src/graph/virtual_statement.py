"""Execution of the FlowQuery statement behind a virtual definition.

Owns static caching, materialized execution and bounded streaming of the
terminal ``RETURN`` rows for statement-backed source providers.
"""

from __future__ import annotations

import asyncio
import time
from collections import deque
from typing import TYPE_CHECKING, Any, AsyncGenerator, AsyncIterator, Deque, Dict, List, Optional, Tuple, Union

from ..parsing.ast_node import ASTNode
from .source_provider import QueryCancelledError

if TYPE_CHECKING:
    from .source_context import SourceContext


class RowChannel:
    """Bounded page channel between a producing runner and a consumer."""

    def __init__(self, page_size: int, capacity: int = 2) -> None:
        self._page_size = max(1, page_size)
        self._capacity = capacity
        self._page: List[Dict[str, Any]] = []
        self._pages: Deque[List[Dict[str, Any]]] = deque()
        self._done = False
        self._error: Optional[BaseException] = None
        self._cancelled = False
        self._unbounded = False
        self._consumer = asyncio.Event()
        self._producer = asyncio.Event()

    async def push(self, row: Dict[str, Any]) -> None:
        if self._cancelled:
            raise QueryCancelledError("Source stream closed")
        self._page.append(row)
        if len(self._page) < self._page_size:
            return
        self._pages.append(self._page)
        self._page = []
        self._consumer.set()
        while (
            not self._unbounded
            and not self._cancelled
            and len(self._pages) >= self._capacity
        ):
            self._producer.clear()
            await self._producer.wait()
        if self._cancelled:
            raise QueryCancelledError("Source stream closed")

    def close(self) -> None:
        if self._page:
            self._pages.append(self._page)
            self._page = []
        self._done = True
        self._consumer.set()

    def fail(self, error: BaseException) -> None:
        self._error = error
        self._done = True
        self._consumer.set()

    def cancel(self, *_: Any) -> None:
        self._cancelled = True
        self._consumer.set()
        self._producer.set()

    def drain(self) -> None:
        self._unbounded = True
        self._producer.set()

    async def pages(self) -> AsyncGenerator[List[Dict[str, Any]], None]:
        while True:
            if self._pages:
                page = self._pages.popleft()
                self._producer.set()
                yield page
            elif self._done:
                err = self._error
                if err is not None and not (
                    self._cancelled and isinstance(err, QueryCancelledError)
                ):
                    raise err
                return
            else:
                self._consumer.clear()
                await self._consumer.wait()


class VirtualStatement:
    """The statement defining a virtual node or relationship."""

    def __init__(self) -> None:
        self._statement: Optional[ASTNode] = None
        self._is_static = False
        self._refresh_every_ms: Optional[int] = None
        self._cache: Optional[List[Dict[str, Any]]] = None
        self._cached_at = 0.0
        self._active: Optional[Tuple[RowChannel, "asyncio.Future[None]"]] = None

    @property
    def statement(self) -> Optional[ASTNode]:
        return self._statement

    @statement.setter
    def statement(self, value: Optional[ASTNode]) -> None:
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

    @property
    def streamable(self) -> bool:
        stmt = self._statement
        if stmt is None:
            return False
        try:
            last = stmt.last_child()
        except Exception:
            return False
        return (
            last is not None
            and hasattr(last, "set_row_sink")
            and getattr(last, "supports_row_sink", False) is True
        )

    async def data(
        self,
        args: Optional[Dict[str, Any]] = None,
        provenance: bool = False,
        source_context: Optional["SourceContext"] = None,
    ) -> List[Dict[str, Any]]:
        if self._statement is None:
            raise ValueError("Statement is null")
        cacheable = not provenance and args is None and self._is_static
        if cacheable and self._cache is not None:
            fresh = (
                self._refresh_every_ms is None
                or time.monotonic() * 1000 - self._cached_at < self._refresh_every_ms
            )
            if fresh:
                return self._cache
        result = await self._run_inner(args, provenance, source_context)
        if cacheable:
            self._cache = result
            self._cached_at = time.monotonic() * 1000
        return result

    async def _run_inner(
        self,
        args: Optional[Dict[str, Any]],
        provenance: bool,
        source_context: Optional["SourceContext"] = None,
        parameters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        from ..compute.runner import Runner, RunnerOptions

        await self._quiesce()
        if self._statement is None:
            raise ValueError("Statement is null")
        runner = Runner(
            ast=self._statement,
            args=args,
            options=RunnerOptions(
                provenance=provenance,
                parameters=parameters,
                inner_source_context=source_context,
            ),
        )
        await runner.run()
        result: List[Dict[str, Any]] = runner.results
        if provenance:
            from .virtual_sources import attach_virtual_source

            prov = runner.provenance
            if prov is not None:
                for i in range(min(len(prov), len(result))):
                    if isinstance(result[i], dict):
                        attach_virtual_source(result[i], prov[i])
        return result

    async def _quiesce(self) -> None:
        while self._active is not None:
            active = self._active
            channel, done = active
            channel.drain()
            await done
            if self._active is active:
                self._active = None

    def request(
        self,
        request: Dict[str, Any],
        streaming: bool,
        ctx: Optional["SourceContext"] = None,
    ) -> Union[Any, AsyncIterator[List[Dict[str, Any]]]]:
        """Run the statement for a provider request (exposed as ``$request``).

        Returns a coroutine resolving to all rows when not streaming, or an
        async generator of row pages when streaming is possible.
        """
        if self._statement is None:
            raise ValueError("Statement is null")
        parameters = {"request": request}
        if not streaming or not self.streamable:
            if ctx is not None:
                ctx.stats["materializations"] += 1
            return self._run_inner(request.get("args"), False, ctx, parameters)
        return self._stream(request, parameters, ctx)

    async def _stream(
        self,
        request: Dict[str, Any],
        parameters: Dict[str, Any],
        ctx: Optional["SourceContext"],
    ) -> AsyncGenerator[List[Dict[str, Any]], None]:
        from ..compute.runner import Runner, RunnerOptions

        await self._quiesce()
        channel = RowChannel(max(1, request.get("pageSize") or 256))
        runner = Runner(
            ast=self._statement,
            args=request.get("args"),
            options=RunnerOptions(
                parameters=parameters,
                row_sink=channel.push,
                inner_source_context=ctx,
            ),
        )

        async def produce() -> None:
            try:
                await runner.run()
                channel.close()
            except BaseException as e:  # noqa: BLE001
                channel.fail(e)

        done: "asyncio.Future[None]" = asyncio.ensure_future(produce())
        active = (channel, done)
        self._active = active
        if ctx is not None:
            ctx.signal.add_listener(channel.cancel)
        try:
            async for page in channel.pages():
                yield page
        finally:
            if ctx is not None:
                ctx.signal.remove_listener(channel.cancel)
            channel.cancel()
            await done
            if self._active is active:
                self._active = None
