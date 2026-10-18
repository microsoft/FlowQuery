"""Source access adapters: provider-backed (deferred) and in-memory (legacy)."""

from __future__ import annotations

import math
import weakref
from contextlib import aclosing
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple

from .source_context import SourceContext, canonical_key
from .source_provider import SourceRow, SourceUnsupportedError

PushTerm = Dict[str, Any]
PushedPredicate = Dict[str, Any]
SourceTerms = Tuple[List[PushTerm], Optional[Dict[str, Any]]]


def is_static_expression(node: Any) -> bool:
    """True when an expression does not depend on per-row bindings."""
    from ..parsing.data_structures.list_comprehension import ListComprehension
    from ..parsing.expressions.binding_reference import BindingReference
    from ..parsing.expressions.reference import Reference
    from ..parsing.functions.function import Function

    if isinstance(node, (Reference, BindingReference, Function, ListComprehension)):
        return False
    if callable(getattr(node, "evaluate", None)):
        return False
    children = node.get_children() if callable(getattr(node, "get_children", None)) else []
    return all(is_static_expression(child) for child in children)


def build_terms(properties: Any, pushed: List[PushedPredicate]) -> SourceTerms:
    terms: List[PushTerm] = []
    args: Optional[Dict[str, Any]] = None
    items = properties.items() if properties is not None else []
    for key, expr in items:
        if not is_static_expression(expr):
            continue
        value = expr.value()
        if args is None:
            args = {}
        args[key] = value
        terms.append({"op": "eq", "property": key, "value": value})
    for p in pushed:
        value = p["expression"].value()
        if p["op"] == "in":
            if isinstance(value, list):
                terms.append({"op": "in", "property": p["property"], "values": value})
        else:
            terms.append({"op": p["op"], "property": p["property"], "value": value})
    return terms, args


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def is_pushable_primitive(value: Any) -> bool:
    if isinstance(value, str):
        return True
    return _is_number(value) and math.isfinite(value)


def to_predicate(caps: Optional[Dict[str, Any]], term: PushTerm) -> Optional[Dict[str, Any]]:
    if caps is None:
        return None
    op = term["op"]
    if op not in (caps.get("operators") or []):
        return None
    properties = caps.get("properties")
    if properties is not None and term["property"] not in properties:
        return None
    if op == "eq":
        value: Any = term.get("value")
        if not is_pushable_primitive(value):
            return None
        return {"op": "eq", "property": term["property"], "value": value}
    if op == "in":
        values = term.get("values")
        if not isinstance(values, list) or not all(is_pushable_primitive(v) for v in values):
            return None
        seen = set()
        unique: List[Any] = []
        for v in values:
            k = canonical_key(v)
            if k not in seen:
                seen.add(k)
                unique.append(v)
        return {"op": "in", "property": term["property"], "values": unique}
    value = term.get("value")
    if _is_number(value) and math.isfinite(value):
        return {"op": op, "property": term["property"], "value": value}
    if isinstance(value, str) and caps.get("stringOrdering") == "binary":
        return {"op": op, "property": term["property"], "value": value}
    return None


def combine(predicates: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not predicates:
        return None
    if len(predicates) == 1:
        return predicates[0]
    return {"op": "and", "terms": predicates}


def predicate_for(caps: Optional[Dict[str, Any]], terms: List[PushTerm]) -> Optional[Dict[str, Any]]:
    preds = [p for p in (to_predicate(caps, t) for t in terms) if p is not None]
    return combine(preds)


def supports_key_in(caps: Optional[Dict[str, Any]], field: str) -> bool:
    if caps is None or "in" not in (caps.get("operators") or []):
        return False
    properties = caps.get("properties")
    return properties is None or field in properties


_provider_ids: "weakref.WeakKeyDictionary[Any, int]" = weakref.WeakKeyDictionary()
_provider_ids_fallback: Dict[int, Tuple[Any, int]] = {}
_next_provider_id = 0


def provider_key(provider: Any) -> int:
    global _next_provider_id
    try:
        existing = _provider_ids.get(provider)
        if existing is None:
            _next_provider_id += 1
            existing = _next_provider_id
            _provider_ids[provider] = existing
        return existing
    except TypeError:
        entry = _provider_ids_fallback.get(id(provider))
        if entry is None or entry[0] is not provider:
            _next_provider_id += 1
            entry = (provider, _next_provider_id)
            _provider_ids_fallback[id(provider)] = entry
        return entry[1]


def chunk(values: List[Any], size: int) -> List[List[Any]]:
    size = max(1, int(size))
    return [values[i : i + size] for i in range(0, len(values), size)]


def distinct(values: List[Any]) -> List[Any]:
    seen = set()
    result: List[Any] = []
    for v in values:
        if v is None:
            continue
        k = canonical_key(v)
        if k not in seen:
            seen.add(k)
            result.append(v)
    return result


def index_rows(rows: List[SourceRow], field: str) -> Dict[str, List[SourceRow]]:
    index: Dict[str, List[SourceRow]] = {}
    for row in rows:
        if field not in row:
            continue
        index.setdefault(canonical_key(row[field]), []).append(row)
    return index


class SourceEntry:
    """One registered provider for a label or relationship type."""

    kind = "node"

    def __init__(self, ctx: SourceContext, provider: Any, name: str) -> None:
        self.ctx = ctx
        self.provider = provider
        self.name = name
        self._unsupported: set[str] = set()
        self.caps: Dict[str, Any] = getattr(provider, "capabilities", None) or {}
        max_batch: Any = self.caps.get("maxBatchSize")
        limit: float = max_batch if _is_number(max_batch) else math.inf
        self.batch_size = int(min(ctx.options.max_batch_size, limit))
        self.cacheable = self.caps.get("cacheable") is True

    def base(self) -> Dict[str, Any]:
        return {}

    def enrich(self, row: SourceRow) -> SourceRow:
        return row

    def cache_key(self, op: str, pred: Any, args: Any, extra: Any) -> str:
        return "|".join(
            [
                self.kind,
                str(provider_key(self.provider)),
                self.name,
                op,
                canonical_key(pred),
                canonical_key(args),
                canonical_key(extra),
            ]
        )

    def predicate(self, terms: List[PushTerm]) -> Optional[Dict[str, Any]]:
        return predicate_for(self.caps.get("predicates"), terms)

    def pushes(self, terms: List[PushTerm]) -> bool:
        return self.predicate(terms) is not None

    async def scan(
        self, terms: List[PushTerm], args: Optional[Dict[str, Any]]
    ) -> AsyncGenerator[List[SourceRow], None]:
        async with aclosing(self.scan_with(self.predicate(terms), args)) as pages:
            async for page in pages:
                yield page

    async def scan_with(
        self, predicate: Optional[Dict[str, Any]], args: Optional[Dict[str, Any]]
    ) -> AsyncGenerator[List[SourceRow], None]:
        key = self.cache_key("scan", predicate, args, None)
        if self.cacheable:
            cached = self.ctx.cache_get(key)
            if cached is not None:
                yield cached
                return
        collected: List[SourceRow] = []
        overflow = False
        request = {
            "operation": "scan",
            **self.base(),
            "predicate": predicate,
            "args": args,
            "pageSize": self.ctx.options.page_size,
        }
        async with aclosing(self.ctx.call(self.provider, "scan", self.name, self.kind, request)) as pages:
            async for raw in pages:
                page = [self.enrich(r) for r in raw]
                if self.cacheable and not overflow:
                    collected.extend(page)
                    if len(collected) > self.ctx.options.cache_capacity:
                        overflow = True
                        collected = []
                yield page
        if self.cacheable and not overflow:
            self.ctx.cache_set(key, collected)

    async def materialize_all(self, args: Optional[Dict[str, Any]]) -> List[SourceRow]:
        async def load() -> List[SourceRow]:
            rows: List[SourceRow] = []
            async with aclosing(self.scan_with(None, args)) as pages:
                async for page in pages:
                    rows.extend(page)
            return rows

        return await self.ctx.materialize(self.cache_key("materialize", None, args, None), load)

    async def fetch_keyed(
        self,
        operation: str,
        native: bool,
        field: str,
        ids: List[Any],
        terms: List[PushTerm],
        args: Optional[Dict[str, Any]],
        extra: Dict[str, Any],
        max_rows: float = math.inf,
    ) -> Optional[Dict[str, List[SourceRow]]]:
        predicate = self.predicate(terms)
        result: Dict[str, List[SourceRow]] = {}
        pending: List[Any] = []
        for id_ in ids:
            k = canonical_key(id_)
            if k in result:
                continue
            if self.cacheable:
                cached = self.ctx.cache_get(self.cache_key(operation, predicate, args, {**extra, "id": id_}))
                if cached is not None:
                    result[k] = list(cached)
                    continue
            result[k] = []
            pending.append(id_)
        wanted = {canonical_key(i) for i in pending}
        total = sum(len(v) for v in result.values())

        def add(row: SourceRow) -> bool:
            nonlocal total
            k = canonical_key(row.get(field)) if field in row else None
            if k is None or k not in wanted:
                return True
            result[k].append(row)
            total += 1
            return total <= max_rows

        if pending and total > max_rows:
            return None
        if pending:
            if native and operation not in self._unsupported:
                try:
                    for batch in chunk(pending, self.batch_size):
                        self.ctx.stats["batches"] += 1
                        request = {
                            "operation": operation,
                            **self.base(),
                            **extra,
                            "ids": batch,
                            "predicate": predicate,
                            "args": args,
                            "pageSize": self.ctx.options.page_size,
                        }
                        async with aclosing(
                            self.ctx.call(self.provider, operation, self.name, self.kind, request)
                        ) as pages:
                            async for raw in pages:
                                for r in raw:
                                    if not add(self.enrich(r)):
                                        return None
                                self.ctx.note_peak_buffered(total)
                except SourceUnsupportedError:
                    if total != 0:
                        raise
                    self._unsupported.add(operation)
                    return await self.fetch_keyed(
                        operation, False, field, ids, terms, args, extra, max_rows
                    )
            else:
                self.ctx.stats["fallbacks"] += 1
                if supports_key_in(self.caps.get("predicates"), field):
                    for batch in chunk(pending, self.batch_size):
                        self.ctx.stats["batches"] += 1
                        parts: List[Dict[str, Any]] = []
                        if predicate is not None:
                            parts.append(predicate)
                        parts.append({"op": "in", "property": field, "values": batch})
                        async with aclosing(self.scan_with(combine(parts), args)) as pages:
                            async for page in pages:
                                for r in page:
                                    if not add(r):
                                        return None
                else:
                    index = index_rows(await self.materialize_all(args), field)
                    for id_ in pending:
                        k = canonical_key(id_)
                        rows = index.get(k, [])
                        result[k] = list(rows)
                        total += len(rows)
                    if total > max_rows:
                        return None
            if self.cacheable:
                for id_ in pending:
                    self.ctx.cache_set(
                        self.cache_key(operation, predicate, args, {**extra, "id": id_}),
                        result[canonical_key(id_)],
                    )
        return result


class NodeEntry(SourceEntry):
    kind = "node"

    def __init__(self, ctx: SourceContext, provider: Any, label: str) -> None:
        super().__init__(ctx, provider, label)
        self.label = label

    def base(self) -> Dict[str, Any]:
        return {"label": self.label}

    def enrich(self, row: SourceRow) -> SourceRow:
        return {**row, "_label": self.label}

    @property
    def native_lookup(self) -> bool:
        return self.caps.get("lookup") is True

    async def lookup(
        self, ids: List[Any], terms: List[PushTerm], args: Optional[Dict[str, Any]]
    ) -> Dict[str, List[SourceRow]]:
        rows = await self.fetch_keyed("lookup", self.native_lookup, "id", ids, terms, args, {})
        return rows or {}

    def estimate(self, terms: List[PushTerm], args: Optional[Dict[str, Any]]) -> Optional[float]:
        estimator = getattr(self.provider, "estimate", None)
        if not callable(estimator):
            return None
        result = estimator(
            {
                "version": 1,
                "operation": "scan",
                "label": self.label,
                "predicate": self.predicate(terms),
                "args": args,
                "pageSize": self.ctx.options.page_size,
            }
        )
        return result if _is_number(result) else None


class RelationshipEntry(SourceEntry):
    kind = "relationship"

    def __init__(
        self,
        ctx: SourceContext,
        provider: Any,
        type_: str,
        source_label: Optional[str],
        target_label: Optional[str],
    ) -> None:
        super().__init__(
            ctx, provider, f"(:{source_label or ''})-[:{type_}]->(:{target_label or ''})"
        )
        self.type = type_
        self.source_label = source_label
        self.target_label = target_label

    def base(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "sourceLabel": self.source_label,
            "targetLabel": self.target_label,
        }

    def enrich(self, row: SourceRow) -> SourceRow:
        return {**row, "_type": self.type}

    def native_expand(self, side: str) -> bool:
        expand = self.caps.get("expand") or {}
        return isinstance(expand, dict) and expand.get(side) is True

    async def expand_batch(
        self,
        side: str,
        ids: List[Any],
        terms: List[PushTerm],
        args: Optional[Dict[str, Any]],
        max_rows: float,
    ) -> Optional[Dict[str, List[SourceRow]]]:
        return await self.fetch_keyed(
            "expand", self.native_expand(side), f"{side}_id", ids, terms, args, {"side": side}, max_rows
        )

    async def expand_one(
        self, side: str, id_: Any, terms: List[PushTerm], args: Optional[Dict[str, Any]]
    ) -> AsyncGenerator[List[SourceRow], None]:
        field = f"{side}_id"
        predicate = self.predicate(terms)
        key = self.cache_key("expand", predicate, args, {"side": side, "id": id_})
        if self.cacheable:
            cached = self.ctx.cache_get(key)
            if cached is not None:
                yield cached
                return
        if not self.native_expand(side) or "expand" in self._unsupported:
            rows = await self.fetch_keyed("expand", False, field, [id_], terms, args, {"side": side})
            yield (rows or {}).get(canonical_key(id_), [])
            return
        wanted = canonical_key(id_)
        collected: List[SourceRow] = []
        overflow = False
        yielded = False
        request = {
            "operation": "expand",
            **self.base(),
            "side": side,
            "ids": [id_],
            "predicate": predicate,
            "args": args,
            "pageSize": self.ctx.options.page_size,
        }
        try:
            async with aclosing(
                self.ctx.call(self.provider, "expand", self.name, self.kind, request)
            ) as pages:
                async for raw in pages:
                    page = [
                        self.enrich(r)
                        for r in raw
                        if field in r and canonical_key(r[field]) == wanted
                    ]
                    if self.cacheable and not overflow:
                        collected.extend(page)
                        if len(collected) > self.ctx.options.cache_capacity:
                            overflow = True
                            collected = []
                    yielded = True
                    yield page
        except SourceUnsupportedError:
            if yielded:
                raise
            self._unsupported.add("expand")
            async with aclosing(self.expand_one(side, id_, terms, args)) as pages:
                async for page in pages:
                    yield page
            return
        if self.cacheable and not overflow:
            self.ctx.cache_set(key, collected)


class NodeSourceAccess:
    """Deferred, provider-backed node access for one label."""

    deferred = True

    def __init__(self, ctx: SourceContext, entries: List[Dict[str, Any]]) -> None:
        self.ctx = ctx
        self.entries = [NodeEntry(ctx, e["provider"], e["label"]) for e in entries]
        self._buffer: Dict[str, List[SourceRow]] = {}

    async def scan(
        self, terms: List[PushTerm], args: Optional[Dict[str, Any]]
    ) -> AsyncGenerator[List[SourceRow], None]:
        for entry in self.entries:
            async with aclosing(entry.scan(terms, args)) as pages:
                async for page in pages:
                    yield page

    async def prefetch(
        self, ids: List[Any], terms: List[PushTerm], args: Optional[Dict[str, Any]]
    ) -> None:
        unique = distinct(ids)
        buffer: Dict[str, List[SourceRow]] = {}
        missing: List[Any] = []
        for id_ in unique:
            k = canonical_key(id_)
            if k in self._buffer:
                buffer[k] = self._buffer[k]
            else:
                missing.append(id_)
        if missing:
            for k in (canonical_key(i) for i in missing):
                buffer[k] = []
            for entry in self.entries:
                found = await entry.lookup(missing, terms, args)
                for k, rows in found.items():
                    if k in buffer:
                        buffer[k] = buffer[k] + rows
        self._buffer = buffer

    async def lookup(
        self, id_: Any, terms: List[PushTerm], args: Optional[Dict[str, Any]]
    ) -> List[SourceRow]:
        if id_ is None:
            return []
        k = canonical_key(id_)
        if k in self._buffer:
            return self._buffer[k]
        rows: List[SourceRow] = []
        for entry in self.entries:
            found = await entry.lookup([id_], terms, args)
            rows.extend(found.get(k, []))
        return rows

    def can_lookup(self) -> bool:
        return all(e.native_lookup for e in self.entries)

    def pushes(self, terms: List[PushTerm]) -> bool:
        return all(e.pushes(terms) for e in self.entries)

    def estimate(self, terms: List[PushTerm], args: Optional[Dict[str, Any]]) -> Optional[float]:
        total = 0.0
        for e in self.entries:
            value = e.estimate(terms, args)
            if value is None:
                return None
            total += value
        return total


class RelationshipSourceAccess:
    """Deferred, provider-backed relationship access for one type."""

    deferred = True

    def __init__(self, ctx: SourceContext, entries: List[Dict[str, Any]]) -> None:
        self.ctx = ctx
        self.entries = [
            RelationshipEntry(
                ctx, e["provider"], e["type"], e.get("sourceLabel"), e.get("targetLabel")
            )
            for e in entries
        ]
        self._buffer: Optional[Dict[str, List[SourceRow]]] = None
        self._buffer_side: Optional[str] = None

    async def expand(
        self,
        anchor: Any,
        side: str,
        terms: List[PushTerm],
        args: Optional[Dict[str, Any]],
    ) -> AsyncGenerator[List[SourceRow], None]:
        if anchor is None:
            return
        k = canonical_key(anchor)
        if self._buffer is not None and self._buffer_side == side and k in self._buffer:
            yield self._buffer[k]
            return
        for entry in self.entries:
            async with aclosing(entry.expand_one(side, anchor, terms, args)) as pages:
                async for page in pages:
                    yield page

    async def prefetch(
        self,
        anchors: List[Any],
        side: str,
        terms: List[PushTerm],
        args: Optional[Dict[str, Any]],
    ) -> Optional[List[SourceRow]]:
        self._buffer = None
        self._buffer_side = None
        unique = distinct(anchors)
        if len(unique) < 2 or not all(e.native_expand(side) for e in self.entries):
            return None
        buffer: Dict[str, List[SourceRow]] = {canonical_key(a): [] for a in unique}
        all_rows: List[SourceRow] = []
        remaining = self.ctx.options.max_prefetch_rows
        for entry in self.entries:
            found = await entry.expand_batch(side, unique, terms, args, remaining)
            if found is None:
                return None
            count = 0
            for k, rows in found.items():
                if k in buffer:
                    buffer[k] = buffer[k] + rows
                    all_rows.extend(rows)
                    count += len(rows)
            remaining -= count
        self.ctx.note_peak_buffered(len(all_rows))
        self._buffer = buffer
        self._buffer_side = side
        return all_rows


class MemoryNodeAccess:
    """Legacy eager in-memory node records."""

    deferred = False

    def __init__(self, records: List[SourceRow]) -> None:
        self.records = records
        self._index: Optional[Dict[str, List[SourceRow]]] = None

    async def scan(
        self, terms: List[PushTerm], args: Optional[Dict[str, Any]]
    ) -> AsyncGenerator[List[SourceRow], None]:
        yield self.records

    async def prefetch(
        self, ids: List[Any], terms: List[PushTerm], args: Optional[Dict[str, Any]]
    ) -> None:
        return None

    async def lookup(
        self, id_: Any, terms: List[PushTerm], args: Optional[Dict[str, Any]]
    ) -> List[SourceRow]:
        if self._index is None:
            self._index = index_rows(self.records, "id")
        return self._index.get(canonical_key(id_), [])

    def can_lookup(self) -> bool:
        return True

    def pushes(self, terms: List[PushTerm]) -> bool:
        return False

    def estimate(self, terms: List[PushTerm], args: Optional[Dict[str, Any]]) -> Optional[float]:
        return float(len(self.records))


class MemoryRelationshipAccess:
    """Legacy eager in-memory relationship records."""

    deferred = False

    def __init__(self, records: List[SourceRow]) -> None:
        self.records = records
        self._indexes: Dict[str, Dict[str, List[SourceRow]]] = {}

    async def expand(
        self,
        anchor: Any,
        side: str,
        terms: List[PushTerm],
        args: Optional[Dict[str, Any]],
    ) -> AsyncGenerator[List[SourceRow], None]:
        field = f"{side}_id"
        index = self._indexes.get(field)
        if index is None:
            index = index_rows(self.records, field)
            self._indexes[field] = index
        yield index.get(canonical_key(anchor), [])

    async def prefetch(
        self,
        anchors: List[Any],
        side: str,
        terms: List[PushTerm],
        args: Optional[Dict[str, Any]],
    ) -> Optional[List[SourceRow]]:
        return None
