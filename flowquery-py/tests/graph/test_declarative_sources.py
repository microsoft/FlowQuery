"""Declarative backend sources: the async function context, function-declared
capabilities and shorthands, and ``stringOrdering: "codepoint"``."""

import asyncio
import json
import re
import warnings
from types import SimpleNamespace
from typing import Any, AsyncIterator, Dict, Iterator, List, Optional, Set, Tuple

import pytest

import flowquery.compute.flowquery as flowquery_module
from flowquery.compute.flowquery import FlowQuery
from flowquery.compute.runner import Runner, RunnerOptions
from flowquery.graph.database import Database
from flowquery.graph.source_context import SourceOptions
from flowquery.graph.source_provider import (
    PREDICATE_OPERATORS,
    QueryCancelledError,
    SourceCapabilityError,
    SourceSignal,
    matches_predicate,
    normalize_capabilities,
)
from flowquery.parsing.functions.async_function import AsyncFunction
from flowquery.parsing.functions.function_metadata import FunctionDef

from .mock_backend import MockBackend, mock

db = Database.get_instance()

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


@FunctionDef({
    "description": "mockbackend variant without declared capabilities",
    "category": "async",
    "parameters": [],
    "output": {"description": "rows", "type": "object"},
})
class DsPlain(MockBackend):
    capabilities: Any = None

    def __init__(self) -> None:
        super().__init__("dsplain")


def _dynamic_capabilities(request: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    DsDynamic.asked.append(request)
    label = request.get("label")
    return {"lookup": True} if isinstance(label, str) and label.endswith("P") else None


@FunctionDef({
    "description": "mockbackend variant answering capabilities per label",
    "category": "async",
    "parameters": [],
    "output": {"description": "rows", "type": "object"},
})
class DsDynamic(MockBackend):
    asked: List[Dict[str, Any]] = []
    capabilities: Any = staticmethod(_dynamic_capabilities)

    def __init__(self) -> None:
        super().__init__("dsdynamic")


@FunctionDef({
    "description": "Backend that blocks until the query signal aborts",
    "category": "async",
    "parameters": [],
    "output": {"description": "rows", "type": "object"},
})
class DsBlocking(AsyncFunction):
    started: Optional[asyncio.Event] = None
    aborted_seen = False

    def __init__(self) -> None:
        super().__init__("dsblocking")

    async def generate(self, request: Any = None) -> AsyncIterator[Any]:
        assert self.context is not None
        signal = self.context.signal
        if DsBlocking.started is not None:
            DsBlocking.started.set()
        try:
            await signal.wait()
        finally:
            DsBlocking.aborted_seen = signal.aborted
        yield {"id": 1}


@FunctionDef({
    "description": "Code-point ordered string backend",
    "category": "async",
    "parameters": [],
    "output": {"description": "rows", "type": "object"},
})
class DsCodepoint(AsyncFunction):
    capabilities: Any = {
        "predicates": {
            "operators": ["eq", "in", "gt", "gte", "lt", "lte"],
            "stringOrdering": "codepoint",
        },
    }
    rows: List[Dict[str, Any]] = []
    requests: List[Any] = []

    def __init__(self) -> None:
        super().__init__("dscodepoint")

    async def generate(self, request: Any = None) -> AsyncIterator[Any]:
        DsCodepoint.requests.append(request)
        predicate = request.get("predicate") if isinstance(request, dict) else None
        for row in DsCodepoint.rows:
            # Python compares str by code point, so this is code-point order.
            if matches_predicate(predicate, row):
                yield row


def node_body(fn: str, label: str) -> str:
    return (
        f"{{ LOAD JSON FROM {fn}($request, '{label}') AS n "
        "RETURN n.id AS id, n.name AS name, n.age AS age }"
    )


def rel_body(fn: str, rel_type: str) -> str:
    return (
        f"{{ LOAD JSON FROM {fn}($request, 'rel:{rel_type}') AS r "
        "RETURN r.left_id AS left_id, r.right_id AS right_id, r.since AS since }"
    )


_seeded: Set[str] = set()


async def define(prefix: str, fn: str, caps: str = "") -> None:
    """Seed the mock with PEOPLE / KNOWS under ``prefix`` and define both over ``fn``."""
    if prefix not in _seeded:
        _seeded.add(prefix)
        mock.add_nodes(f"{prefix}_P", PEOPLE)
        mock.add_relationships(f"{prefix}_K", KNOWS)
    clause = "" if caps == "" else f" WITH CAPABILITIES {caps}"
    await Runner(
        f"CREATE VIRTUAL (:{prefix}_P){clause} AS {node_body(fn, f'{prefix}_P')}"
    ).run()
    await Runner(
        f"CREATE VIRTUAL (:{prefix}_P)-[:{prefix}_K]-(:{prefix}_P){clause} AS "
        f"{rel_body(fn, f'{prefix}_K')}"
    ).run()


def literal(rows: List[Dict[str, Any]]) -> str:
    return re.sub(r'"(\w+)":', r"\1:", json.dumps(rows))


_legacy_defined = False


async def ensure_legacy() -> None:
    global _legacy_defined
    if _legacy_defined:
        return
    await Runner(
        f"CREATE VIRTUAL (:DsLeg_P) AS {{ UNWIND {literal(PEOPLE)} AS n "
        "RETURN n.id AS id, n.name AS name, n.age AS age }"
    ).run()
    await Runner(
        f"CREATE VIRTUAL (:DsLeg_P)-[:DsLeg_K]-(:DsLeg_P) AS {{ UNWIND {literal(KNOWS)} AS r "
        "RETURN r.left_id AS left_id, r.right_id AS right_id, r.since AS since }"
    ).run()
    _legacy_defined = True


async def query(
    statement: str, options: Optional[RunnerOptions] = None
) -> Tuple[List[Dict[str, Any]], Runner]:
    runner = Runner(statement, options=options)
    await runner.run()
    return runner.results, runner


def ordered(rows: List[Any]) -> List[str]:
    return sorted(json.dumps(r, sort_keys=True) for r in rows)


def bind(statement: str, prefix: str) -> str:
    return statement.replace("$P", f"{prefix}_P").replace("$K", f"{prefix}_K")


def page_size(n: int) -> RunnerOptions:
    return RunnerOptions(sources=SourceOptions(page_size=n))


QUERIES = [
    "MATCH (a:$P)-[:$K]->(b:$P) RETURN a.id AS a, b.id AS b",
    "MATCH (a:$P)<-[:$K]-(b:$P) RETURN a.id AS a, b.id AS b",
    "MATCH (a:$P {name: 'Ann'})-[:$K]->(b:$P) RETURN b.name AS name",
    "MATCH (a:$P)-[r:$K]->(b:$P) WHERE a.age > 30 RETURN a.id AS a, r.since AS since, b.id AS b",
    "MATCH (a:$P)-[:$K]->(b:$P) WHERE b.id IN [2, 3] AND a.age >= 25 RETURN a.id AS a, b.id AS b",
    "MATCH (a:$P)-[:$K]->(b:$P)-[:$K]->(c:$P) RETURN a.id AS a, b.id AS b, c.id AS c",
    "MATCH (a:$P)-[:$K*1..3]->(b:$P) RETURN a.id AS a, b.id AS b",
    "MATCH (a:$P)-[:$K]->(b:$P {id: 3}) RETURN a.id AS a",
    "MATCH (a:$P) WHERE a.name >= 'Cid' AND a.name < 'Fay' RETURN a.name AS name",
    "MATCH (a:$P) RETURN a.name AS name ORDER BY name LIMIT 2",
]


@pytest.fixture(autouse=True)
def reset_mock() -> None:
    mock.reset()


@pytest.fixture(scope="module", autouse=True)
def drop_definitions() -> Iterator[None]:
    """Database definitions are process-wide: drop this module's ones
    (``(:DsBlock)`` would block any later ``MATCH (n)``)."""
    yield
    for label in [label for label in db.nodes if label.startswith("Ds")]:
        db.nodes.pop(label, None)
    for rel_type in [t for t in db.relationships if t.startswith("Ds")]:
        db.relationships.pop(rel_type, None)


def _plain(request: Any) -> Dict[str, Any]:
    return dict(request) if isinstance(request, dict) else request


class TestCodepointOrdering:
    """Item 3: ``stringOrdering: "codepoint"``."""

    strings = ["a", "b", "\uE000", "\uFFFF", "😀", "😀b", "\uD7FF", "z"]
    _defined = False

    async def _define(self) -> None:
        if TestCodepointOrdering._defined:
            return
        DsCodepoint.rows = [{"id": i, "s": s} for i, s in enumerate(self.strings)]
        await Runner(
            "CREATE VIRTUAL (:DsCp) AS { LOAD JSON FROM dscodepoint($request) AS n "
            "RETURN n.id AS id, n.s AS s }"
        ).run()
        await Runner(
            "CREATE VIRTUAL (:DsCpScan) AS { LOAD JSON FROM dscodepoint(null) AS n "
            "RETURN n.id AS id, n.s AS s }"
        ).run()
        TestCodepointOrdering._defined = True

    async def test_a_codepoint_source_receives_gte_and_lt_string_terms(self) -> None:
        await self._define()
        DsCodepoint.requests = []
        results, _ = await query("MATCH (n:DsCp) WHERE n.s >= 'a' AND n.s < 'c' RETURN n.s AS s")
        assert ordered(results) == ordered([{"s": "a"}, {"s": "b"}])
        assert DsCodepoint.requests[0]["predicate"] == {
            "op": "and",
            "terms": [
                {"op": "gte", "property": "s", "value": "a"},
                {"op": "lt", "property": "s", "value": "c"},
            ],
        }

    @pytest.mark.parametrize(
        "where",
        [
            "n.s >= '\uFFFF'",
            "n.s < '\uFFFF'",
            "n.s > '\uE000'",
            "n.s <= '😀'",
            "n.s >= 'b' AND n.s < '😀b'",
            "n.s > '\uD7FF'",
            "n.s < 'z'",
        ],
    )
    async def test_matches_an_unpushed_scan(self, where: str) -> None:
        await self._define()
        pushed, _ = await query(f"MATCH (n:DsCp) WHERE {where} RETURN n.s AS s")
        scanned, _ = await query(f"MATCH (n:DsCpScan) WHERE {where} RETURN n.s AS s")
        assert ordered(pushed) == ordered(scanned)

    async def test_bounds_at_or_above_u_d800_are_pushed_in_python(self) -> None:
        # TypeScript keeps such bounds in FlowQuery (its strings are UTF-16);
        # Python compares str by code point, so every string bound is pushed.
        await self._define()
        DsCodepoint.requests = []
        await query("MATCH (n:DsCp) WHERE n.s < '\uFFFF' AND n.s > 'a' RETURN n.s AS s")
        predicate = DsCodepoint.requests[0]["predicate"]
        assert predicate["op"] == "and"
        assert ordered(predicate["terms"]) == ordered([
            {"op": "lt", "property": "s", "value": "\uFFFF"},
            {"op": "gt", "property": "s", "value": "a"},
        ])

    async def test_invalid_string_ordering_is_rejected(self) -> None:
        with pytest.raises(SourceCapabilityError):
            await Runner(
                "CREATE VIRTUAL (:DsCpBad) WITH CAPABILITIES "
                "{predicates: {operators: ['lt'], stringOrdering: 'locale'}} AS { RETURN 1 AS id }"
            ).run()


class TestAsyncFunctionContext:
    """Item 4: async functions see the query context."""

    async def test_every_request_shares_one_snapshot_opened_and_closed_once(self) -> None:
        await define("DsCtx", "mockbackend")
        mock.reset()
        results, _ = await query(
            "MATCH (a:DsCtx_P {id: 1})-[:DsCtx_K]->(b:DsCtx_P) MATCH (c:DsCtx_P) "
            "WHERE c.age > 40 RETURN b.id AS b, c.id AS c"
        )
        assert ordered(results) == ordered([{"b": 2, "c": 3}, {"b": 3, "c": 3}])
        operations = {r["operation"] for r in mock.requests}
        assert operations == {"scan", "lookup", "expand"}
        snapshots = [e["snapshot"] for e in mock.log]
        assert snapshots[0] == {"snapshot": 1}
        assert all(s is snapshots[0] for s in snapshots)
        assert all(isinstance(e["signal"], SourceSignal) for e in mock.log)
        assert mock.opened == 1
        assert mock.closed == 1

    async def test_the_read_context_is_closed_when_the_query_fails(self) -> None:
        await define("DsCtx", "mockbackend")
        mock.reset()
        mock.fail_on = "expand"
        with pytest.raises(Exception, match="backend failure"):
            await query("MATCH (a:DsCtx_P {id: 1})-[:DsCtx_K]->(b:DsCtx_P) RETURN b.id AS b")
        assert mock.opened == 1
        assert mock.closed == 1

    async def test_functions_see_the_query_signal_which_cancel_aborts(self) -> None:
        await Runner(
            "CREATE VIRTUAL (:DsBlock) WITH CAPABILITIES {} AS "
            "{ LOAD JSON FROM dsblocking($request) AS n RETURN n.id AS id }"
        ).run()
        DsBlocking.started = asyncio.Event()
        DsBlocking.aborted_seen = False
        runner = Runner("MATCH (n:DsBlock) RETURN n.id AS id")
        done = asyncio.ensure_future(runner.run())
        await asyncio.wait_for(DsBlocking.started.wait(), 5)
        runner.cancel()
        with pytest.raises(QueryCancelledError):
            await asyncio.wait_for(done, 5)
        await asyncio.sleep(0)
        assert DsBlocking.aborted_seen is True

    async def test_the_snapshot_is_closed_when_the_query_is_cancelled(self) -> None:
        await define("DsCtx", "mockbackend")
        mock.reset()
        runner = Runner("MATCH (a:DsCtx_P) RETURN a.id AS id")
        runner.cancel()
        with pytest.raises(QueryCancelledError):
            await runner.run()
        assert mock.closed == mock.opened

    async def test_top_level_load_and_call_also_get_a_context(self) -> None:
        await define("DsCtx", "mockbackend")
        mock.reset()
        results, _ = await query("LOAD JSON FROM mockbackend(null, 'DsCtx_P') AS n RETURN n.id AS id")
        assert len(results) == len(PEOPLE)
        assert isinstance(mock.log[0]["signal"], SourceSignal)
        assert mock.opened == 1
        assert mock.closed == 1


class TestDeclarativeProviderContract:
    """Item 4: declarative definitions cover the provider contract."""

    @pytest.mark.parametrize("statement", QUERIES)
    async def test_matches_legacy(self, statement: str) -> None:
        await ensure_legacy()
        await define("DsDecl", "mockbackend", "{maxBatchSize: 2}")
        legacy, _ = await query(bind(statement, "DsLeg"))
        declarative, _ = await query(bind(statement, "DsDecl"), page_size(2))
        if "ORDER BY" in statement:
            assert declarative == legacy
        else:
            assert ordered(declarative) == ordered(legacy)

    async def test_batching_expansions_honour_max_batch_size(self) -> None:
        await define("DsDecl", "mockbackend", "{maxBatchSize: 2}")
        mock.reset()
        _, runner = await query(
            "MATCH (a:DsDecl_P)-[:DsDecl_K]->(b:DsDecl_P) RETURN a.id AS a, b.id AS b"
        )
        expands = [r for r in mock.requests if r is not None and r.get("operation") == "expand"]
        assert len(expands) > 0
        assert all(len(r["ids"]) <= 2 for r in expands)
        assert runner.source_stats["batches"] > 0

    async def test_push_down_reaches_the_backend(self) -> None:
        await define("DsDecl", "mockbackend", "{maxBatchSize: 2}")
        mock.reset()
        await query("MATCH (a:DsDecl_P) WHERE a.age > 30 RETURN a.id AS id")
        assert mock.requests[0]["predicate"] == {"op": "gt", "property": "age", "value": 30}

    async def test_streaming_and_early_termination(self) -> None:
        await define("DsDecl", "mockbackend", "{maxBatchSize: 2}")
        mock.reset()
        results, _ = await query("MATCH (a:DsDecl_P) RETURN a.id AS id LIMIT 1", page_size(1))
        assert len(results) == 1
        assert mock.yielded < len(PEOPLE)

    async def test_caching_serves_repeated_reads(self) -> None:
        await define("DsDecl", "mockbackend", "{maxBatchSize: 2}")
        _, runner = await query(
            "MATCH (a:DsDecl_P {id: 1}) MATCH (b:DsDecl_P {id: 1}) RETURN a.id AS a, b.id AS b"
        )
        assert runner.source_stats["cacheHits"] > 0

    async def test_start_point_reordering(self) -> None:
        await define("DsDecl", "mockbackend", "{maxBatchSize: 2}")
        _, runner = await query(
            "MATCH (a:DsDecl_P)-[:DsDecl_K]->(b:DsDecl_P {id: 3}) RETURN a.id AS a"
        )
        assert any(p["start"] == "last" for p in runner.source_stats["plans"])


class TestDeprecatedApis:
    """Item 4: the programmatic registration APIs are deprecated."""

    async def test_still_work_and_warn_once(self) -> None:
        flowquery_module._warned.discard("FlowQuery.register_node_source")
        provider = SimpleNamespace(capabilities={"version": 1}, scan=lambda req, ctx: [{"id": 1}])
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            FlowQuery.register_node_source("DsDep", provider)
            FlowQuery.register_node_source("DsDep", provider)
            results, _ = await query("MATCH (n:DsDep) RETURN n.id AS id")
        assert results == [{"id": 1}]
        calls = [
            w for w in caught
            if issubclass(w.category, DeprecationWarning)
            and "FlowQuery.register_node_source is deprecated" in str(w.message)
        ]
        assert len(calls) == 1


def _strip(requests: List[Any], prefix: str) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for request in requests:
        r = _plain(request)
        for field in ("label", "type"):
            if isinstance(r.get(field), str):
                r[field] = r[field].replace(prefix, "")
        r.pop("sourceLabel", None)
        r.pop("targetLabel", None)
        out.append(r)
    return out


class TestDeclaredCapabilities:
    """Item 5: function-declared capabilities and shorthands."""

    async def test_a_definition_without_a_clause_uses_declared_capabilities(self) -> None:
        await define("DsAuto", "mockbackend")
        await define(
            "DsLong",
            "mockbackend",
            "{lookup: true, expand: {left: true, right: true}, streaming: true, cacheable: true, "
            "predicates: {operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'in']}}",
        )
        assert db.nodes["DsAuto_P"].provider.capabilities == {
            "version": 1,
            "lookup": True,
            "streaming": True,
            "cacheable": True,
            "predicates": {"operators": list(PREDICATE_OPERATORS)},
            "writes": True,
        }
        statement = "MATCH (a:$P {id: 1})-[:$K]->(b:$P) WHERE b.age > 30 RETURN b.name AS name"
        mock.reset()
        auto, _ = await query(bind(statement, "DsAuto"))
        auto_log = _strip(mock.requests, "DsAuto")
        mock.reset()
        long, _ = await query(bind(statement, "DsLong"))
        long_log = _strip(mock.requests, "DsLong")
        assert auto == [{"name": "Cid"}]
        assert long == auto
        assert auto_log == long_log
        assert {r["operation"] for r in auto_log} == {"lookup", "expand"}

    async def test_an_explicit_clause_overrides_declared_capabilities(self) -> None:
        await define("DsOff", "mockbackend", "{predicates: false}")
        mock.reset()
        await query("MATCH (a:DsOff_P) WHERE a.age > 30 RETURN a.id AS id")
        assert len(mock.requests) > 0
        assert all(r["predicate"] is None for r in mock.requests)
        assert db.nodes["DsOff_P"].provider.capabilities["lookup"] is True

    def test_shorthands_normalize_to_the_long_forms(self) -> None:
        assert normalize_capabilities({"predicates": True, "expand": True}, "relationship") == (
            normalize_capabilities(
                {
                    "predicates": {"operators": ["eq", "gt", "gte", "lt", "lte", "in"]},
                    "expand": {"left": True, "right": True},
                },
                "relationship",
            )
        )
        assert "stringOrdering" not in normalize_capabilities({"predicates": True}, "node")["predicates"]
        assert normalize_capabilities({"expand": True, "lookup": True}, "node") == {
            "version": 1,
            "lookup": True,
        }
        assert normalize_capabilities({"expand": True, "lookup": True}, "relationship") == {
            "version": 1,
            "expand": {"left": True, "right": True},
        }

    async def test_shorthands_work_in_with_capabilities(self) -> None:
        await define("DsShort", "dsplain", "{predicates: true, expand: true}")
        assert db.relationships["DsShort_K"]["DsShort_P:DsShort_P"].provider.capabilities == {
            "version": 1,
            "expand": {"left": True, "right": True},
            "predicates": {"operators": list(PREDICATE_OPERATORS)},
        }

    async def test_a_function_without_declared_capabilities_behaves_as_today(self) -> None:
        await define("DsEager", "dsplain")
        assert db.nodes["DsEager_P"].provider is None
        results, _ = await query("MATCH (a:DsEager_P {id: 2}) RETURN a.name AS name")
        assert results == [{"name": "Bob"}]

    async def test_capabilities_can_be_answered_per_label(self) -> None:
        DsDynamic.asked = []
        await define("DsDyn", "dsdynamic")
        assert DsDynamic.asked == [
            {"version": 1, "operation": "capabilities", "label": "DsDyn_P"},
            {
                "version": 1,
                "operation": "capabilities",
                "type": "DsDyn_K",
                "sourceLabel": "DsDyn_P",
                "targetLabel": "DsDyn_P",
            },
        ]
        assert db.nodes["DsDyn_P"].provider.capabilities == {"version": 1, "lookup": True}
        assert db.relationships["DsDyn_K"]["DsDyn_P:DsDyn_P"].provider is None

    async def test_source_capabilities_exposes_the_effective_capabilities(self) -> None:
        await define("DsInfo", "mockbackend", "{predicates: false}")
        results, _ = await query(
            "LOAD JSON FROM source_capabilities() AS s WITH s "
            "WHERE s.label = 'DsInfo_P' OR s.type = 'DsInfo_K' RETURN s"
        )
        assert [r["s"] for r in results] == [
            {
                "kind": "node",
                "label": "DsInfo_P",
                "mode": "statement",
                "capabilities": {
                    "version": 1,
                    "lookup": True,
                    "streaming": True,
                    "cacheable": True,
                    "writes": True,
                },
            },
            {
                "kind": "relationship",
                "type": "DsInfo_K",
                "from_label": "DsInfo_P",
                "to_label": "DsInfo_P",
                "mode": "statement",
                "capabilities": {
                    "version": 1,
                    "expand": {"left": True, "right": True},
                    "streaming": True,
                    "cacheable": True,
                    "writes": True,
                },
            },
        ]
