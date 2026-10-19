"""Tests for backend-aware virtual sources (source providers)."""

import asyncio
import json
import re
from types import SimpleNamespace
from typing import Any, Dict, List, Optional, Tuple

import pytest

from flowquery.compute.flowquery import FlowQuery
from flowquery.compute.runner import Runner, RunnerOptions
from flowquery.graph.database import Database
from flowquery.graph.source_context import SourceOptions
from flowquery.graph.source_provider import (
    NodeSource,
    QueryCancelledError,
    RelationshipSource,
    SourceCapabilityError,
    SourceProvider,
    SourceRequest,
    SourceResponseError,
    SourceUnsupportedError,
    cursor_pages,
    matches_predicate,
    normalize_capabilities,
)
from flowquery.graph.testing import in_memory_node_source, in_memory_relationship_source

from .mock_backend import mock

db = Database.get_instance()
V = 1


def drop(*labels: str) -> None:
    for label in labels:
        db.nodes.pop(label, None)


def pages(rows: List[Dict[str, Any]], size: int) -> List[List[Dict[str, Any]]]:
    out = [rows[i : i + size] for i in range(0, len(rows), size)]
    return out if out else [[]]


def source(capabilities: Dict[str, Any], **methods: Any) -> SimpleNamespace:
    """Ad-hoc provider object."""
    return SimpleNamespace(capabilities=capabilities, **methods)


class ArrayNodes:
    """Array-backed provider returning an async iterable of pages."""

    def __init__(self, rows: List[Dict[str, Any]], capabilities: Optional[Dict[str, Any]] = None):
        self.rows = rows
        self.capabilities = capabilities if capabilities is not None else {"version": V}
        self.requests: List[Dict[str, Any]] = []
        self.opened = 0
        self.closed = 0

    def open_read_context(self, *args: Any) -> Dict[str, Any]:
        self.opened += 1
        return {"snapshot": self.opened}

    def close_read_context(self, *args: Any) -> None:
        self.closed += 1

    async def scan(self, request: Dict[str, Any], context: Any):
        self.requests.append(request)
        rows = [r for r in self.rows if matches_predicate(request["predicate"], r)]
        for page in pages(rows, request["pageSize"]):
            yield page

    def lookup(self, request: Dict[str, Any], context: Any):
        self.requests.append(request)
        ids = request["ids"]
        return [
            r
            for r in self.rows
            if any(_same(r.get("id"), i) for i in ids) and matches_predicate(request["predicate"], r)
        ]


class CursorNodes:
    """Cursor-paged provider built on ``cursor_pages`` (opaque string tokens)."""

    def __init__(self, rows: List[Dict[str, Any]], capabilities: Optional[Dict[str, Any]] = None):
        self.rows = rows
        self.capabilities = capabilities if capabilities is not None else {"version": V}
        self.requests: List[Dict[str, Any]] = []

    def _query(self, request: Dict[str, Any], keep: Any):
        rows = [r for r in self.rows if keep(r) and matches_predicate(request["predicate"], r)]
        size = min(request["pageSize"], 2)

        async def fetch(cursor: Optional[str]) -> Dict[str, Any]:
            offset = 0 if cursor is None else int(cursor[1:])
            nxt = offset + size
            return {"rows": rows[offset:nxt], "cursor": f"c{nxt}" if nxt < len(rows) else None}

        return cursor_pages(fetch)

    def scan(self, request: Dict[str, Any], context: Any):
        self.requests.append(request)
        return self._query(request, lambda r: True)

    def lookup(self, request: Dict[str, Any], context: Any):
        self.requests.append(request)
        return self._query(request, lambda r: any(_same(r.get("id"), i) for i in request["ids"]))


class ArrayRels:
    def __init__(self, rows: List[Dict[str, Any]], capabilities: Optional[Dict[str, Any]] = None):
        self.rows = rows
        self.capabilities = capabilities if capabilities is not None else {"version": V}
        self.requests: List[Dict[str, Any]] = []

    async def scan(self, request: Dict[str, Any], context: Any):
        self.requests.append(request)
        return [r for r in self.rows if matches_predicate(request["predicate"], r)]

    async def expand(self, request: Dict[str, Any], context: Any):
        self.requests.append(request)
        field = "left_id" if request["side"] == "left" else "right_id"
        rows = [
            r
            for r in self.rows
            if any(_same(r.get(field), i) for i in request["ids"])
            and matches_predicate(request["predicate"], r)
        ]
        for page in pages(rows, request["pageSize"]):
            yield page


def _same(a: Any, b: Any) -> bool:
    return type(a) is type(b) and a == b


PEOPLE = [
    {"id": 1, "name": "Ann", "age": 31},
    {"id": 2, "name": "Bob", "age": 25},
    {"id": 3, "name": "Cid", "age": 42},
    {"id": 4, "name": "Dee", "age": 19},
    {"id": 5, "name": "Eve", "age": 37},
    {"id": 6, "name": "Fay", "age": 28},
]
KNOWS = [
    {"left_id": 1, "right_id": 2, "since": 2010},
    {"left_id": 1, "right_id": 3, "since": 2015},
    {"left_id": 2, "right_id": 3, "since": 2012},
    {"left_id": 3, "right_id": 4, "since": 2020},
    {"left_id": 4, "right_id": 5, "since": 2001},
    {"left_id": 5, "right_id": 1, "since": 2018},
    {"left_id": 6, "right_id": 6, "since": 2019},
]
CITIES = [{"id": 1, "name": "Oslo"}, {"id": 2, "name": "Rome"}]
LIVES = [
    {"left_id": 1, "right_id": 1},
    {"left_id": 2, "right_id": 2},
    {"left_id": 3, "right_id": 1},
    {"left_id": 4, "right_id": 2},
    {"left_id": 5, "right_id": 1},
    {"left_id": 6, "right_id": 2},
]

FULL_NODE: Dict[str, Any] = {
    "version": V,
    "lookup": True,
    "cacheable": True,
    "predicates": {"operators": ["eq", "gt", "gte", "lt", "lte", "in"]},
}
FULL_REL: Dict[str, Any] = {
    "version": V,
    "expand": {"left": True, "right": True},
    "cacheable": True,
    "predicates": {"operators": ["eq", "in"]},
}


def literal(rows: List[Dict[str, Any]]) -> str:
    return re.sub(r'"(\w+)":', r"\1:", json.dumps(rows))


_legacy_defined = False


async def ensure_legacy() -> None:
    global _legacy_defined
    if _legacy_defined:
        return

    async def node(label: str, rows: List[Dict[str, Any]]) -> None:
        await Runner(
            f"CREATE VIRTUAL (:Leg{label}) AS {{ UNWIND {literal(rows)} AS r "
            "RETURN r.id AS id, r.name AS name, r.age AS age }"
        ).run()

    async def rel(type_: str, frm: str, to: str, rows: List[Dict[str, Any]]) -> None:
        await Runner(
            f"CREATE VIRTUAL (:Leg{frm})-[:Leg{type_}]-(:Leg{to}) AS {{ UNWIND {literal(rows)} AS r "
            "RETURN r.left_id AS left_id, r.right_id AS right_id, r.since AS since }"
        ).run()

    await node("P", PEOPLE)
    await node("C", CITIES)
    await rel("K", "P", "P", KNOWS)
    await rel("L", "P", "C", LIVES)
    _legacy_defined = True


def define_sources(
    prefix: str,
    kind: str = "array",
    node_caps: Dict[str, Any] = FULL_NODE,
    rel_caps: Dict[str, Any] = FULL_REL,
) -> SimpleNamespace:
    make = ArrayNodes if kind == "array" else CursorNodes
    p = SimpleNamespace(
        people=make(PEOPLE, node_caps),
        cities=make(CITIES, node_caps),
        knows=ArrayRels(KNOWS, rel_caps),
        lives=ArrayRels(LIVES, rel_caps),
    )
    db.register_node_source(f"{prefix}P", p.people)
    db.register_node_source(f"{prefix}C", p.cities)
    db.register_relationship_source(f"{prefix}K", f"{prefix}P", f"{prefix}P", p.knows)
    db.register_relationship_source(f"{prefix}L", f"{prefix}P", f"{prefix}C", p.lives)
    return p


def opts(**sources: Any) -> RunnerOptions:
    return RunnerOptions(sources=SourceOptions(**sources))


async def query(
    statement: str, options: Optional[RunnerOptions] = None
) -> Tuple[List[Dict[str, Any]], Runner]:
    runner = Runner(statement, options=options)
    await runner.run()
    return runner.results, runner


def ordered(rows: List[Dict[str, Any]]) -> List[str]:
    return sorted(json.dumps(r, sort_keys=True) for r in rows)


DIFFERENTIAL_QUERIES = [
    "MATCH (a:$P)-[:$K]->(b:$P) RETURN a.id AS a, b.id AS b",
    "MATCH (a:$P)<-[:$K]-(b:$P) RETURN a.id AS a, b.id AS b",
    "MATCH (a:$P)-[:$K]-(b:$P) RETURN a.id AS a, b.id AS b",
    "MATCH (a:$P {name: 'Ann'})-[:$K]->(b:$P) RETURN b.name AS name",
    "MATCH (a:$P)-[r:$K]->(b:$P) WHERE a.age > 30 RETURN a.id AS a, r.since AS since, b.id AS b",
    "MATCH (a:$P)-[:$K]->(b:$P) WHERE b.id IN [2, 3] AND a.age >= 25 RETURN a.id AS a, b.id AS b",
    "MATCH (a:$P)-[:$K]->(b:$P) WHERE 30 > b.age RETURN a.id AS a, b.id AS b",
    "MATCH (a:$P)-[:$K]->(b:$P)-[:$L]->(c:$C {name: 'Oslo'}) RETURN a.id AS a, b.id AS b, c.id AS c",
    "MATCH (a:$P)-[:$K]->(b:$P)-[:$K]->(c:$P) RETURN a.id AS a, b.id AS b, c.id AS c",
    "MATCH (a:$P)-[:$K*1..3]->(b:$P) RETURN a.id AS a, b.id AS b",
    "MATCH (a:$P)-[:$K*0..1]->(b:$P) RETURN a.id AS a, b.id AS b",
    "MATCH (a:$P {id: 1})-[:$K]->(b:$P) MATCH (b)-[:$L]->(c:$C) RETURN b.id AS b, c.name AS c",
    "MATCH (a:$P) OPTIONAL MATCH (a)-[:$L]->(c:$C {name: 'Rome'}) RETURN a.id AS a, c.id AS c",
    "MATCH (a:$P)-[:$L]->(c:$C) RETURN c.name AS city, count(a) AS people",
    "MATCH (a:$P)-[:$K]->(a) RETURN a.id AS a",
    "MATCH (a:$P)-[:$K]->(b:$P) RETURN a.id AS a, b.id AS b ORDER BY a DESC, b LIMIT 3",
    "MATCH (a:$P)-[:$K]->(b:$P) WHERE a.name >= 'C' RETURN a.id AS a, b.id AS b",
    # Relationship uniqueness within one MATCH (openCypher isomorphism)
    "MATCH (a:$P)-[:$K]->(b:$P)<-[:$K]-(c:$P) RETURN a.id AS a, b.id AS b, c.id AS c",
    "MATCH (a:$P)-[:$K]-(b:$P)-[:$K]-(c:$P) RETURN a.id AS a, b.id AS b, c.id AS c",
    "MATCH (a:$P)-[:$K]->(b:$P), (c:$P)-[:$K]->(b) RETURN a.id AS a, c.id AS c",
    "MATCH (a:$P)-[:$K]->(b:$P) MATCH (c:$P)-[:$K]->(b) RETURN a.id AS a, c.id AS c",
]


def bind(statement: str, prefix: str) -> str:
    return re.sub(r"\$([PKLC])\b", lambda m: f"{prefix}{m.group(1)}", statement)


class TestDifferential:
    """Provider-backed sources return the same results as legacy definitions."""

    @pytest.mark.parametrize("kind", ["array", "cursor"])
    @pytest.mark.parametrize("statement", DIFFERENTIAL_QUERIES)
    async def test_provider_matches_legacy(self, kind: str, statement: str) -> None:
        await ensure_legacy()
        prefix = f"Diff{kind}"
        define_sources(prefix, kind)
        legacy, _ = await query(bind(statement, "Leg"))
        sourced, _ = await query(bind(statement, prefix))
        if "ORDER BY" in statement:
            assert sourced == legacy
        else:
            assert ordered(sourced) == ordered(legacy)
        assert len(sourced) > 0

    @pytest.mark.parametrize("statement", DIFFERENTIAL_QUERIES)
    async def test_minimal_scan_only_provider_matches_legacy(self, statement: str) -> None:
        await ensure_legacy()
        define_sources("Min", "array", {"version": V}, {"version": V})
        legacy, _ = await query(bind(statement, "Leg"))
        sourced, _ = await query(bind(statement, "Min"))
        assert ordered(sourced) == ordered(legacy)

    @pytest.mark.parametrize("statement", DIFFERENTIAL_QUERIES)
    async def test_no_reorder_matches_legacy(self, statement: str) -> None:
        await ensure_legacy()
        define_sources("NoRe")
        legacy, _ = await query(bind(statement, "Leg"))
        sourced, _ = await query(bind(statement, "NoRe"), opts(reorder=False, max_batch_size=1))
        assert ordered(sourced) == ordered(legacy)


_mock_defined = False


async def ensure_mockbackend() -> None:
    global _mock_defined
    if _mock_defined:
        return
    mock.add_nodes("MockP", PEOPLE)
    mock.add_nodes("MockC", CITIES)
    mock.add_relationships("MockK", KNOWS)
    mock.add_relationships("MockL", LIVES)

    async def node(label: str, columns: str) -> None:
        await Runner(
            f"CREATE VIRTUAL (:{label}) AS {{ LOAD JSON FROM mockbackend($request) AS n RETURN {columns} }}"
        ).run()

    async def rel(type_: str, frm: str, to: str) -> None:
        await Runner(
            f"CREATE VIRTUAL (:{frm})-[:{type_}]-(:{to}) AS {{ LOAD JSON FROM mockbackend($request) AS r "
            "RETURN r.left_id AS left_id, r.right_id AS right_id, r.since AS since }"
        ).run()

    await node("MockP", "n.id AS id, n.name AS name, n.age AS age")
    await node("MockC", "n.id AS id, n.name AS name")
    await rel("MockK", "MockP", "MockP")
    await rel("MockL", "MockP", "MockC")
    _mock_defined = True


class TestDifferentialMockBackend:
    """The differential queries also agree through the mockbackend function."""

    @pytest.mark.parametrize("statement", DIFFERENTIAL_QUERIES)
    async def test_mockbackend_matches_legacy(self, statement: str) -> None:
        await ensure_legacy()
        await ensure_mockbackend()
        legacy, _ = await query(bind(statement, "Leg"))
        sourced, _ = await query(bind(statement, "Mock"), opts(page_size=2))
        if "ORDER BY" in statement:
            assert sourced == legacy
        else:
            assert ordered(sourced) == ordered(legacy)


class TestSources:
    """Behavior of backend-aware virtual sources."""

    async def test_correlated_loading_uses_lookup_and_expand(self) -> None:
        p = define_sources("Corr")
        results, runner = await query(
            "MATCH (a:CorrP {id: 1})-[:CorrK]->(b:CorrP) RETURN b.name AS name"
        )
        assert ordered(results) == ordered([{"name": "Bob"}, {"name": "Cid"}])
        assert runner.source_stats["calls"]["scan"] == 0
        first = p.people.requests[0]
        assert first["version"] == V
        assert first["operation"] == "lookup"
        assert first["label"] == "CorrP"
        assert first["ids"] == [1]
        assert first["args"] == {"id": 1}
        assert len(p.knows.requests) == 1
        expand = p.knows.requests[0]
        assert expand["operation"] == "expand"
        assert expand["type"] == "CorrK"
        assert expand["sourceLabel"] == "CorrP"
        assert expand["targetLabel"] == "CorrP"
        assert expand["side"] == "left"
        assert expand["ids"] == [1]
        assert expand["args"] is None
        target_lookup = p.people.requests[1]
        assert target_lookup["operation"] == "lookup"
        assert sorted(target_lookup["ids"]) == [2, 3]

    async def test_incoming_patterns_expand_by_right_id(self) -> None:
        p = define_sources("Inc")
        results, _ = await query("MATCH (a:IncP {id: 3})<-[:IncK]-(b:IncP) RETURN b.id AS b")
        assert ordered(results) == ordered([{"b": 1}, {"b": 2}])
        first = p.knows.requests[0]
        assert (first["operation"], first["side"], first["ids"]) == ("expand", "right", [3])

    async def test_expansion_is_batched(self) -> None:
        p = define_sources("Batch")
        _, runner = await query(
            "MATCH (a:BatchP)-[:BatchK]->(b:BatchP) RETURN a.id, b.id", opts(max_batch_size=4)
        )
        expands = [r for r in p.knows.requests if r["operation"] == "expand"]
        assert [len(r["ids"]) for r in expands] == [4, 2]
        assert runner.source_stats["batches"] >= 2
        for lookup in (r for r in p.people.requests if r["operation"] == "lookup"):
            assert len(lookup["ids"]) <= 4

    async def test_provider_max_batch_size_lowers_batch_size(self) -> None:
        p = define_sources("PBatch", "array", FULL_NODE, {**FULL_REL, "maxBatchSize": 2})
        await query("MATCH (a:PBatchP)-[:PBatchK]->(b:PBatchP) RETURN a.id, b.id")
        expands = [r for r in p.knows.requests if r["operation"] == "expand"]
        assert [len(r["ids"]) for r in expands] == [2, 2, 2]

    async def test_reads_are_cached_per_query_and_bounded(self) -> None:
        p = define_sources("Cache")
        statement = (
            "MATCH (a:CacheP {id: 1})-[:CacheK]->(b:CacheP) "
            "MATCH (c:CacheP {id: 1})-[:CacheK]->(d:CacheP) RETURN b.id, d.id"
        )
        cached, cached_runner = await query(statement)
        assert len(cached) == 4
        assert cached_runner.source_stats["cacheHits"] > 0
        calls_with_cache = len(p.people.requests) + len(p.knows.requests)

        p.people.requests = []
        p.knows.requests = []
        uncached, uncached_runner = await query(statement, opts(cache_capacity=0))
        assert ordered(uncached) == ordered(cached)
        assert uncached_runner.source_stats["cacheHits"] == 0
        assert len(p.people.requests) + len(p.knows.requests) > calls_with_cache

        # A new query never reuses a previous query's cache.
        p.people.requests = []
        await query(statement)
        assert len(p.people.requests) > 0

    async def test_non_cacheable_sources_are_re_read(self) -> None:
        p = define_sources("NoCache", "array", {**FULL_NODE, "cacheable": False})
        _, runner = await query(
            "MATCH (a:NoCacheP {id: 1}) MATCH (b:NoCacheP {id: 1}) RETURN a.id, b.id"
        )
        assert len([r for r in p.people.requests if r["operation"] == "lookup"]) == 2
        assert runner.source_stats["cacheHits"] == 0

    async def test_where_eq_range_and_in_are_pushed_down(self) -> None:
        p = define_sources("Push", "array", {**FULL_NODE, "lookup": False})
        await query(
            "MATCH (a:PushP) WHERE a.age > 30 AND a.name IN ['Ann', 'Cid', 'Ann'] RETURN a.id"
        )
        assert p.people.requests[0]["predicate"] == {
            "op": "and",
            "terms": [
                {"op": "gt", "property": "age", "value": 30},
                {"op": "in", "property": "name", "values": ["Ann", "Cid"]},
            ],
        }
        p.people.requests = []
        await query("MATCH (a:PushP) WHERE a.name = 'Ann' RETURN a.id")
        assert p.people.requests[0]["predicate"] == {"op": "eq", "property": "name", "value": "Ann"}
        assert p.people.requests[0]["args"] == {"name": "Ann"}

    async def test_predicates_only_pushed_when_declared_and_safe(self) -> None:
        p = define_sources(
            "Safe",
            "array",
            {"version": V, "predicates": {"operators": ["gt", "in"], "properties": ["age"]}},
        )

        async def run(statement: str) -> Any:
            p.people.requests = []
            await query(statement)
            return p.people.requests[0]["predicate"]

        assert await run("MATCH (a:SafeP) WHERE a.age > 30 RETURN a.id") == {
            "op": "gt",
            "property": "age",
            "value": 30,
        }
        assert await run("MATCH (a:SafeP) WHERE a.age < 30 RETURN a.id") is None
        assert await run("MATCH (a:SafeP) WHERE a.name IN ['Ann'] RETURN a.id") is None
        assert await run("MATCH (a:SafeP) WHERE a.age > 30 OR a.age < 20 RETURN a.id") is None
        assert await run("MATCH (a:SafeP) WHERE a.age IN [31, null] RETURN a.id") is None
        assert await run("MATCH (a:SafeP) WHERE a.age IN [31, [1]] RETURN a.id") is None
        # Comparing a number with a string raises in Python; the predicate
        # must still not have been pushed.
        p.people.requests = []
        with pytest.raises(TypeError):
            await query("MATCH (a:SafeP) WHERE a.age > 'x' RETURN a.id")
        assert p.people.requests[0]["predicate"] is None
        # Range predicates are not pushed into OPTIONAL MATCH.
        p.people.requests = []
        await query("UNWIND [1] AS x OPTIONAL MATCH (a:SafeP) WHERE a.age > 30 RETURN a.id")
        assert p.people.requests[0]["predicate"] is None

    async def test_string_ranges_pushed_only_with_binary_ordering(self) -> None:
        p = define_sources(
            "Str",
            "array",
            {"version": V, "predicates": {"operators": ["gte"], "stringOrdering": "binary"}},
        )
        results, _ = await query("MATCH (a:StrP) WHERE a.name >= 'D' RETURN a.name AS name")
        assert p.people.requests[0]["predicate"] == {"op": "gte", "property": "name", "value": "D"}
        assert ordered(results) == ordered([{"name": "Dee"}, {"name": "Eve"}, {"name": "Fay"}])

    async def test_pushed_predicates_are_rechecked(self) -> None:
        provider = ArrayNodes(PEOPLE, FULL_NODE)

        async def scan(request: Dict[str, Any], context: Any):
            provider.requests.append(request)
            yield provider.rows

        provider.scan = scan  # type: ignore[method-assign]
        db.register_node_source("IgnoreP", provider)
        results, _ = await query("MATCH (a:IgnoreP) WHERE a.age > 30 RETURN a.id AS id")
        assert provider.requests[0]["predicate"] is not None
        assert ordered(results) == ordered([{"id": 1}, {"id": 3}, {"id": 5}])

    async def test_selective_end_node_starts_traversal(self) -> None:
        p = define_sources("Rev")
        results, runner = await query(
            "MATCH (a:RevP)-[:RevK]->(b:RevP)-[:RevK]->(c:RevP {id: 3}) RETURN a.id AS a, b.id AS b"
        )
        assert ordered(results) == ordered([{"a": 1, "b": 2}, {"a": 5, "b": 1}])
        plans = runner.source_stats["plans"]
        assert len(plans) == 1 and plans[0]["start"] == "last"
        assert all(r["operation"] == "lookup" for r in p.people.requests)
        assert all(r["operation"] == "expand" and r["side"] == "right" for r in p.knows.requests)

    async def test_reordering_can_be_disabled(self) -> None:
        define_sources("NoRev")
        _, runner = await query(
            "MATCH (a:NoRevP)-[:NoRevK]->(b:NoRevP)-[:NoRevK]->(c:NoRevP {id: 3}) RETURN a.id",
            opts(reorder=False),
        )
        assert runner.source_stats["plans"] == []

    async def test_limit_stops_reading_and_closes_source(self) -> None:
        state = {"pulled": 0, "finalized": False, "aborted": False}

        async def scan(request: Dict[str, Any], context: Any):
            try:
                for i in range(1000):
                    state["pulled"] += 1
                    yield [{"id": i}]
            finally:
                state["finalized"] = True
                state["aborted"] = context.signal.aborted

        db.register_node_source("LimitP", source({"version": V}, scan=scan))
        results, _ = await query("MATCH (a:LimitP) RETURN a.id AS id LIMIT 2")
        assert results == [{"id": 0}, {"id": 1}]
        assert state["pulled"] < 5
        assert state["finalized"] is True
        assert state["aborted"] is False

        state["pulled"] = 0
        via_with, _ = await query("MATCH (a:LimitP) WITH a LIMIT 3 RETURN a.id AS id")
        assert len(via_with) == 3
        assert state["pulled"] < 6

    async def test_order_by_and_aggregates_with_limit_read_everything(self) -> None:
        define_sources("Agg")
        top, _ = await query("MATCH (a:AggP) RETURN a.age AS age ORDER BY age DESC LIMIT 2")
        assert top == [{"age": 42}, {"age": 37}]
        count, _ = await query("MATCH (a:AggP) RETURN count(a) AS n LIMIT 1")
        assert count == [{"n": 6}]

    async def test_rows_stream_before_later_pages_are_requested(self) -> None:
        events: List[str] = []

        async def scan(request: Dict[str, Any], context: Any):
            for i in range(3):
                events.append(f"page{i}")
                yield [{"id": i}]

        db.register_node_source("StreamP", source({"version": V, "streaming": True}, scan=scan))
        await Runner("CREATE VIRTUAL (:StreamQ) AS { UNWIND [0, 1, 2] AS x RETURN x AS id }").run()

        def expand(request: Dict[str, Any], context: Any):
            events.append("expand" + ",".join(str(i) for i in request["ids"]))
            return [{"left_id": i, "right_id": i} for i in request["ids"]]

        def rel_scan(request: Dict[str, Any], context: Any):
            events.append("scan")
            return []

        db.register_relationship_source(
            "STREAM_R",
            "StreamP",
            "StreamQ",
            source({"version": V, "expand": {"left": True}}, expand=expand, scan=rel_scan),
        )
        results, _ = await query("MATCH (a:StreamP)-[:STREAM_R]->(b:StreamQ) RETURN a.id AS id")
        assert len(results) == 3
        assert events == ["page0", "expand0", "page1", "expand1", "page2", "expand2"]

    async def test_empty_non_final_pages_are_not_the_end(self) -> None:
        async def scan(request: Dict[str, Any], context: Any):
            yield []
            yield [{"id": 1}]
            yield []
            yield [{"id": 2}]

        db.register_node_source("EmptyP", source({"version": V}, scan=scan))
        results, _ = await query("MATCH (a:EmptyP) RETURN a.id AS id")
        assert results == [{"id": 1}, {"id": 2}]

    async def test_repeated_continuation_token_is_reported(self) -> None:
        async def fetch(cursor: Optional[str]) -> Dict[str, Any]:
            return {"rows": [{"id": 1}], "cursor": "same"}

        db.register_node_source(
            "LoopP", source({"version": V}, scan=lambda request, context: cursor_pages(fetch))
        )
        with pytest.raises(SourceResponseError):
            await query("MATCH (a:LoopP) RETURN a.id")
        drop("LoopP")

    async def test_malformed_responses_raise_source_response_error(self) -> None:
        def bad(scan: Any) -> None:
            db.register_node_source("BadP", source({"version": V}, scan=scan))

        bad(lambda request, context: "nope")
        with pytest.raises(SourceResponseError):
            await query("MATCH (a:BadP) RETURN a")
        bad(lambda request, context: [1, 2])
        with pytest.raises(SourceResponseError):
            await query("MATCH (a:BadP) RETURN a")

        async def not_pages(request: Dict[str, Any], context: Any):
            yield {"id": 1}

        bad(not_pages)
        with pytest.raises(SourceResponseError):
            await query("MATCH (a:BadP) RETURN a")
        bad(lambda request, context: [{"name": "no id"}])
        with pytest.raises(Exception, match="id"):
            await query("MATCH (a:BadP) RETURN a")
        drop("BadP")

    async def test_provider_errors_propagate(self) -> None:
        def scan(request: Dict[str, Any], context: Any):
            raise RuntimeError("backend down")

        db.register_node_source("ErrP", source({"version": V}, scan=scan))
        with pytest.raises(Exception, match="backend down"):
            await query("MATCH (a:ErrP) RETURN a")
        drop("ErrP")

    async def test_source_unsupported_error_falls_back_to_scan(self) -> None:
        provider = ArrayNodes(PEOPLE, FULL_NODE)

        def lookup(request: Dict[str, Any], context: Any):
            raise SourceUnsupportedError()

        provider.lookup = lookup  # type: ignore[method-assign]
        db.register_node_source("FbP", provider)
        results, runner = await query("MATCH (a:FbP {id: 2}) RETURN a.name AS name")
        assert results == [{"name": "Bob"}]
        assert runner.source_stats["fallbacks"] > 0
        assert any(r["operation"] == "scan" for r in provider.requests)

    async def test_cancellation_aborts_in_flight_reads(self) -> None:
        seen: Dict[str, Any] = {}

        def scan(request: Dict[str, Any], context: Any):
            seen["signal"] = context.signal
            return asyncio.get_running_loop().create_future()

        db.register_node_source("SlowP", source({"version": V}, scan=scan))
        runner = Runner("MATCH (a:SlowP) RETURN a")
        running = asyncio.ensure_future(runner.run())
        await asyncio.sleep(0.01)
        runner.cancel()
        with pytest.raises(QueryCancelledError):
            await running
        assert seen["signal"].aborted is True
        assert runner.source_stats["cancellations"] == 1

        event = asyncio.Event()
        external = Runner("MATCH (a:SlowP) RETURN a", options=opts(signal=event))
        pending = asyncio.ensure_future(external.run())
        await asyncio.sleep(0.01)
        event.set()
        with pytest.raises(QueryCancelledError):
            await asyncio.wait_for(pending, 5)
        drop("SlowP")

    async def test_var_length_predicates_not_pushed_below_minimum_hop(self) -> None:
        edges = [
            {"left_id": 1, "right_id": 2, "since": 2010},
            {"left_id": 2, "right_id": 3, "since": 2012},
            {"left_id": 3, "right_id": 4, "since": 2012},
        ]
        await ensure_legacy()
        await Runner(
            f"CREATE VIRTUAL (:LegP)-[:VARK]-(:LegP) AS {{ UNWIND {literal(edges)} AS r "
            "RETURN r.left_id AS left_id, r.right_id AS right_id, r.since AS since }"
        ).run()
        db.register_node_source("VarP", ArrayNodes(PEOPLE, FULL_NODE))
        db.register_relationship_source("VARK", "VarP", "VarP", ArrayRels(edges, FULL_REL))

        def statement(p: str) -> str:
            return f"MATCH (a:{p})-[:VARK*2..2 {{since: 2012}}]->(b:{p}) RETURN a.id AS a, b.id AS b"

        legacy, _ = await query(statement("LegP"))
        sourced, _ = await query(statement("VarP"))
        assert ordered(legacy) == ordered([{"a": 1, "b": 3}, {"a": 2, "b": 4}])
        assert ordered(sourced) == ordered(legacy)

    async def test_reversed_plans_bind_legacy_relationships(self) -> None:
        # Python does not support re-binding a relationship variable in a later
        # MATCH (also without sources), so this checks that reversed plans bind
        # legacy relationship rows and release them for a following pattern.
        db.register_node_source("RefP", ArrayNodes(PEOPLE, FULL_NODE))
        await Runner(
            f"CREATE VIRTUAL (:RefP)-[:REF_LR]-(:RefP) AS {{ UNWIND {literal(KNOWS)} AS r "
            "RETURN r.left_id AS left_id, r.right_id AS right_id, r.since AS since }"
        ).run()
        statement = (
            "MATCH (a:RefP)-[r:REF_LR]->(b:RefP {id: 3}) "
            "MATCH (c:RefP {id: 1})-[s:REF_LR]->(d:RefP) "
            "RETURN a.id AS a, r.since AS since, d.id AS d, s.since AS s"
        )
        reordered, _ = await query(statement)
        forward, _ = await query(statement, opts(reorder=False))
        assert len(reordered) > 0
        assert ordered(reordered) == ordered(forward)

    async def test_cancellation_does_not_wait_for_non_cooperative_generator(self) -> None:
        async def scan(request: Dict[str, Any], context: Any):
            await asyncio.Event().wait()
            yield []

        db.register_node_source("SlowG", source({"version": V}, scan=scan))
        runner = Runner("MATCH (a:SlowG) RETURN a")
        running = asyncio.ensure_future(runner.run())
        await asyncio.sleep(0.01)
        runner.cancel()
        with pytest.raises(QueryCancelledError):
            await asyncio.wait_for(running, 5)
        drop("SlowG")

    async def test_read_contexts_opened_once_and_closed(self) -> None:
        p = define_sources("Snap")
        await query("MATCH (a:SnapP)-[:SnapK]->(b:SnapP) RETURN a.id, b.id")
        assert p.people.opened == 1
        assert p.people.closed == 1
        with pytest.raises(Exception, match="array"):
            await query("MATCH (a:SnapP) UNWIND a.id AS x RETURN x")
        assert p.people.closed == 2

    async def test_ids_are_label_local_and_type_sensitive(self) -> None:
        db.register_node_source(
            "LocA", ArrayNodes([{"id": 1, "n": "a1"}, {"id": "2", "n": "a2"}], FULL_NODE)
        )
        db.register_node_source(
            "LocB", ArrayNodes([{"id": 1, "n": "b1"}, {"id": 2, "n": "b2"}], FULL_NODE)
        )
        db.register_relationship_source(
            "LOC",
            "LocA",
            "LocB",
            ArrayRels(
                [
                    {"left_id": 1, "right_id": 1},
                    {"left_id": "2", "right_id": 2},
                    {"left_id": 2, "right_id": 2},
                ],
                FULL_REL,
            ),
        )
        results, _ = await query("MATCH (a:LocA)-[:LOC]->(b:LocB) RETURN a.n AS a, b.n AS b")
        assert ordered(results) == ordered([{"a": "a1", "b": "b1"}, {"a": "a2", "b": "b2"}])

    async def test_legacy_and_provider_sources_can_be_mixed(self) -> None:
        await ensure_legacy()
        db.register_relationship_source("MIXK", "LegP", "LegP", ArrayRels(KNOWS, FULL_REL))
        legacy, _ = await query("MATCH (a:LegP)-[:LegK]->(b:LegP) RETURN a.id AS a, b.id AS b")
        mixed, _ = await query("MATCH (a:LegP)-[:MIXK]->(b:LegP) RETURN a.id AS a, b.id AS b")
        assert ordered(mixed) == ordered(legacy)

    async def test_legacy_definitions_keep_eager_loading(self) -> None:
        await Runner(
            "CREATE VIRTUAL (:ArgsP) AS { UNWIND [{id: 1, k: 'a'}, {id: 2, k: 'b'}] AS r "
            "WITH r WHERE $args.k IS NULL OR r.k = $args.k RETURN r.id AS id, r.k AS k }"
        ).run()
        results, runner = await query("MATCH (a:ArgsP {k: 'b'}) RETURN a.id AS id")
        assert results == [{"id": 2}]
        assert runner.source_stats["calls"] == {"scan": 0, "lookup": 0, "expand": 0}
        assert runner.source_stats["plans"] == []

    async def test_invalid_capabilities_are_rejected(self) -> None:
        def scan(request: Dict[str, Any], context: Any) -> List[Any]:
            return []

        with pytest.raises(SourceCapabilityError):
            db.register_node_source("InvP", source({"version": 2}, scan=scan))
        with pytest.raises(SourceCapabilityError, match="lookup"):
            db.register_node_source("InvP", source({"version": V, "lookup": True}, scan=scan))
        with pytest.raises(SourceCapabilityError, match="like"):
            db.register_node_source(
                "InvP", source({"version": V, "predicates": {"operators": ["like"]}}, scan=scan)
            )
        with pytest.raises(SourceCapabilityError, match="maxBatchSize"):
            db.register_node_source("InvP", source({"version": V, "maxBatchSize": 0}, scan=scan))
        with pytest.raises(SourceCapabilityError, match="expand"):
            db.register_relationship_source(
                "INV", None, None, source({"version": V, "expand": {"left": True}}, scan=scan)
            )
        with pytest.raises(SourceCapabilityError, match="scan"):
            db.register_node_source("InvP", source({"version": V}))
        with pytest.raises(SourceCapabilityError):
            db.set_node_source_capabilities("NoSuchLabel", {"version": V})
        assert "InvP" not in db.nodes

    async def test_node_source_can_be_removed_with_delete_virtual(self) -> None:
        define_sources("Del")
        await Runner("DELETE VIRTUAL (:DelP)").run()
        with pytest.raises(Exception):
            await query("MATCH (a:DelP) RETURN a")

    async def test_provenance_works_with_registered_sources(self) -> None:
        define_sources("Prov")
        runner = Runner(
            "MATCH (a:ProvP {id: 1})-[:ProvK]->(b:ProvP) RETURN b.id AS b",
            options=RunnerOptions(provenance=True),
        )
        await runner.run()
        assert ordered(runner.results) == ordered([{"b": 2}, {"b": 3}])
        assert len(runner.provenance) == 2
        aliases = sorted(n.alias for n in runner.provenance[0].nodes)
        assert aliases == ["a", "b"]

    async def test_schema_introspection_materializes_provider_scans(self) -> None:
        define_sources("Schema")
        results, _ = await query(
            "CALL schema() YIELD kind, label, type, properties RETURN kind, label, type, properties"
        )
        assert any(r["label"] == "SchemaP" for r in results)


def _definition(label: str) -> str:
    return (
        f"CREATE VIRTUAL (:{label}) AS {{ UNWIND {literal(PEOPLE)} AS r "
        "WITH r, $request AS req "
        "WHERE req IS NULL OR req.operation = 'scan' OR r.id IN req.ids "
        "RETURN r.id AS id, r.name AS name, r.age AS age, req.operation AS op }"
    )


class TestStatementBackedSources:
    """Opt-in for CREATE VIRTUAL definitions via ``$request``."""

    async def test_opt_in_passes_request_and_keeps_results(self) -> None:
        await Runner(_definition("StmtP")).run()
        await Runner(
            "CREATE VIRTUAL (:StmtP)-[:STMT_K]-(:StmtP) AS { UNWIND "
            + literal(KNOWS)
            + " AS r WITH r, $request AS req WHERE req IS NULL OR req.operation = 'scan' "
            "OR (req.side = 'left' AND r.left_id IN req.ids) "
            "OR (req.side = 'right' AND r.right_id IN req.ids) "
            "RETURN r.left_id AS left_id, r.right_id AS right_id }"
        ).run()
        statement = (
            "MATCH (a:StmtP {id: 1})-[:STMT_K]->(b:StmtP) RETURN a.id AS a, b.id AS b, b.op AS op"
        )
        before, _ = await query(statement)
        assert all(r["op"] is None for r in before)

        def pairs(rows: List[Dict[str, Any]]) -> List[str]:
            return ordered([{"a": r["a"], "b": r["b"]} for r in rows])

        for streaming in (False, True):
            db.set_node_source_capabilities(
                "StmtP", {"version": V, "lookup": True, "streaming": streaming}
            )
            db.set_relationship_source_capabilities(
                "STMT_K",
                "StmtP",
                "StmtP",
                {"version": V, "expand": {"left": True, "right": True}, "streaming": streaming},
            )
            after, runner = await query(statement)
            assert pairs(after) == pairs(before)
            assert all(r["op"] == "lookup" for r in after)
            assert runner.source_stats["calls"]["lookup"] > 0
            assert runner.source_stats["calls"]["expand"] > 0

        db.set_node_source_capabilities("StmtP", None)
        reverted, _ = await query(statement)
        assert all(r["op"] is None for r in reverted)

    async def test_streaming_statements_stop_early_under_limit(self) -> None:
        await Runner(
            "CREATE VIRTUAL (:StmtBig) AS { UNWIND range(1, 5000) AS i RETURN i AS id }"
        ).run()
        db.set_node_source_capabilities("StmtBig", {"version": V, "streaming": True})
        results, runner = await query(
            "MATCH (a:StmtBig) RETURN a.id AS id LIMIT 3", opts(page_size=10)
        )
        assert results == [{"id": 1}, {"id": 2}, {"id": 3}]
        assert runner.source_stats["rows"] < 100
        assert runner.source_stats["materializations"] == 0
        # The definition remains usable afterwards.
        everything, _ = await query("MATCH (a:StmtBig) RETURN count(a) AS n")
        assert everything == [{"n": 5000}]

    async def test_redefining_the_label_clears_the_opt_in(self) -> None:
        await Runner(_definition("StmtRe")).run()
        db.set_node_source_capabilities("StmtRe", {"version": V})
        await Runner(_definition("StmtRe")).run()
        _, runner = await query("MATCH (a:StmtRe) RETURN a.id")
        assert runner.source_stats["calls"]["scan"] == 0


_PEOPLE_BODY = (
    f"{{ UNWIND {literal(PEOPLE)} AS r WITH r, $request AS req "
    "WHERE req IS NULL OR req.operation = 'scan' OR r.id IN req.ids "
    "RETURN r.id AS id, r.name AS name, req.operation AS op }"
)
_KNOWS_BODY = (
    f"{{ UNWIND {literal(KNOWS)} AS r WITH r, $request AS req "
    "WHERE req IS NULL OR req.operation = 'scan' "
    "OR (req.side = 'left' AND r.left_id IN req.ids) "
    "OR (req.side = 'right' AND r.right_id IN req.ids) "
    "RETURN r.left_id AS left_id, r.right_id AS right_id }"
)


class TestDeclarativeCapabilities:
    """``CREATE VIRTUAL ... WITH CAPABILITIES { ... } AS { ... }``."""

    async def test_opts_nodes_and_relationships_in(self) -> None:
        await Runner(
            f"CREATE VIRTUAL (:DeclP) WITH CAPABILITIES {{lookup: true, streaming: true}} AS {_PEOPLE_BODY}"
        ).run()
        await Runner(
            "CREATE VIRTUAL (:DeclP)-[:DECL_K]-(:DeclP) "
            "with capabilities {expand: {left: true, right: true}, maxBatchSize: 2} "
            f"AS {_KNOWS_BODY}"
        ).run()
        assert db.nodes["DeclP"].provider.capabilities == {
            "version": V,
            "lookup": True,
            "streaming": True,
        }
        results, runner = await query(
            "MATCH (a:DeclP {id: 1})-[:DECL_K]->(b:DeclP) RETURN b.id AS b, b.op AS op"
        )
        assert ordered(results) == ordered([{"b": 2, "op": "lookup"}, {"b": 3, "op": "lookup"}])
        assert runner.source_stats["calls"]["scan"] == 0
        assert runner.source_stats["calls"]["expand"] > 0

    async def test_nested_predicate_capabilities(self) -> None:
        await Runner(
            "CREATE VIRTUAL (:DeclPred) WITH CAPABILITIES {"
            " predicates: {operators: ['eq', 'in'], properties: ['id']}"
            f"}} AS {{ UNWIND {literal(PEOPLE)} AS r WITH r, $request AS req "
            "WHERE req.predicate IS NULL OR r.id = req.predicate.value "
            "RETURN r.id AS id, r.name AS name }"
        ).run()
        results, _ = await query("MATCH (a:DeclPred {id: 3}) RETURN a.name AS name")
        assert results == [{"name": "Cid"}]
        assert db.nodes["DeclPred"].provider.capabilities["predicates"] == {
            "operators": ["eq", "in"],
            "properties": ["id"],
        }

    async def test_redefining_without_capabilities_restores_legacy(self) -> None:
        await Runner(f"CREATE VIRTUAL (:DeclRe) WITH CAPABILITIES {{}} AS {_PEOPLE_BODY}").run()
        assert db.nodes["DeclRe"].provider is not None
        await Runner(f"CREATE VIRTUAL (:DeclRe) AS {_PEOPLE_BODY}").run()
        assert db.nodes["DeclRe"].provider is None

    async def test_invalid_capabilities_reject_the_definition(self) -> None:
        with pytest.raises(SourceCapabilityError):
            await Runner(
                "CREATE VIRTUAL (:DeclBad) WITH CAPABILITIES "
                f"{{predicates: {{operators: ['like']}}}} AS {_PEOPLE_BODY}"
            ).run()
        assert "DeclBad" not in db.nodes
        with pytest.raises(SourceCapabilityError, match="unsupported capability version"):
            await Runner(
                f"CREATE VIRTUAL (:DeclBad) WITH CAPABILITIES {{version: 2}} AS {_PEOPLE_BODY}"
            ).run()

    def test_with_requires_capabilities_and_a_map(self) -> None:
        with pytest.raises(Exception, match="Expected CAPABILITIES"):
            Runner(f"CREATE VIRTUAL (:X) WITH {{lookup: true}} AS {_PEOPLE_BODY}")
        with pytest.raises(Exception, match="Expected capabilities map"):
            Runner(f"CREATE VIRTUAL (:X) WITH CAPABILITIES AS {_PEOPLE_BODY}")


def _define_in_memory(prefix: str) -> None:
    db.register_node_source(f"{prefix}P", in_memory_node_source(PEOPLE))
    db.register_node_source(f"{prefix}C", in_memory_node_source(CITIES, max_batch_size=1))
    db.register_relationship_source(
        f"{prefix}K", f"{prefix}P", f"{prefix}P", in_memory_relationship_source(KNOWS)
    )
    db.register_relationship_source(
        f"{prefix}L",
        f"{prefix}P",
        f"{prefix}C",
        in_memory_relationship_source(LIVES, cacheable=False),
    )


class TestInMemorySources:
    @pytest.mark.parametrize("statement", DIFFERENTIAL_QUERIES)
    async def test_match_legacy(self, statement: str) -> None:
        await ensure_legacy()
        _define_in_memory("Mem")
        legacy, _ = await query(bind(statement, "Leg"))
        sourced, _ = await query(bind(statement, "Mem"), opts(page_size=2))
        if "ORDER BY" in statement:
            assert sourced == legacy
        else:
            assert ordered(sourced) == ordered(legacy)

    async def test_use_lookup_expand_and_push_down(self) -> None:
        _define_in_memory("MemS")
        results, runner = await query(
            "MATCH (a:MemSP {id: 1})-[:MemSK]->(b:MemSP) WHERE b.age > 30 RETURN b.name AS name"
        )
        assert results == [{"name": "Cid"}]
        assert runner.source_stats["calls"]["scan"] == 0
        assert runner.source_stats["calls"]["lookup"] > 0
        assert runner.source_stats["calls"]["expand"] > 0

    async def test_lookup_ids_are_type_sensitive(self) -> None:
        db.register_node_source(
            "MemT", in_memory_node_source([{"id": 1, "n": "int"}, {"id": "1", "n": "str"}])
        )
        results, _ = await query("MATCH (a:MemT {id: '1'}) RETURN a.n AS n")
        assert results == [{"n": "str"}]


class TestPythonProviderApi:
    """Base classes, snake_case aliases and the SourceRequest envelope."""

    async def test_base_classes_complete_capabilities(self) -> None:
        seen: List[Any] = []

        class People(NodeSource):
            capabilities = {"cacheable": True, "max_batch_size": 2}

            async def scan(self, request: SourceRequest, context: Any) -> Any:
                return PEOPLE

            async def lookup(self, request: SourceRequest, context: Any) -> Any:
                seen.append(request)
                return [p for p in PEOPLE if p["id"] in request.ids]

        class Knows(RelationshipSource):
            def scan(self, request: SourceRequest, context: Any) -> Any:
                return KNOWS

            def expand(self, request: SourceRequest, context: Any) -> Any:
                key = "left_id" if request.side == "left" else "right_id"
                return [k for k in KNOWS if k[key] in request.ids]

        assert People.capabilities == {
            "version": V,
            "cacheable": True,
            "maxBatchSize": 2,
            "lookup": True,
        }
        assert Knows.capabilities == {"version": V, "expand": {"left": True, "right": True}}
        assert isinstance(People(), SourceProvider)

        FlowQuery.register_node_source("BaseP", People())
        FlowQuery.register_relationship_source("BASE_K", "BaseP", "BaseP", Knows())
        results, runner = await query(
            "MATCH (a:BaseP {id: 1})-[:BASE_K]->(b:BaseP) RETURN b.id AS b"
        )
        assert ordered(results) == ordered([{"b": 2}, {"b": 3}])
        assert runner.source_stats["calls"]["scan"] == 0
        assert all(len(r.ids) <= 2 for r in seen)

    def test_abstract_scan_is_required(self) -> None:
        class Broken(NodeSource):
            pass

        with pytest.raises(TypeError):
            Broken()  # type: ignore[abstract]

    def test_declared_lookup_without_method_is_rejected(self) -> None:
        class NoLookup(NodeSource):
            capabilities = {"lookup": True}

            def scan(self, request: SourceRequest, context: Any) -> Any:
                return []

        with pytest.raises(SourceCapabilityError, match="lookup"):
            FlowQuery.register_node_source("NoLookupP", NoLookup())

    async def test_snake_case_capabilities_on_plain_providers(self) -> None:
        requests: List[Any] = []

        def lookup(request: Any, context: Any) -> Any:
            requests.append(request)
            return [p for p in PEOPLE if p["id"] in request["ids"]]

        provider = source(
            {"version": V, "lookup": True, "max_batch_size": 1},
            scan=lambda request, context: PEOPLE,
            lookup=lookup,
        )
        db.register_node_source("SnakeP", provider)
        results, _ = await query("MATCH (a:SnakeP) WHERE a.id IN [1, 2] RETURN a.id AS id")
        assert ordered(results) == ordered([{"id": 1}, {"id": 2}])

    def test_source_request_aliases(self) -> None:
        request = SourceRequest(
            {"operation": "expand", "pageSize": 7, "sourceLabel": "A", "ids": [1]}
        )
        assert request["page_size"] == 7
        assert request.page_size == 7
        assert request.get("source_label") == "A"
        assert "page_size" in request
        assert request.ids == [1]
        assert request.get("missing", "d") == "d"
        assert request == {"operation": "expand", "pageSize": 7, "sourceLabel": "A", "ids": [1]}
        with pytest.raises(AttributeError):
            request.nothing
        with pytest.raises(KeyError):
            request["nothing_here"]

    def test_normalize_capabilities(self) -> None:
        assert normalize_capabilities(
            {"version": 1, "max_batch_size": 3, "predicates": {"operators": [], "string_ordering": "binary"}}
        ) == {"version": 1, "maxBatchSize": 3, "predicates": {"operators": [], "stringOrdering": "binary"}}
        assert normalize_capabilities({"maxBatchSize": 5, "max_batch_size": 3}) == {"maxBatchSize": 5}
