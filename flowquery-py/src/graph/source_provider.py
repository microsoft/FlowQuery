"""Public contract for backend-aware virtual source providers.

A provider is any object exposing a ``capabilities`` dict attribute and the
methods ``scan(request, context)`` and, optionally, ``lookup(request, context)``
(node providers), ``expand(request, context)`` (relationship providers),
``estimate(request)`` (node providers), ``open_read_context()`` and
``close_read_context(snapshot)``.

Request and capability dictionaries use the same camelCase keys as the
TypeScript implementation (``pageSize``, ``sourceLabel``, ``maxBatchSize``,
``stringOrdering`` ...), so providers observe an identical envelope.

A provider method may return a list of rows, an awaitable resolving to a list
of rows, a synchronous iterable of pages (lists of rows) or an asynchronous
iterable of pages.

The ``context`` argument is a :class:`SourceReadContext` with a ``signal``
attribute (a :class:`SourceSignal`, exposing ``aborted``, ``reason`` and
``is_set()``) and the ``snapshot`` returned by ``open_read_context()``.
"""

from __future__ import annotations

import json
import math
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import (
    Any,
    AsyncGenerator,
    AsyncIterable,
    Awaitable,
    Callable,
    Dict,
    Iterable,
    List,
    Optional,
    Protocol,
    Union,
    runtime_checkable,
)

SOURCE_CONTRACT_VERSION = 1

PREDICATE_OPERATORS: List[str] = ["eq", "gt", "gte", "lt", "lte", "in"]

#: Accepted ``predicates.stringOrdering`` values.  Python compares ``str``
#: by code point, so ``"binary"`` and ``"codepoint"`` are equivalent here.
STRING_ORDERINGS: List[str] = ["binary", "codepoint"]

SourceRow = Dict[str, Any]
SourcePredicate = Dict[str, Any]

#: Anything a provider method may return.
SourceResult = Union[
    List[SourceRow],
    Awaitable[List[SourceRow]],
    Iterable[List[SourceRow]],
    AsyncIterable[List[SourceRow]],
]


def _to_camel(key: str) -> str:
    head, *rest = key.split("_")
    return head + "".join(part[:1].upper() + part[1:] for part in rest)


class SourceRequest(Dict[str, Any]):
    """Request envelope passed to provider methods.

    A plain ``dict`` with the camelCase keys shared with TypeScript
    (``request["pageSize"]``), which also accepts snake_case keys
    (``request["page_size"]``, ``request.get("source_label")``) and
    attribute access (``request.ids``, ``request.page_size``).
    """

    def __missing__(self, key: Any) -> Any:
        if isinstance(key, str) and "_" in key:
            camel = _to_camel(key)
            if camel in self:
                return dict.__getitem__(self, camel)
        raise KeyError(key)

    def get(self, key: Any, default: Any = None) -> Any:
        try:
            return self[key]
        except KeyError:
            return default

    def __contains__(self, key: Any) -> bool:
        if dict.__contains__(self, key):
            return True
        return isinstance(key, str) and "_" in key and dict.__contains__(self, _to_camel(key))

    def __getattr__(self, name: str) -> Any:
        if name.startswith("__"):
            raise AttributeError(name)
        try:
            return self[name]
        except KeyError:
            raise AttributeError(name) from None


def normalize_capabilities(caps: Any) -> Any:
    """Returns ``caps`` with snake_case keys (``max_batch_size``,
    ``string_ordering`` ...) converted to their camelCase names.  An
    explicit camelCase key wins over its snake_case alias."""
    if not isinstance(caps, dict):
        return caps
    out: Dict[str, Any] = {}
    for key, value in caps.items():
        camel = _to_camel(key) if isinstance(key, str) else key
        if isinstance(value, dict):
            value = normalize_capabilities(value)
        if camel != key and camel in caps:
            continue
        out[camel] = value
    return out


class SourceSignal:
    """Cancellation signal handed to providers (mirrors an AbortSignal).

    Check ``signal.aborted`` (or ``signal.is_set()``) to detect cancellation and
    ``await signal.wait()`` to block until the query is cancelled or finished.
    """

    def __init__(self) -> None:
        import asyncio

        self._event = asyncio.Event()
        self.reason: Optional[BaseException] = None
        self._listeners: List[Callable[[], None]] = []

    @property
    def aborted(self) -> bool:
        return self._event.is_set()

    def is_set(self) -> bool:
        return self._event.is_set()

    async def wait(self) -> None:
        await self._event.wait()

    def add_listener(self, listener: Callable[[], None]) -> None:
        self._listeners.append(listener)

    def remove_listener(self, listener: Callable[[], None]) -> None:
        if listener in self._listeners:
            self._listeners.remove(listener)

    def abort(self, reason: BaseException) -> None:
        if self._event.is_set():
            return
        self.reason = reason
        self._event.set()
        for listener in list(self._listeners):
            listener()


@dataclass
class SourceReadContext:
    """Per-query read context passed to provider methods."""

    signal: SourceSignal
    snapshot: Any = None
    _owner: Any = field(default=None, repr=False, compare=False)


class SourceError(Exception):
    def __init__(
        self,
        message: str,
        source: str = "",
        operation: str = "",
        cause: Optional[BaseException] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.source = source
        self.operation = operation
        self.cause = cause
        if cause is not None:
            self.__cause__ = cause


class SourceCapabilityError(SourceError):
    def __init__(self, message: str, source: str = "") -> None:
        super().__init__(message, source, "register")


class SourceResponseError(SourceError):
    def __init__(self, message: str, source: str = "", operation: str = "") -> None:
        super().__init__(message, source, operation)


class SourceUnsupportedError(SourceError):
    def __init__(
        self,
        message: str = "Operation not supported",
        source: str = "",
        operation: str = "",
    ) -> None:
        super().__init__(message, source, operation)


class QueryCancelledError(Exception):
    def __init__(self, message: str = "Query cancelled") -> None:
        super().__init__(message)
        self.message = message


def _json(value: Any) -> str:
    try:
        return json.dumps(value)
    except (TypeError, ValueError):
        return str(value)


def _is_int(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def _validate_base(caps: Any, name: str) -> None:
    if not isinstance(caps, dict):
        raise SourceCapabilityError(f"Source {name}: capabilities object is required", name)
    version = caps.get("version")
    if not _is_int(version) or version != SOURCE_CONTRACT_VERSION:
        raise SourceCapabilityError(
            f"Source {name}: unsupported capability version {_json(version) if 'version' in caps else 'undefined'}; "
            f"expected {SOURCE_CONTRACT_VERSION}",
            name,
        )
    if "maxBatchSize" in caps and caps["maxBatchSize"] is not None:
        mbs = caps["maxBatchSize"]
        integral = _is_int(mbs) or (isinstance(mbs, float) and math.isfinite(mbs) and mbs.is_integer())
        if not integral or mbs < 1:
            raise SourceCapabilityError(f"Source {name}: maxBatchSize must be a positive integer", name)
    if "predicates" in caps and caps["predicates"] is not None:
        p = caps["predicates"]
        if not isinstance(p, dict) or not isinstance(p.get("operators"), list):
            raise SourceCapabilityError(f"Source {name}: predicates.operators must be an array", name)
        for op in p["operators"]:
            if op not in PREDICATE_OPERATORS:
                raise SourceCapabilityError(
                    f"Source {name}: unknown predicate operator {_json(op)}; "
                    f"supported: {', '.join(PREDICATE_OPERATORS)}",
                    name,
                )
        if p.get("properties") is not None and not isinstance(p.get("properties"), list):
            raise SourceCapabilityError(
                f"Source {name}: predicates.properties must be an array of column names", name
            )
        if p.get("stringOrdering") is not None and p.get("stringOrdering") not in STRING_ORDERINGS:
            raise SourceCapabilityError(
                f'Source {name}: predicates.stringOrdering must be "binary" or "codepoint" when set',
                name,
            )


def _has_method(provider: Any, method: str) -> bool:
    return callable(getattr(provider, method, None))


def validate_node_provider(provider: Any, name: str) -> None:
    if provider is None or isinstance(provider, (str, int, float, bool, list, tuple)):
        raise SourceCapabilityError(f"Source {name}: provider object is required", name)
    caps: Any = normalize_capabilities(getattr(provider, "capabilities", None))
    _validate_base(caps, name)
    if not _has_method(provider, "scan"):
        raise SourceCapabilityError(f"Source {name}: provider must implement scan()", name)
    if caps.get("lookup") and not _has_method(provider, "lookup"):
        raise SourceCapabilityError(
            f"Source {name}: capabilities.lookup is true but lookup() is not implemented", name
        )


def validate_relationship_provider(provider: Any, name: str) -> None:
    if provider is None or isinstance(provider, (str, int, float, bool, list, tuple)):
        raise SourceCapabilityError(f"Source {name}: provider object is required", name)
    caps: Any = normalize_capabilities(getattr(provider, "capabilities", None))
    _validate_base(caps, name)
    if not _has_method(provider, "scan"):
        raise SourceCapabilityError(f"Source {name}: provider must implement scan()", name)
    if "expand" in caps:
        expand = caps["expand"]
        if not isinstance(expand, dict):
            raise SourceCapabilityError(
                f"Source {name}: capabilities.expand must be an object like {{ left: true, right: true }}",
                name,
            )
        if (expand.get("left") or expand.get("right")) and not _has_method(provider, "expand"):
            raise SourceCapabilityError(
                f"Source {name}: capabilities.expand is declared but expand() is not implemented",
                name,
            )


async def cursor_pages(
    fetch_page: Callable[[Optional[str]], Awaitable[Dict[str, Any]]],
) -> AsyncGenerator[List[SourceRow], None]:
    """Adapts a cursor-paginated fetch function into an async iterable of pages.

    ``fetch_page(cursor)`` must resolve to ``{"rows": [...], "cursor": next_or_None}``.
    """
    cursor: Optional[str] = None
    while True:
        page = await fetch_page(cursor)
        if not isinstance(page, dict) or not isinstance(page.get("rows"), list):
            raise SourceResponseError("Cursor page must be an object with a rows array")
        yield page["rows"]
        nxt = page.get("cursor")
        if nxt is None:
            return
        if nxt == cursor:
            raise SourceResponseError(f"Invalid continuation token: {nxt} repeated")
        cursor = nxt


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _same_primitive(a: Any, b: Any) -> bool:
    if _is_number(a):
        return _is_number(b)
    if isinstance(a, str):
        return isinstance(b, str)
    return False


def _is_range_comparable(value: Any, bound: Any) -> bool:
    if value is None:
        return False
    if not (_is_number(bound) or isinstance(bound, str)):
        return False
    return _same_primitive(value, bound)


def _matches_equality(row: SourceRow, prop: str, values: List[Any]) -> bool:
    if prop not in row:
        return False
    value = row[prop]
    if not (_is_number(value) or isinstance(value, str)):
        return True
    return any(_same_primitive(value, v) and value == v for v in values)


def matches_predicate(predicate: Optional[SourcePredicate], row: SourceRow) -> bool:
    """Evaluates a pushed predicate against a row, the way FlowQuery would."""
    if predicate is None:
        return True
    op = predicate.get("op")
    if op == "and":
        return all(matches_predicate(t, row) for t in predicate.get("terms", []))
    if op == "eq":
        return _matches_equality(row, predicate["property"], [predicate.get("value")])
    if op == "in":
        return _matches_equality(row, predicate["property"], list(predicate.get("values", [])))
    value: Any = row.get(predicate.get("property", ""))
    bound: Any = predicate.get("value")
    if not _is_range_comparable(value, bound):
        return True
    if op == "gt":
        return bool(value > bound)
    if op == "gte":
        return bool(value >= bound)
    if op == "lt":
        return bool(value < bound)
    if op == "lte":
        return bool(value <= bound)
    return True


@runtime_checkable
class SourceProvider(Protocol):
    """Structural type of any source provider (node or relationship).

    ``lookup`` (nodes), ``expand`` (relationships), ``open_read_context``
    and ``close_read_context`` are optional and therefore not part of the
    protocol; they are checked at registration against ``capabilities``.
    """

    capabilities: Dict[str, Any]

    def scan(self, request: SourceRequest, context: SourceReadContext) -> SourceResult: ...


def _complete_capabilities(cls: type, method: str, implied: Any) -> None:
    caps = cls.__dict__.get("capabilities")
    if caps is None:
        caps = dict(getattr(cls, "capabilities", None) or {})
    if not isinstance(caps, dict):
        return
    caps = normalize_capabilities(caps)
    caps.setdefault("version", SOURCE_CONTRACT_VERSION)
    if method in cls.__dict__ and method not in caps:
        caps[method] = implied
    cls.capabilities = caps  # type: ignore[attr-defined]


class NodeSource(ABC):
    """Convenience base class for node providers.

    Subclasses implement ``scan`` and may implement
    ``lookup(request, context)``.  ``capabilities`` may be omitted or
    partial: ``version`` defaults to the current contract version,
    snake_case keys are accepted, and ``lookup`` is declared automatically
    when the subclass defines ``lookup()``.

    Example::

        class People(NodeSource):
            capabilities = {"cacheable": True, "max_batch_size": 50}

            async def scan(self, request, context):
                return await api.people()

            async def lookup(self, request, context):
                return await api.people_by_ids(request.ids)
    """

    capabilities: Dict[str, Any] = {"version": SOURCE_CONTRACT_VERSION}

    def __init_subclass__(cls, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)
        _complete_capabilities(cls, "lookup", True)

    @abstractmethod
    def scan(self, request: SourceRequest, context: SourceReadContext) -> SourceResult:
        """Returns all rows (optionally pre-filtered by ``request.predicate``)."""


class RelationshipSource(ABC):
    """Convenience base class for relationship providers.

    Subclasses implement ``scan`` and may implement
    ``expand(request, context)``, which is then declared for both sides
    (``{"left": True, "right": True}``) unless ``capabilities`` says
    otherwise.  Rows carry ``left_id`` and ``right_id``.
    """

    capabilities: Dict[str, Any] = {"version": SOURCE_CONTRACT_VERSION}

    def __init_subclass__(cls, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)
        _complete_capabilities(cls, "expand", {"left": True, "right": True})

    @abstractmethod
    def scan(self, request: SourceRequest, context: SourceReadContext) -> SourceResult:
        """Returns all rows (optionally pre-filtered by ``request.predicate``)."""
