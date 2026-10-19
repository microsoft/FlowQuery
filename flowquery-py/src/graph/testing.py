"""Test utilities: ready-made in-memory source providers.

These are not part of the public API.  They back FlowQuery's own test
suites (and the ``mockbackend`` test function); applications define
sources declaratively instead, e.g.
``CREATE VIRTUAL (:Person) WITH CAPABILITIES {lookup: true}
AS { UNWIND $people AS p RETURN p.id AS id, p.name AS name }``.
"""

from typing import Any, Dict, Iterator, List, Optional

from .source_provider import (
    PREDICATE_OPERATORS,
    SOURCE_CONTRACT_VERSION,
    NodeSource,
    RelationshipSource,
    SourcePredicate,
    SourceReadContext,
    SourceRequest,
    SourceResult,
    SourceRow,
    _is_int,
    matches_predicate,
)


def _pages_of(rows: List[SourceRow], page_size: Any) -> Iterator[List[SourceRow]]:
    size = page_size if _is_int(page_size) and page_size > 0 else (len(rows) or 1)
    for i in range(0, len(rows), size):
        yield rows[i : i + size]


def _filter_rows(
    rows: List[SourceRow],
    predicate: Optional[SourcePredicate],
    field_name: Optional[str],
    ids: Optional[List[Any]],
) -> List[SourceRow]:
    from .source_context import canonical_key

    wanted = None if ids is None else {canonical_key(i) for i in ids}
    return [
        row
        for row in rows
        if (wanted is None or (field_name is not None and field_name in row
                               and canonical_key(row[field_name]) in wanted))
        and matches_predicate(predicate, row)
    ]


def _in_memory_capabilities(cacheable: bool, max_batch_size: Optional[int]) -> Dict[str, Any]:
    caps: Dict[str, Any] = {
        "version": SOURCE_CONTRACT_VERSION,
        "cacheable": cacheable,
        "streaming": True,
        "predicates": {"operators": list(PREDICATE_OPERATORS), "stringOrdering": "binary"},
    }
    if max_batch_size is not None:
        caps["maxBatchSize"] = max_batch_size
    return caps


class _InMemoryNodeSource(NodeSource):
    def __init__(self, rows: List[SourceRow], cacheable: bool, max_batch_size: Optional[int]):
        self.rows = rows
        self.capabilities = {**_in_memory_capabilities(cacheable, max_batch_size), "lookup": True}

    def scan(self, request: SourceRequest, context: SourceReadContext) -> SourceResult:
        return _pages_of(_filter_rows(self.rows, request.get("predicate"), None, None),
                         request.get("pageSize"))

    def lookup(self, request: SourceRequest, context: SourceReadContext) -> SourceResult:
        rows = _filter_rows(self.rows, request.get("predicate"), "id", request.get("ids") or [])
        return _pages_of(rows, request.get("pageSize"))


class _InMemoryRelationshipSource(RelationshipSource):
    def __init__(self, rows: List[SourceRow], cacheable: bool, max_batch_size: Optional[int]):
        self.rows = rows
        self.capabilities = {
            **_in_memory_capabilities(cacheable, max_batch_size),
            "expand": {"left": True, "right": True},
        }

    def scan(self, request: SourceRequest, context: SourceReadContext) -> SourceResult:
        return _pages_of(_filter_rows(self.rows, request.get("predicate"), None, None),
                         request.get("pageSize"))

    def expand(self, request: SourceRequest, context: SourceReadContext) -> SourceResult:
        field_name = "left_id" if request.get("side") == "left" else "right_id"
        rows = _filter_rows(self.rows, request.get("predicate"), field_name, request.get("ids") or [])
        return _pages_of(rows, request.get("pageSize"))


def in_memory_node_source(
    rows: List[SourceRow], *, cacheable: bool = True, max_batch_size: Optional[int] = None
) -> NodeSource:
    """A ready-made node source over a list of rows (each with an ``id``).

    Supports lookup, every predicate operator and paging; handy for tests.  The list is read on every request,
    so later mutations are visible.

    Example::

        Database.get_instance().register_node_source("Person", in_memory_node_source([{"id": 1, "name": "Ada"}]))
    """
    return _InMemoryNodeSource(rows, cacheable, max_batch_size)


def in_memory_relationship_source(
    rows: List[SourceRow], *, cacheable: bool = True, max_batch_size: Optional[int] = None
) -> RelationshipSource:
    """A ready-made relationship source over a list of rows (each with
    ``left_id`` and ``right_id``), supporting expansion from both sides."""
    return _InMemoryRelationshipSource(rows, cacheable, max_batch_size)
