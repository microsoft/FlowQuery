"""Declarative writes (CREATE / MERGE / SET / REMOVE / [DETACH] DELETE)
sent as one change set to the definitions' backend function."""

import asyncio
import re
from typing import Any, AsyncIterator, Dict, Iterator, List, Optional

import pytest

from flowquery.compute.runner import Runner, RunnerOptions
from flowquery.graph.database import Database
from flowquery.graph.source_provider import QueryCancelledError
from flowquery.parsing.functions.async_function import AsyncFunction
from flowquery.parsing.functions.function_metadata import FunctionDef

from .mock_backend import mock


@FunctionDef({
    "description": "Blocks until the query signal aborts (tests only)",
    "category": "async",
    "parameters": [],
    "output": {"description": "rows", "type": "object"},
})
class WtBlock(AsyncFunction):
    started: Optional[asyncio.Event] = None

    def __init__(self) -> None:
        super().__init__("wtblock")

    async def generate(self) -> AsyncIterator[Any]:
        assert self.context is not None
        signal = self.context.signal
        if WtBlock.started is not None:
            WtBlock.started.set()
        await signal.wait()
        yield {"x": 1}


async def run(statement: str, parameters: Optional[Dict[str, Any]] = None) -> Runner:
    runner = Runner(statement, options=RunnerOptions(parameters=parameters))
    await runner.run()
    return runner


PEOPLE = [
    {"id": 1, "name": "Ada"},
    {"id": 2, "name": "Ben"},
    {"id": 13, "name": "Cy"},
]
COMPANIES = [{"id": 42, "name": "Acme"}]


def seed() -> None:
    mock.clear()
    mock.reset()
    mock.add_nodes("WP", PEOPLE)
    mock.add_nodes("WC", COMPANIES)
    mock.add_relationships("KNOWS", [{"id": 99, "left_id": 1, "right_id": 2, "since": 2010}])
    mock.add_relationships("WORKS_AT", [{"id": 98, "left_id": 13, "right_id": 42}])
    mock.add_nodes("TP", PEOPLE)


_defined = False


async def ensure_definitions() -> None:
    global _defined
    if _defined:
        return
    await run(
        "CREATE VIRTUAL (:WP) AS { LOAD JSON FROM mockbackend($request) AS n RETURN n.id AS id, "
        "n.name AS name, n.title AS title, n.team AS team, n.seen AS seen }"
    )
    await run(
        "CREATE VIRTUAL (:WC) AS { LOAD JSON FROM mockbackend($request) AS n RETURN n.id AS id, n.name AS name }"
    )
    await run(
        "CREATE VIRTUAL (:WP)-[:KNOWS]-(:WP) AS { LOAD JSON FROM mockbackend($request) AS r RETURN r.id AS id, "
        "r.left_id AS left_id, r.right_id AS right_id, r.since AS since, r.new AS new }"
    )
    await run(
        "CREATE VIRTUAL (:WP)-[:WORKS_AT]-(:WC) AS { LOAD JSON FROM mockbackend($request) AS r RETURN r.id AS id, "
        "r.left_id AS left_id, r.right_id AS right_id }"
    )
    await run(
        "CREATE VIRTUAL (:WRO) WITH CAPABILITIES {writes: false} AS "
        "{ LOAD JSON FROM mockbackend($request) AS n RETURN n.id AS id }"
    )
    await run("CREATE VIRTUAL (:WEager) AS { UNWIND [{id: 1}] AS r RETURN r.id AS id }")
    await run(
        "CREATE VIRTUAL (:TP) AS { LOAD JSON FROM mocktxbackend($request) AS n RETURN n.id AS id, "
        "n.name AS name, n.title AS title }"
    )
    _defined = True


@pytest.fixture(scope="module", autouse=True)
def keep_other_modules_data() -> Iterator[None]:
    """The mock is shared by every test module: restore its data afterwards
    and drop this module's definitions."""
    saved = mock.store
    yield
    mock.store = saved
    mock.reset()
    db = Database.get_instance()
    for label in ("WP", "WC", "WRO", "WEager", "TP"):
        db.nodes.pop(label, None)
    db.relationships.get("KNOWS", {}).pop("WP:WP", None)
    if not db.relationships.get("KNOWS", True):
        db.relationships.pop("KNOWS", None)
    db.relationships.pop("WORKS_AT", None)


@pytest.fixture(autouse=True)
async def seeded() -> None:
    await ensure_definitions()
    seed()


class TestChangeSets:
    async def test_create_nodes_and_relationships_with_temporary_ids(self) -> None:
        runner = await run(
            "MATCH (b:WP {name: 'Ben'}) CREATE (n:WP {name: 'Dee'})-[:KNOWS {since: 2020}]->(b) "
            "RETURN n.id AS id, n.name AS name"
        )
        assert mock.change_sets == [
            [
                {"op": "createNode", "ref": "$1", "labels": ["WP"], "properties": {"name": "Dee"}},
                {
                    "op": "createRelationship",
                    "ref": "$2",
                    "type": "KNOWS",
                    "start": "$1",
                    "end": 2,
                    "properties": {"since": 2020},
                },
            ]
        ]
        assert runner.write_result is not None
        id_ = runner.write_result.ids["$1"]
        assert isinstance(id_, int)
        assert runner.results == [{"id": id_, "name": "Dee"}]
        assert runner.write_result.stats["nodesCreated"] == 1
        assert runner.write_result.stats["relationshipsCreated"] == 1
        back = await run("MATCH (a:WP {name: 'Dee'})-[:KNOWS]->(b:WP) RETURN a.id AS a, b.name AS b")
        assert back.results == [{"a": id_, "b": "Ben"}]

    async def test_one_create_per_row_refs_are_unique_across_rows(self) -> None:
        await run("UNWIND ['E', 'F'] AS name CREATE (n:WP {name: name})")
        assert mock.change_sets[0] == [
            {"op": "createNode", "ref": "$1", "labels": ["WP"], "properties": {"name": "E"}},
            {"op": "createNode", "ref": "$2", "labels": ["WP"], "properties": {"name": "F"}},
        ]

    async def test_aggregated_return_after_create_gets_the_final_ids(self) -> None:
        runner = await run(
            "UNWIND ['E', 'F'] AS name CREATE (n:WP {name: name}) RETURN collect(n.id) AS ids"
        )
        ids = runner.write_result.ids
        assert runner.results == [{"ids": [ids["$1"], ids["$2"]]}]
        assert all(isinstance(i, int) for i in runner.results[0]["ids"])

    async def test_set_remove_and_labels_produce_entries_in_order(self) -> None:
        runner = await run(
            "MATCH (p:WP {id: 13}) SET p.title = 'CTO', p += {team: 'Core'} SET p:Manager "
            "REMOVE p.team, p:Intern RETURN p.title AS title, p.team AS team"
        )
        assert mock.change_sets[0] == [
            {"op": "setProperties", "target": 13, "label": "WP", "properties": {"title": "CTO"}},
            {"op": "setProperties", "target": 13, "label": "WP", "properties": {"team": "Core"}},
            {"op": "addLabels", "target": 13, "label": "WP", "labels": ["Manager"]},
            {"op": "setProperties", "target": 13, "label": "WP", "properties": {"team": None}},
            {"op": "removeLabels", "target": 13, "label": "WP", "labels": ["Intern"]},
        ]
        assert runner.results[0]["title"] == "CTO"
        assert runner.results[0].get("team") is None
        node = mock.node(13, "WP")
        assert node is not None
        assert node.properties == {"name": "Cy", "title": "CTO"}
        assert mock.node(13, "Manager") is not None

    async def test_parameters_work_in_write_clauses(self) -> None:
        await run("MATCH (p:WP {id: $id}) SET p.title = $title", {"id": 1, "title": "CEO"})
        assert mock.change_sets[0] == [
            {"op": "setProperties", "target": 1, "label": "WP", "properties": {"title": "CEO"}},
        ]

    async def test_set_on_a_relationship_and_delete_of_a_relationship(self) -> None:
        await run("MATCH (a:WP {id: 1})-[r:KNOWS]->(b:WP) SET r.since = 2011")
        assert mock.change_sets[0] == [
            {"op": "setProperties", "target": 99, "type": "KNOWS", "properties": {"since": 2011}},
        ]
        await run("MATCH (a:WP {id: 1})-[r:KNOWS]->(b:WP) DELETE r")
        assert mock.change_sets[1] == [{"op": "deleteRelationship", "target": 99, "type": "KNOWS"}]
        back = await run("MATCH (a:WP {id: 1})-[:KNOWS]->(b:WP) RETURN b.id AS b")
        assert back.results == []

    async def test_set_after_create_targets_the_temporary_id(self) -> None:
        await run("CREATE (n:WP {name: 'G'}) SET n.title = 'New'")
        assert mock.change_sets[0] == [
            {"op": "createNode", "ref": "$1", "labels": ["WP"], "properties": {"name": "G"}},
            {"op": "setProperties", "target": "$1", "label": "WP", "properties": {"title": "New"}},
        ]
        back = await run("MATCH (n:WP {name: 'G'}) RETURN n.title AS title")
        assert back.results == [{"title": "New"}]


class TestMerge:
    merge = (
        "MERGE (p:WP {name: 'Zed'}) ON CREATE SET p.team = 'Core' ON MATCH SET p.seen = true "
        "RETURN p.id AS id, p.name AS name"
    )

    async def test_running_the_same_merge_twice_creates_once_then_applies_on_match(self) -> None:
        first = await run(self.merge)
        assert mock.change_sets[0] == [
            {
                "op": "mergeNode",
                "ref": "$1",
                "label": "WP",
                "key": {"name": "Zed"},
                "onCreate": {"team": "Core"},
                "onMatch": {"seen": True},
            },
        ]
        second = await run(self.merge)
        assert second.results == first.results
        zed = await run("MATCH (p:WP {name: 'Zed'}) RETURN p.team AS team, p.seen AS seen")
        assert zed.results == [{"team": "Core", "seen": True}]

    async def test_relationship_merge_between_bound_nodes(self) -> None:
        statement = (
            "MATCH (a:WP {id: 1}), (b:WP {id: 13}) MERGE (a)-[r:KNOWS {since: 2024}]->(b) "
            "ON CREATE SET r.new = true"
        )
        await run(statement)
        assert mock.change_sets[0] == [
            {
                "op": "mergeRelationship",
                "ref": "$1",
                "type": "KNOWS",
                "start": 1,
                "end": 13,
                "key": {"since": 2024},
                "onCreate": {"new": True},
                "onMatch": {},
            },
        ]
        await run(statement)
        back = await run(
            "MATCH (a:WP {id: 1})-[r:KNOWS]->(b:WP {id: 13}) RETURN r.since AS since, r.new AS new"
        )
        assert back.results == [{"since": 2024, "new": True}]


class TestDelete:
    async def test_detach_delete_removes_a_node_and_its_relationships(self) -> None:
        await run("MATCH (c:WP {id: 13}) DETACH DELETE c")
        assert mock.change_sets[0] == [{"op": "deleteNode", "target": 13, "label": "WP", "detach": True}]
        assert mock.node(13, "WP") is None
        assert mock.relationship_rows("WORKS_AT") == []

    async def test_plain_delete_of_a_connected_node_fails_and_nothing_is_applied(self) -> None:
        with pytest.raises(Exception, match="still has relationships"):
            await run("MATCH (c:WP {id: 13}) SET c.title = 'X' DELETE c")
        node = mock.node(13, "WP")
        assert node is not None
        assert node.properties == {"name": "Cy"}


class TestAtomicityAndFailures:
    async def test_a_failing_query_sends_nothing(self) -> None:
        mock.fail_on = "lookup"
        with pytest.raises(Exception, match="backend failure"):
            await run("MATCH (p:WP {id: 1}) SET p.title = 'X' WITH p MATCH (q:WP {id: 2}) RETURN q.id AS q")
        assert mock.change_sets == []
        node = mock.node(1, "WP")
        assert node is not None
        assert "title" not in node.properties

    async def test_a_cancelled_query_sends_nothing(self) -> None:
        runner = Runner("MATCH (p:WP {id: 1}) SET p.title = 'X'")
        runner.cancel()
        with pytest.raises(QueryCancelledError):
            await runner.run()
        assert mock.change_sets == []

    async def test_a_failing_backend_write_fails_the_query_and_nothing_is_applied(self) -> None:
        mock.fail_on = "write"
        with pytest.raises(Exception, match=re.escape("Write through mockbackend failed: backend failure")):
            await run("CREATE (n:WP {name: 'H'})")
        assert not any(r.get("name") == "H" for r in mock.node_rows("WP"))

    async def test_later_statements_of_the_same_query_do_not_see_the_changes(self) -> None:
        runner = await run("CREATE (n:WP {name: 'S1'}); MATCH (n:WP {name: 'S1'}) RETURN n.id AS id")
        assert runner.results == []
        back = await run("MATCH (n:WP {name: 'S1'}) RETURN n.name AS name")
        assert back.results == [{"name": "S1"}]

    async def test_match_sees_the_store_as_it_was_when_the_query_started(self) -> None:
        runner = await run("CREATE (n:WP {name: 'S2'}) WITH n MATCH (m:WP {name: 'S2'}) RETURN m.id AS id")
        assert runner.results == []


class TestValidation:
    async def test_writes_to_a_definition_without_writes_are_rejected_before_the_query_runs(self) -> None:
        with pytest.raises(Exception, match=re.escape("(:WRO): its definition does not declare the writes capability")):
            await run("MATCH (n:WRO) SET n.x = 1")
        assert mock.log == []

    async def test_eager_definitions_and_undefined_labels_cannot_be_written(self) -> None:
        with pytest.raises(Exception, match="does not declare the writes capability"):
            await run("CREATE (n:WEager {id: 2})")
        with pytest.raises(Exception, match=re.escape("(:Nope): it has no CREATE VIRTUAL definition")):
            await run("CREATE (n:Nope {id: 2})")

    def test_write_clauses_are_not_allowed_inside_definitions(self) -> None:
        with pytest.raises(Exception, match="CREATE is not allowed inside virtual"):
            Runner("CREATE VIRTUAL (:WX) AS { CREATE (n:WP {name: 'x'}) RETURN 1 AS id }")

    def test_set_targets_must_be_bound_graph_elements(self) -> None:
        with pytest.raises(Exception, match="SET target x must be a node or relationship"):
            Runner("WITH 1 AS x SET x.y = 2")
        with pytest.raises(
            Exception, match=re.escape("ON CREATE / ON MATCH SET only supports property updates")
        ):
            Runner("MERGE (n:WP {name: 'x'}) ON CREATE SET n = {a: 1}")

    async def test_transactions_requires_writes(self) -> None:
        with pytest.raises(Exception, match=re.escape("transactions requires writes: true")):
            await run(
                "CREATE VIRTUAL (:TBad) WITH CAPABILITIES {writes: false, transactions: true} AS "
                "{ LOAD JSON FROM mockbackend($request) AS n RETURN n.id AS id }"
            )


class TestReplaceProperties:
    async def test_on_a_node(self) -> None:
        runner = await run(
            "MATCH (p:WP {id: 13}) SET p = {title: 'CTO'} RETURN p.name AS name, p.title AS title"
        )
        assert mock.change_sets[0] == [
            {"op": "replaceProperties", "target": 13, "label": "WP", "properties": {"title": "CTO"}},
        ]
        assert runner.results[0]["title"] == "CTO"
        assert runner.results[0].get("name") is None
        node = mock.node(13, "WP")
        assert node is not None
        assert node.properties == {"title": "CTO"}

    async def test_on_a_relationship_with_a_parameter(self) -> None:
        await run("MATCH (a:WP {id: 1})-[r:KNOWS]->(b:WP) SET r = $props", {"props": {"note": "x"}})
        assert mock.change_sets[0] == [
            {"op": "replaceProperties", "target": 99, "type": "KNOWS", "properties": {"note": "x"}},
        ]
        assert mock.relationship_rows("KNOWS") == [{"id": 99, "left_id": 1, "right_id": 2, "note": "x"}]


def _operations() -> List[Any]:
    return [r.get("operation") if isinstance(r, dict) else None for r in mock.requests]


def _tp_names() -> List[Any]:
    return [r.get("name") for r in mock.node_rows("TP")]


class TestTransactions:
    async def test_a_later_clause_reads_the_querys_own_writes_with_final_ids(self) -> None:
        runner = await run(
            "CREATE (n:TP {name: 'S2'}) WITH n MATCH (m:TP {name: 'S2'}) RETURN n.id AS n, m.id AS m"
        )
        assert len(runner.results) == 1
        assert isinstance(runner.results[0]["n"], int)
        assert runner.results[0]["m"] == runner.results[0]["n"]
        assert mock.commits == 1
        assert "S2" in _tp_names()

    async def test_later_statements_read_earlier_statements_writes(self) -> None:
        runner = await run("CREATE (n:TP {name: 'S1'}); MATCH (n:TP {name: 'S1'}) RETURN n.name AS name")
        assert runner.results == [{"name": "S1"}]

    async def test_without_later_reads_changes_are_sent_once_and_committed(self) -> None:
        await run("UNWIND ['a', 'b', 'c'] AS x CREATE (:TP {name: x})")
        assert len(mock.change_sets) == 1
        assert len(mock.change_sets[0]) == 3
        assert [o for o in _operations() if o in ("write", "commit")] == ["write", "commit"]

    async def test_with_later_reads_each_rows_writes_are_sent_before_the_next_read(self) -> None:
        runner = await run(
            "UNWIND ['p', 'q'] AS x CREATE (:TP {name: x}) WITH x MATCH (t:TP) "
            "WHERE t.name IN ['p', 'q'] RETURN x, count(t) AS c"
        )
        assert len(mock.change_sets) == 2
        assert runner.results == [{"x": "p", "c": 1}, {"x": "q", "c": 2}]

    async def test_an_aggregation_makes_every_rows_writes_visible_first(self) -> None:
        runner = await run(
            "UNWIND ['r', 's'] AS x CREATE (:TP {name: x}) WITH collect(x) AS xs "
            "MATCH (t:TP) WHERE t.name IN xs RETURN count(t) AS c"
        )
        assert runner.results == [{"c": 2}]

    async def test_cached_reads_are_dropped_after_a_write(self) -> None:
        runner = await run(
            "MATCH (a:TP {id: 1}) SET a.title = 'New' WITH a MATCH (b:TP {id: 1}) RETURN b.title AS title"
        )
        assert runner.results == [{"title": "New"}]

    async def test_merge_binds_the_final_id_before_later_reads(self) -> None:
        runner = await run(
            "MERGE (p:TP {name: 'Zed'}) WITH p MATCH (q:TP {name: 'Zed'}) RETURN p.id AS p, q.id AS q"
        )
        p = runner.results[0]["p"]
        assert isinstance(p, int)
        assert runner.results == [{"p": p, "q": p}]

    async def test_a_failing_query_rolls_back_what_was_sent(self) -> None:
        mock.fail_on = "scan"
        with pytest.raises(Exception, match="backend failure"):
            await run("CREATE (n:TP {name: 'F'}) WITH n MATCH (m:TP {name: 'F'}) RETURN m.id AS id")
        assert len(mock.change_sets) == 1
        assert mock.rollbacks == 1
        assert mock.commits == 0
        assert "F" not in _tp_names()

    async def test_a_cancelled_query_rolls_back_what_was_sent(self) -> None:
        started = asyncio.Event()
        WtBlock.started = started
        runner = Runner("CREATE (n:TP {name: 'C'}) WITH n LOAD JSON FROM wtblock() AS x RETURN x")
        done = asyncio.ensure_future(runner.run())
        try:
            await asyncio.wait_for(started.wait(), 5)
            runner.cancel()
            with pytest.raises(QueryCancelledError):
                await done
        finally:
            WtBlock.started = None
        assert len(mock.change_sets) == 1
        assert mock.rollbacks == 1
        assert "C" not in _tp_names()

    async def test_a_failing_commit_fails_the_query_and_rolls_back(self) -> None:
        mock.fail_on = "commit"
        with pytest.raises(
            Exception, match=re.escape("Commit through mocktxbackend failed: backend failure")
        ):
            await run("CREATE (n:TP {name: 'K'})")
        assert mock.rollbacks == 1
        assert "K" not in _tp_names()
