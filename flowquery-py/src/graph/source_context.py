"""Per-query execution context for backend-aware virtual sources."""

from __future__ import annotations

import asyncio
import inspect
import json
import math
from collections import OrderedDict
from dataclasses import dataclass
from typing import Any, AsyncGenerator, Awaitable, Callable, Dict, List, Optional

from .source_provider import (
    QueryCancelledError,
    SourceError,
    SourceReadContext,
    SourceRequest,
    SourceResponseError,
    SourceRow,
    SourceSignal,
)
from .write_set import WriteSet


@dataclass
class SourceOptions:
    """Execution options for provider-backed virtual sources.

    ``signal`` may be an :class:`asyncio.Event`, a :class:`SourceSignal` or any
    object exposing an ``aborted`` attribute; setting/aborting it cancels the
    query, which then raises :class:`QueryCancelledError`.
    """

    page_size: Optional[float] = None
    max_batch_size: Optional[float] = None
    cache_capacity: Optional[float] = None
    max_prefetch_rows: Optional[float] = None
    reorder: Optional[bool] = None
    signal: Any = None


@dataclass
class ResolvedSourceOptions:
    page_size: int
    max_batch_size: int
    cache_capacity: float
    max_prefetch_rows: float
    reorder: bool


def _positive(value: Any, default: int) -> int:
    if (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
        and value >= 1
    ):
        return int(math.floor(value))
    return default


def _non_negative(value: Any, default: float) -> float:
    if isinstance(value, (int, float)) and not isinstance(value, bool) and not math.isnan(value):
        return max(0, value)
    return default


def resolve_options(options: Optional[SourceOptions]) -> ResolvedSourceOptions:
    o = options or SourceOptions()
    return ResolvedSourceOptions(
        page_size=_positive(o.page_size, 256),
        max_batch_size=_positive(o.max_batch_size, 100),
        cache_capacity=_non_negative(o.cache_capacity, 10000),
        max_prefetch_rows=_non_negative(o.max_prefetch_rows, 1024),
        reorder=o.reorder is not False,
    )


def empty_source_stats() -> Dict[str, Any]:
    return {
        "calls": {"scan": 0, "lookup": 0, "expand": 0},
        "pages": 0,
        "rows": 0,
        "cacheHits": 0,
        "cacheMisses": 0,
        "batches": 0,
        "materializations": 0,
        "fallbacks": 0,
        "cancellations": 0,
        "peakBufferedRows": 0,
        "plans": [],
    }


class _Undefined:
    pass


UNDEFINED = _Undefined()


def canonical_key(value: Any) -> str:
    """Type-tagged canonical key: ``1`` != ``"1"``, ``True`` != ``1``, ``1 == 1.0``."""
    if value is UNDEFINED:
        return "u"
    if value is None:
        return "z"
    if isinstance(value, bool):
        return "b:true" if value else "b:false"
    if isinstance(value, (int, float)):
        if isinstance(value, float):
            if math.isnan(value):
                return "n:NaN"
            if math.isinf(value):
                return "n:Infinity" if value > 0 else "n:-Infinity"
            if value.is_integer():
                return f"n:{int(value)}"
            return f"n:{value!r}"
        return f"n:{value}"
    if isinstance(value, str):
        return "s:" + json.dumps(value)
    if isinstance(value, (list, tuple)):
        return "[" + ",".join(canonical_key(v) for v in value) + "]"
    if isinstance(value, dict):
        return (
            "{"
            + ",".join(f"{json.dumps(str(k))}:{canonical_key(value[k])}" for k in sorted(value, key=str))
            + "}"
        )
    return "x:" + str(value)


class RowCache:
    """Weighted LRU cache of row lists."""

    def __init__(self, capacity: float) -> None:
        self.capacity = capacity
        self._entries: "OrderedDict[str, List[SourceRow]]" = OrderedDict()
        self._weight = 0

    def get(self, key: str) -> Optional[List[SourceRow]]:
        rows = self._entries.get(key)
        if rows is None:
            return None
        self._entries.move_to_end(key)
        return rows

    def set(self, key: str, rows: List[SourceRow]) -> None:
        weight = max(1, len(rows))
        if weight > self.capacity:
            return
        old = self._entries.pop(key, None)
        if old is not None:
            self._weight -= max(1, len(old))
        self._entries[key] = rows
        self._weight += weight
        while self._weight > self.capacity and self._entries:
            _, evicted = self._entries.popitem(last=False)
            self._weight -= max(1, len(evicted))

    def __len__(self) -> int:
        return len(self._entries)


def _is_async_iterable(value: Any) -> bool:
    return hasattr(value, "__aiter__")


def _is_sync_iterable(value: Any) -> bool:
    if isinstance(value, (str, bytes, dict)):
        return False
    return hasattr(value, "__iter__")


class SourceContext:
    """Per-query state shared by every source access of one run."""

    def __init__(self, options: Optional[SourceOptions] = None, provenance: bool = False) -> None:
        self.options = resolve_options(options)
        self.stats: Dict[str, Any] = empty_source_stats()
        self.provenance = provenance
        #: Top-level query parameters, visible to nested runs.
        self.parameters: Dict[str, Any] = {}
        #: Changes collected by write clauses; sent to the backend when the query succeeds.
        self.writes: Optional[WriteSet] = None
        self.signal = SourceSignal()
        self._cache = RowCache(self.options.cache_capacity)
        self._inflight: Dict[str, "asyncio.Future[Any]"] = {}
        self._materialized: Dict[str, "asyncio.Future[Any]"] = {}
        self._read_contexts: Dict[int, Dict[str, Any]] = {}
        self._closed = False
        self._external_cleanup: Optional[Callable[[], None]] = None
        external = options.signal if options is not None else None
        if external is not None:
            self._attach_external(external)

    def _attach_external(self, external: Any) -> None:
        if isinstance(external, asyncio.Event):
            if external.is_set():
                self.cancel("Query cancelled")
                return

            async def watch() -> None:
                await external.wait()
                self.cancel("Query cancelled")

            try:
                task = asyncio.get_running_loop().create_task(watch())
            except RuntimeError:
                return
            def stop_watching() -> None:
                task.cancel()

            self._external_cleanup = stop_watching
            return
        if getattr(external, "aborted", False):
            self.cancel(_reason_message(getattr(external, "reason", None)))
            return
        if isinstance(external, SourceSignal):

            def listener() -> None:
                self.cancel(_reason_message(external.reason))

            external.add_listener(listener)
            self._external_cleanup = lambda: external.remove_listener(listener)

    @property
    def cancelled(self) -> bool:
        return self.signal.aborted

    def cancel(self, reason: str = "Query cancelled") -> None:
        if self.signal.aborted:
            return
        self.stats["cancellations"] += 1
        self.signal.abort(QueryCancelledError(reason))

    def throw_if_cancelled(self) -> None:
        if self.signal.aborted:
            reason = self.signal.reason
            if isinstance(reason, QueryCancelledError):
                raise reason
            raise QueryCancelledError()

    async def race(self, awaitable: Awaitable[Any]) -> Any:
        self.throw_if_cancelled()
        task = asyncio.ensure_future(awaitable)
        waiter = asyncio.ensure_future(self.signal.wait())
        try:
            done, _ = await asyncio.wait({task, waiter}, return_when=asyncio.FIRST_COMPLETED)
        except BaseException:
            task.cancel()
            waiter.cancel()
            raise
        if task in done:
            waiter.cancel()
            return task.result()
        task.cancel()
        task.add_done_callback(_swallow)
        self.throw_if_cancelled()
        raise QueryCancelledError()

    def cache_get(self, key: str) -> Optional[List[SourceRow]]:
        if self.options.cache_capacity <= 0:
            return None
        rows = self._cache.get(key)
        if rows is None:
            self.stats["cacheMisses"] += 1
        else:
            self.stats["cacheHits"] += 1
        return rows

    def cache_set(self, key: str, rows: List[SourceRow]) -> None:
        if self.options.cache_capacity <= 0:
            return
        self._cache.set(key, rows)

    def clear_cache(self) -> None:
        """Drop cached and materialized reads (after the query wrote to a backend)."""
        self._cache = RowCache(self.options.cache_capacity)
        self._materialized.clear()

    async def coalesce(self, key: str, load: Callable[[], Awaitable[Any]]) -> Any:
        existing = self._inflight.get(key)
        if existing is None:
            existing = asyncio.ensure_future(load())
            self._inflight[key] = existing

            def done(_: Any) -> None:
                if self._inflight.get(key) is existing:
                    del self._inflight[key]

            existing.add_done_callback(done)
        return await asyncio.shield(existing)

    async def materialize(self, key: str, load: Callable[[], Awaitable[List[SourceRow]]]) -> List[SourceRow]:
        existing = self._materialized.get(key)
        if existing is None:
            self.stats["materializations"] += 1
            existing = asyncio.ensure_future(load())
            self._materialized[key] = existing

            def done(fut: "asyncio.Future[Any]") -> None:
                if fut.cancelled() or fut.exception() is not None:
                    if self._materialized.get(key) is fut:
                        del self._materialized[key]

            existing.add_done_callback(done)
        result: List[SourceRow] = await asyncio.shield(existing)
        return result

    def note_peak_buffered(self, n: int) -> None:
        if n > self.stats["peakBufferedRows"]:
            self.stats["peakBufferedRows"] = n

    async def read_context(self, provider: Any) -> SourceReadContext:
        if self._closed:
            raise SourceError("Query already finished; source reads are closed")
        key = id(provider)
        entry = self._read_contexts.get(key)
        if entry is None:
            entry = {"provider": provider, "snapshot": None, "future": None}
            self._read_contexts[key] = entry
            opener = getattr(provider, "open_read_context", None)
            if callable(opener):

                async def open_it() -> Any:
                    result = opener()
                    if inspect.isawaitable(result):
                        result = await result
                    return result

                entry["future"] = asyncio.ensure_future(open_it())
        future = entry["future"]
        if future is not None:
            # An opened context is reused as is, also by a cancelled query's rollback.
            if future.done() and not future.cancelled() and future.exception() is None:
                entry["snapshot"] = future.result()
            else:
                entry["snapshot"] = await self.race(asyncio.shield(future))
        return SourceReadContext(signal=self.signal, snapshot=entry["snapshot"], _owner=self)

    async def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        if self._external_cleanup is not None:
            self._external_cleanup()
            self._external_cleanup = None
        self.signal.abort(QueryCancelledError("Query finished"))
        first_error: Optional[BaseException] = None
        for entry in self._read_contexts.values():
            provider = entry["provider"]
            closer = getattr(provider, "close_read_context", None)
            future = entry["future"]
            if future is not None and not future.done():
                future.cancel()
                continue
            if future is not None and (future.cancelled() or future.exception() is not None):
                continue
            if not callable(closer):
                continue
            snapshot = future.result() if future is not None else None
            try:
                result = closer(snapshot)
                if inspect.isawaitable(result):
                    await result
            except Exception as e:  # noqa: BLE001
                if first_error is None:
                    first_error = e
        if first_error is not None:
            raise first_error

    def _wrap(self, error: BaseException, name: str, op: str) -> BaseException:
        if isinstance(error, (SourceError, QueryCancelledError)):
            return error
        if isinstance(error, Exception):
            return SourceError(f"Source {name}: {op}() failed: {error}", name, op, error)
        return error

    def _page(self, page: Any, name: str, op: str, kind: str) -> List[SourceRow]:
        self.throw_if_cancelled()
        if not isinstance(page, list):
            raise SourceResponseError(
                f"Source {name}: {op}() produced a page that is not an array", name, op
            )
        for row in page:
            if not isinstance(row, dict):
                raise SourceResponseError(
                    f"Source {name}: {op}() returned a row that is not an object", name, op
                )
            if kind == "node":
                if "id" not in row:
                    raise SourceResponseError(
                        f"Source {name}: {op}() returned a row without id", name, op
                    )
            elif "left_id" not in row or "right_id" not in row:
                raise SourceResponseError(
                    f"Source {name}: {op}() returned a row without left_id/right_id", name, op
                )
        self.stats["pages"] += 1
        self.stats["rows"] += len(page)
        return page

    async def call(
        self, provider: Any, op: str, name: str, kind: str, request: Dict[str, Any]
    ) -> AsyncGenerator[List[SourceRow], None]:
        """Invokes a provider operation and yields validated pages."""
        self.throw_if_cancelled()
        rc = await self.read_context(provider)
        self.stats["calls"][op] += 1
        try:
            result = getattr(provider, op)(SourceRequest({"version": 1, **request}), rc)
        except Exception as e:
            raise self._wrap(e, name, op) from e
        if isinstance(result, list):
            yield self._page(result, name, op, kind)
            return
        if inspect.isawaitable(result):
            try:
                page = await self.race(result)
            except Exception as e:
                raise self._wrap(e, name, op) from e
            yield self._page(page, name, op, kind)
            return
        if _is_async_iterable(result):
            iterator = result.__aiter__()
            try:
                while True:
                    try:
                        page = await self.race(iterator.__anext__())
                    except StopAsyncIteration:
                        return
                    except Exception as e:
                        raise self._wrap(e, name, op) from e
                    yield self._page(page, name, op, kind)
            finally:
                aclose = getattr(iterator, "aclose", None)
                if callable(aclose):
                    if not self.cancelled:
                        try:
                            await aclose()
                        except Exception:  # noqa: BLE001
                            pass
                    else:
                        # A cancelled provider may be suspended in its own await;
                        # never block cancellation on its cleanup.
                        try:
                            fut = asyncio.ensure_future(aclose())
                            fut.add_done_callback(_swallow)
                        except Exception:  # noqa: BLE001
                            pass
            return
        if _is_sync_iterable(result):
            iterator = iter(result)
            while True:
                self.throw_if_cancelled()
                try:
                    page = next(iterator)
                except StopIteration:
                    return
                except Exception as e:
                    raise self._wrap(e, name, op) from e
                yield self._page(page, name, op, kind)
        raise SourceResponseError(
            f"Source {name}: {op}() must return an array, a promise of an array, "
            "or an (async) iterable of arrays",
            name,
            op,
        )


def _swallow(fut: "asyncio.Future[Any]") -> None:
    if not fut.cancelled():
        fut.exception()


def _reason_message(reason: Any) -> str:
    if isinstance(reason, BaseException):
        return str(reason) or "Query cancelled"
    if isinstance(reason, str):
        return reason
    return "Query cancelled"


def context_of(read_context: Any) -> Optional[SourceContext]:
    owner = getattr(read_context, "_owner", None)
    return owner if isinstance(owner, SourceContext) else None
