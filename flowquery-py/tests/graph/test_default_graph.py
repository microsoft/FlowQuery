"""Default graph backend: ``USE GRAPH fn($request)`` / ``DROP GRAPH``."""

import asyncio
import re
from typing import Any, AsyncIterator, Dict, Iterator, List, Optional

import pytest

from flowquery.compute.runner import Runner, RunnerOptions
from flowquery.graph.database import Database
from flowquery.graph.source_context import SourceOptions
from flowquery.graph.source_provider import QueryCancelledError, SourceError
from flowquery.parsing.functions.async_function import AsyncFunction
from flowquery.parsing.functions.function_metadata import FunctionDef

from .mock_backend import MockBackend, StoredNode, mock


@FunctionDef({
    "description": "Read-only mock graph backend (tests only)",
    "category": "async",
    "parameters": [],
    "output": {"description": "rows", "type": "object"},
})
class MockReadOnlyBackend(MockBackend):
    capabilities: Any = {"lookup": True, "expand": True, "predicates": True}

    def __init__(self, name: str = "mockreadonlybackend") -> None:
        super().__init__(name)


@FunctionDef({
    "description": "Mock graph backend that only scans (tests only)",
    "category": "async",
    "parameters": [],
    "output": {"description": "rows", "type": "object"},
})
class MockScanBackend(MockBackend):
    capabilities: Any = {"writes": True}

    def __init__(self, name: str = "mockscanbackend") -> None:
        super().__init__(name)


@FunctionDef({
    "description": "Waits for the test to open the gate (tests only)",
    "category": "async",
    "parameters": [],
    "output": {"description": "rows", "type": "object"},
})
class DgGate(AsyncFunction):
    started: Optional[asyncio.Event] = None
    release: Optional[asyncio.Event] = None

    def __init__(self) -> None:
        super().__init__("dggate")

    async def generate(self) -> AsyncIterator[Any]:
        if DgGate.started is not None:
            DgGate.started.set()
        if DgGate.release is not None:
            await DgGate.release.wait()
        yield {"x": 1}


@FunctionDef({
    "description": "Blocks until the query signal aborts (tests only)",
    "category": "async",
    "parameters": [],
    "output": {"description": "rows", "type": "object"},
})
class DgBlock(AsyncFunction):
    started: Optional[asyncio.Event] = None

    def __init__(self) -> None:
        super().__init__("dgblock")

    async def generate(self) -> AsyncIterator[Any]:
        assert self.context is not None
        signal = self.context.signal
        if DgBlock.started is not None:
            DgBlock.started.set()
        await signal.wait()
        yield {"x": 1}


async def run(
    statement: str,
    parameters: Optional[Dict[str, Any]] = None,
    sources: Optional[SourceOptions] = None,
) -> Runner:
    runner = Runner(statement, options=RunnerOptions(parameters=parameters, sources=sources))
    await runner.run()
    return runner


BIND = "USE GRAPH mockbackend($request)"


def last(items: List[Any]) -> Any:
    return items[-1]


@pytest.fixture(scope="module", autouse=True)
def isolated_registry() -> Iterator[None]:
    """Definitions left by other test modules would take precedence over the
    default graph; hide them (and keep the shared mock's data) meanwhile."""
    db = Database.get_instance()
    saved_nodes = dict(db.nodes)
    saved_relationships = dict(db.relationships)
    saved_store = mock.store
    db.nodes.clear()
    db.relationships.clear()
    yield
    db.nodes.clear()
    db.nodes.update(saved_nodes)
    db.relationships.clear()
    db.relationships.update(saved_relationships)
    mock.store = saved_store
    mock.reset()


@pytest.fixture(autouse=True)
async def unbound() -> AsyncIterator[None]:
    mock.clear()
    mock.reset()
    await run("DROP GRAPH")
    yield
    await run("DROP GRAPH")
    assert Database.get_instance().default_graph is None


class TestBindingAnEmptyBackend:
    async def test_create_and_match_never_seen_labels_and_types(self) -> None:
        await run(BIND)
        assert mock.log == []
        created = await run(
            "CREATE (p:Person {name: 'Ada'}) CREATE (x:Project {name: 'Beacon'}) "
            "CREATE (p)-[:WORKS_ON {role: 'lead'}]->(x) RETURN p.id AS person, x.id AS project"
        )
        person = created.results[0]["person"]
        project = created.results[0]["project"]
        assert isinstance(person, int)
        assert isinstance(project, int)
        assert [[r["operation"], r.get("graph")] for r in mock.requests] == [["write", True]]
        assert mock.change_sets == [
            [
                {"op": "createNode", "ref": "$1", "labels": ["Person"], "properties": {"name": "Ada"}},
                {
                    "op": "createNode",
                    "ref": "$2",
                    "labels": ["Project"],
                    "properties": {"name": "Beacon"},
                },
                {
                    "op": "createRelationship",
                    "ref": "$3",
                    "type": "WORKS_ON",
                    "start": "$1",
                    "end": "$2",
                    "properties": {"role": "lead"},
                },
            ]
        ]
        read = await run(
            "MATCH (p:Person)-[w:WORKS_ON]->(x:Project) RETURN p.name AS person, "
            "x.name AS project, w.role AS role, p.id AS pid"
        )
        assert read.results == [{"person": "Ada", "project": "Beacon", "role": "lead", "pid": person}]
        other = await run("MATCH (n:Nobody) RETURN n")
        assert other.results == []
        no_type = await run("MATCH ()-[r:NOPE]->() RETURN r")
        assert no_type.results == []

    async def test_a_multi_statement_query_can_bind_and_then_write(self) -> None:
        await run(f"{BIND}; CREATE (n:Q {{k: 1}})")
        assert mock.graph_nodes() == [{"id": 1000, "labels": ["Q"], "properties": {"k": 1}}]

    async def test_returned_entities_carry_no_internal_keys(self) -> None:
        await run(BIND)
        await run("CREATE (a:A {name: 'a'})-[:R {w: 1}]->(b:B {name: 'b'})")
        r = await run("MATCH (a:A)-[r:R]->(b) RETURN a, r, b, collect(a) AS all")
        row = r.results[0]
        assert row["a"] == {"name": "a", "id": 1000}
        assert row["b"] == {"name": "b", "id": 1001}
        assert row["r"] == {
            "w": 1,
            "id": 1002,
            "type": "R",
            "startNode": {"name": "a", "id": 1000},
            "endNode": {"name": "b", "id": 1001},
            "properties": {"w": 1},
        }
        assert row["all"] == [{"name": "a", "id": 1000}]


MERGE = (
    "MERGE (p:Person {name: 'Ada'}) ON CREATE SET p.created = true "
    "ON MATCH SET p.title = 'Lead' RETURN p.id AS id"
)


class TestMerge:
    async def test_repeated_merge_keeps_one_node_with_stable_identity(self) -> None:
        await run(BIND)
        first = await run(MERGE)
        second = await run(MERGE)
        assert second.results == first.results
        assert mock.change_sets[0] == [
            {
                "op": "mergeNode",
                "ref": "$1",
                "label": "Person",
                "labels": ["Person"],
                "key": {"name": "Ada"},
                "onCreate": {"created": True},
                "onMatch": {"title": "Lead"},
            }
        ]
        assert mock.graph_nodes() == [
            {
                "id": first.results[0]["id"],
                "labels": ["Person"],
                "properties": {"name": "Ada", "created": True, "title": "Lead"},
            }
        ]

    async def test_multi_label_merge_matches_on_every_label(self) -> None:
        await run(BIND)
        await run("MERGE (p:Person:Admin {name: 'Ada'})")
        await run("MERGE (p:Person {name: 'Ada'})")
        await run("MERGE (p:Admin:Person {name: 'Ada'})")
        assert [n["labels"] for n in mock.graph_nodes()] == [["Person", "Admin"]]
        with pytest.raises(Exception, match="MERGE of a node requires at least one label"):
            await run("MERGE (p {name: 'Ada'})")

    async def test_repeated_relationship_merge_keeps_one_edge(self) -> None:
        await run(BIND)
        await run("CREATE (:Person {name: 'Ada'}), (:Project {name: 'Beacon'})")
        m = (
            "MATCH (a:Person {name: 'Ada'}), (b:Project {name: 'Beacon'}) "
            "MERGE (a)-[r:WORKS_ON]->(b) ON MATCH SET r.again = true RETURN r.id AS id"
        )
        first = await run(m)
        second = await run(m)
        assert second.results == first.results
        assert mock.graph_relationships() == [
            {
                "id": first.results[0]["id"],
                "type": "WORKS_ON",
                "left_id": 1000,
                "right_id": 1001,
                "properties": {"again": True},
            }
        ]

    async def test_a_failing_change_set_is_rolled_back_as_a_whole(self) -> None:
        await run(BIND)
        await run("CREATE (:Person {name: 'Ada'})-[:WORKS_ON]->(:Project {name: 'Beacon'})")
        with pytest.raises(Exception, match="still has relationships"):
            await run("MERGE (z:Person {name: 'Zed'}) WITH z MATCH (a:Person {name: 'Ada'}) DELETE a")
        names = await run("MATCH (p:Person) RETURN p.name AS name")
        assert names.results == [{"name": "Ada"}]


class TestSchemaFreeProperties:
    async def test_new_and_reserved_looking_properties_are_queryable_immediately(self) -> None:
        await run(BIND)
        await run("CREATE (:Thing {name: 'a'}), (:Thing {name: 'b'})")
        await run(
            "MATCH (n:Thing {name: 'a'}) SET n.`odd key` = $v, n.labels = 'L', n.type = 'T', "
            "n.left_id = 7, n.right_id = 8, n.id = 'user-id'",
            {"v": 42},
        )
        r = await run(
            "MATCH (n:Thing) WHERE n.`odd key` = $v RETURN n.name AS name, n.`odd key` AS odd, "
            "n.labels AS labels, n.type AS type, n.left_id AS l, n.id AS id, "
            "properties(n) AS props, labels(n) AS lbls",
            {"v": 42},
        )
        assert r.results == [
            {
                "name": "a",
                "odd": 42,
                "labels": "L",
                "type": "T",
                "l": 7,
                "id": 1000,
                "props": {
                    "name": "a",
                    "odd key": 42,
                    "labels": "L",
                    "type": "T",
                    "left_id": 7,
                    "right_id": 8,
                    "id": "user-id",
                },
                "lbls": ["Thing"],
            }
        ]
        assert last(mock.requests)["predicate"] == {"op": "eq", "property": "odd key", "value": 42}
        missing = await run("MATCH (n:Thing) RETURN n.name AS name, n.`odd key` AS odd ORDER BY name")
        assert missing.results == [{"name": "a", "odd": 42}, {"name": "b", "odd": None}]

    async def test_relationship_metadata_and_user_properties_stay_apart(self) -> None:
        await run(BIND)
        await run("CREATE (a:A)-[r:REL {type: 'x', left_id: 5, id: 'u', w: 1}]->(b:B)")
        r = await run(
            "MATCH (:A)-[r:REL]->(:B) RETURN type(r) AS t, r.type AS rt, r.w AS w, "
            "r.left_id AS l, properties(r) AS p"
        )
        assert r.results == [
            {"t": "REL", "rt": "REL", "w": 1, "l": 5, "p": {"type": "x", "left_id": 5, "id": "u", "w": 1}}
        ]
        missing = await run("MATCH (:A)-[r:REL {nope: 1}]->(:B) RETURN r")
        assert missing.results == []
        absent = await run("MATCH (:A)-[r:REL]->(:B) RETURN r.nope AS nope")
        assert absent.results == [{"nope": None}]


class TestUnlabelledAndMultiLabelNodes:
    async def test_create_and_read_them_and_match_without_label_or_type(self) -> None:
        await run(BIND)
        await run("CREATE (a {name: 'free'}), (b:Person:Employee {name: 'Bo'}), (a)-[:LINKS]->(b)")
        assert mock.change_sets[0][0] == {
            "op": "createNode",
            "ref": "$1",
            "labels": [],
            "properties": {"name": "free"},
        }
        assert mock.change_sets[0][1]["labels"] == ["Person", "Employee"]
        all_ = await run("MATCH (n) RETURN n.name AS name, labels(n) AS labels ORDER BY name")
        assert all_.results == [
            {"name": "Bo", "labels": ["Person", "Employee"]},
            {"name": "free", "labels": []},
        ]
        for pattern in ["(n:Person:Employee)", "(n:Employee:Person)", "(n:Employee)"]:
            r = await run(f"MATCH {pattern} RETURN n.name AS name")
            assert r.results == [{"name": "Bo"}]
        assert (await run("MATCH (n:Person:Manager) RETURN n")).results == []
        assert (await run("MATCH (n:Manager|Employee) RETURN n.name AS name")).results == [
            {"name": "Bo"}
        ]
        untyped = await run(
            "MATCH (a)-[r]->(b) RETURN a.name AS a, type(r) AS t, b.name AS b, labels(b) AS lb"
        )
        assert untyped.results == [
            {"a": "free", "t": "LINKS", "b": "Bo", "lb": ["Person", "Employee"]}
        ]

    async def test_multi_label_patterns_without_a_default_graph_are_rejected(self) -> None:
        with pytest.raises(Exception, match="requires every label"):
            await run("MATCH (n:Person:Employee) RETURN n")
        with pytest.raises(
            Exception, match=re.escape("CREATE requires exactly one label for each new node")
        ):
            await run("CREATE (n:Person:Employee)")


class TestParallelRelationships:
    async def test_mutate_and_delete_one_of_several_parallel_edges_by_id(self) -> None:
        await run(BIND)
        await run(
            "CREATE (a:P {name: 'a'}), (b:P {name: 'b'}), (a)-[:R {n: 1}]->(b), (a)-[:R {n: 2}]->(b)"
        )
        read = await run(
            "MATCH (a:P {name: 'a'})-[r:R]->(b:P) RETURN r.n AS n, a.name AS a, b.name AS b ORDER BY n"
        )
        assert read.results == [{"n": 1, "a": "a", "b": "b"}, {"n": 2, "a": "a", "b": "b"}]
        pairs = await run(
            "MATCH (a:P)-[r1:R]->(b:P), (a)-[r2:R]->(b) RETURN r1.n AS x, r2.n AS y ORDER BY x"
        )
        assert pairs.results == [{"x": 1, "y": 2}, {"x": 2, "y": 1}]
        one, two = mock.graph_relationships()
        await run("MATCH (:P)-[r:R {n: 1}]->(:P) SET r.n = 10")
        assert last(mock.change_sets) == [
            {"op": "setProperties", "target": one["id"], "type": "R", "properties": {"n": 10}}
        ]
        await run("MATCH ()-[r {n: 2}]->() DELETE r")
        assert last(mock.change_sets) == [
            {"op": "deleteRelationship", "target": two["id"], "type": "R"}
        ]
        after = await run("MATCH (:P)-[r:R]->(:P) RETURN r.n AS n")
        assert after.results == [{"n": 10}]


class TestUpdatesAndDeletes:
    async def test_set_remove_properties_and_labels_replace_properties(self) -> None:
        await run(BIND)
        await run("CREATE (:Item {name: 'x', a: 1, b: 2})")
        set_ = await run(
            "MATCH (n:Item) SET n:Tagged, n.c = 3 REMOVE n.a RETURN labels(n) AS labels, "
            "properties(n) AS props"
        )
        assert set_.results == [
            {"labels": ["Item", "Tagged"], "props": {"name": "x", "b": 2, "c": 3}}
        ]
        removed = await run("MATCH (n:Item:Tagged) REMOVE n:Item RETURN labels(n) AS labels")
        assert removed.results == [{"labels": ["Tagged"]}]
        replaced = await run(
            "MATCH (n:Tagged) SET n = {name: 'y'} RETURN properties(n) AS props, n.b AS b"
        )
        assert replaced.results == [{"props": {"name": "y"}, "b": None}]
        assert mock.graph_nodes() == [{"id": 1000, "labels": ["Tagged"], "properties": {"name": "y"}}]

    async def test_delete_of_connected_node_rolls_back_detach_delete_succeeds(self) -> None:
        await run(BIND)
        await run("CREATE (a:D {k: 1})-[:L]->(b:D {k: 2})")
        with pytest.raises(SourceError):
            await run("MATCH (a:D {k: 1}) CREATE (c:D {k: 3}) DELETE a")
        assert [n["properties"]["k"] for n in mock.graph_nodes()] == [1, 2]
        detached = await run("MATCH (a:D {k: 1}) UNWIND [1, 2] AS i DETACH DELETE a")
        assert last(mock.change_sets) == [
            {"op": "deleteNode", "target": 1000, "label": "D", "detach": True}
        ]
        assert detached.write_result is not None
        assert detached.write_result.stats["nodesDeleted"] == 1
        assert detached.write_result.stats["relationshipsDeleted"] == 1
        assert [n["properties"]["k"] for n in mock.graph_nodes()] == [2]
        assert mock.graph_relationships() == []


class TestDefinitionsTakePrecedence:
    async def test_projections_filters_and_read_only_status_are_not_bypassed(self) -> None:
        try:
            mock.add_nodes("Curated", [{"id": 1, "name": "c1", "secret": "s"}])
            mock.add_nodes("Locked", [{"id": 2, "name": "l1"}])
            mock.add_nodes(
                "Filtered",
                [
                    {"id": 3, "name": "shown", "visible": True},
                    {"id": 4, "name": "hidden", "visible": False},
                ],
            )
            await run(
                "CREATE VIRTUAL (:Curated) AS { LOAD JSON FROM mockbackend($request) AS n "
                "RETURN n.id AS id, n.name AS name }"
            )
            await run(
                "CREATE VIRTUAL (:Locked) WITH CAPABILITIES {writes: false} AS "
                "{ LOAD JSON FROM mockbackend($request) AS n RETURN n.id AS id, n.name AS name }"
            )
            await run(
                "CREATE VIRTUAL (:Filtered) AS { LOAD JSON FROM mockbackend($request) AS n "
                "WITH n WHERE n.visible = true RETURN n.id AS id, n.name AS name }"
            )
            await run(BIND)
            await run("CREATE (:Free {name: 'f', secret: 'mine'})")

            assert (await run("MATCH (n:Curated) RETURN n")).results == [
                {"n": {"id": 1, "name": "c1"}}
            ]
            all_ = await run(
                "MATCH (n) RETURN n.name AS name, coalesce(n.secret, '-') AS secret ORDER BY name"
            )
            assert all_.results == [
                {"name": "c1", "secret": "-"},
                {"name": "f", "secret": "mine"},
                {"name": "l1", "secret": "-"},
                {"name": "shown", "secret": "-"},
            ]
            assert (await run("MATCH (n:Filtered) RETURN n.name AS name")).results == [
                {"name": "shown"}
            ]
            assert (
                await run("MATCH (n) WHERE n.name = 'hidden' RETURN n.name AS name")
            ).results == []

            mock.reset()
            locked = "Cannot write to (:Locked): its definition does not declare the writes capability"
            with pytest.raises(Exception, match=re.escape(locked)):
                await run("MATCH (n:Locked) SET n.x = 1")
            with pytest.raises(Exception, match=re.escape(locked)):
                await run("CREATE (n:Locked {x: 1})")
            with pytest.raises(Exception, match="cannot be combined with other labels"):
                await run("CREATE (n:Locked:Extra {x: 1})")
            with pytest.raises(Exception, match="Cannot add label :Locked to a default-graph node"):
                await run("MATCH (n:Free) SET n:Locked")
            with pytest.raises(
                Exception,
                match=re.escape(
                    "only write through one backend function (default graph mockbackend and mockbackend)"
                ),
            ):
                await run("MATCH (n:Free) SET n.x = 1 WITH n MATCH (c:Curated) SET c.x = 1")
            assert mock.change_sets == []
            # A default-graph relationship may point at a definition node; the
            # change records the endpoint's namespace.
            await run("MATCH (c:Curated), (f:Free) CREATE (c)-[:OWNS]->(f)")
            assert mock.change_sets == [
                [
                    {
                        "op": "createRelationship",
                        "ref": "$1",
                        "type": "OWNS",
                        "start": 1,
                        "end": 1000,
                        "properties": {},
                        "startGraph": "virtual",
                        "startLabel": "Curated",
                    }
                ]
            ]
        finally:
            for label in ["Curated", "Locked", "Filtered"]:
                await run(f"DELETE VIRTUAL (:{label})")


class TestIdsNeverJoinAcrossGraphs:
    async def test_eager_definitions_and_default_graph_share_coincidental_ids_safely(self) -> None:
        try:
            await run(
                "CREATE VIRTUAL (:Eager) AS { UNWIND [{id: 1000, name: 'imposter'}] AS r "
                "RETURN r.id AS id, r.name AS name }"
            )
            await run(
                "CREATE VIRTUAL (:Eager)-[:EREL]-(:Eager) AS { UNWIND [{left_id: 1000, right_id: 1000}] AS r "
                "RETURN r.left_id AS left_id, r.right_id AS right_id }"
            )
            await run(BIND)
            await run("CREATE (a:Src {name: 'a'})-[:LINK]->(b:Dst {name: 'b'})")
            assert [n["id"] for n in mock.graph_nodes()] == [1000, 1001]

            all_ = await run("MATCH (n) RETURN n.name AS name ORDER BY name")
            assert all_.results == [{"name": "a"}, {"name": "b"}, {"name": "imposter"}]
            via_default = await run("MATCH (x)-[:LINK]->(y) RETURN x.name AS x, y.name AS y")
            assert via_default.results == [{"x": "a", "y": "b"}]
            via_definition = await run("MATCH (x)-[:EREL]->(y) RETURN x.name AS x, y.name AS y")
            assert via_definition.results == [{"x": "imposter", "y": "imposter"}]
            untyped = await run("MATCH (x)-[r]->(y) RETURN x.name AS x, y.name AS y ORDER BY x")
            assert untyped.results == [
                {"x": "a", "y": "b"},
                {"x": "imposter", "y": "imposter"},
            ]
            traced = Runner(
                "MATCH (x:Src)-[:LINK]->(y) RETURN y.name AS y",
                options=RunnerOptions(provenance=True),
            )
            await traced.run()
            assert traced.results == [{"y": "b"}]
        finally:
            await run("DELETE VIRTUAL (:Eager)-[:EREL]-(:Eager)")
            await run("DELETE VIRTUAL (:Eager)")


async def test_a_reused_default_graph_relationship_variable_keeps_its_graph() -> None:
    await run(
        "CREATE VIRTUAL (:Twin) AS { UNWIND [{id: 1001, name: 'twin'}] AS r "
        "RETURN r.id AS id, r.name AS name }"
    )
    try:
        await run(BIND)
        await run("CREATE (a:G {name: 'g1'})-[:R]->(b:G {name: 'g2'})")
        r = await run("MATCH (a:G)-[r:R]->(b) MATCH (x)-[r]->(y) RETURN DISTINCT y.name AS y")
        assert r.results == [{"y": "g2"}]
    finally:
        await run("DELETE VIRTUAL (:Twin)")


class TestUnboundAndReadOnlyBehavior:
    async def test_without_a_binding_the_errors_are_unchanged(self) -> None:
        no_def = "Cannot write to (:UndeclaredProbe): it has no CREATE VIRTUAL definition"
        with pytest.raises(Exception, match=re.escape(no_def)):
            await run("CREATE (n:UndeclaredProbe {name: 'Ada'}) RETURN n.id AS id")
        with pytest.raises(Exception, match=re.escape(no_def)):
            await run("MERGE (n:UndeclaredProbe {name: 'Ada'}) RETURN n.id AS id")
        with pytest.raises(
            Exception, match=re.escape("CREATE requires exactly one label for each new node")
        ):
            await run("CREATE ()-[:UNDECLARED_PROBE]->()")
        with pytest.raises(
            Exception, match=re.escape("Physical node not found for label UndeclaredProbe")
        ):
            await run("MATCH (n:UndeclaredProbe) RETURN n")
        assert mock.log == []

    async def test_deletes_of_different_definition_entities_sharing_an_id_are_all_sent(self) -> None:
        mock.add_nodes("DelA", [{"id": 1, "name": "a"}])
        mock.add_nodes("DelB", [{"id": 1, "name": "b"}])
        await run(
            "CREATE VIRTUAL (:DelA) AS { LOAD JSON FROM mockbackend($request) AS n "
            "RETURN n.id AS id, n.name AS name }"
        )
        await run(
            "CREATE VIRTUAL (:DelB) AS { LOAD JSON FROM mockbackend($request) AS n "
            "RETURN n.id AS id, n.name AS name }"
        )
        try:
            await run("MATCH (a:DelA), (b:DelB) DELETE a, b")
            assert mock.change_sets == [
                [
                    {"op": "deleteNode", "target": 1, "label": "DelA", "detach": False},
                    {"op": "deleteNode", "target": 1, "label": "DelB", "detach": False},
                ]
            ]
        finally:
            await run("DELETE VIRTUAL (:DelA)")
            await run("DELETE VIRTUAL (:DelB)")

    async def test_a_read_only_backend_is_readable_but_rejects_writes(self) -> None:
        mock.store.place(StoredNode(5, {}, {"name": "r"}), "Seen")
        await run("USE GRAPH mockreadonlybackend($request)")
        assert (await run("MATCH (n:Seen) RETURN n.name AS name")).results == [{"name": "r"}]
        with pytest.raises(
            Exception,
            match=re.escape(
                "Cannot write to (:X): the default graph backend mockreadonlybackend "
                "does not declare the writes capability"
            ),
        ):
            await run("CREATE (n:X {name: 'x'})")
        with pytest.raises(Exception, match="does not declare the writes capability"):
            await run("MATCH (n) SET n.x = 1")
        assert mock.change_sets == []

    async def test_writes_to_two_backends_fail_before_any_backend_applies_changes(self) -> None:
        await run(
            "CREATE VIRTUAL (:TxDef) AS { LOAD JSON FROM mocktxbackend($request) AS n "
            "RETURN n.id AS id, n.name AS name }"
        )
        try:
            await run(BIND)
            with pytest.raises(
                Exception,
                match=re.escape(
                    "A query can only write through one backend function "
                    "(mocktxbackend and default graph mockbackend)"
                ),
            ):
                await run("CREATE (a:TxDef {name: 'd'}) CREATE (b:Free {name: 'f'})")
            assert mock.log == []
            mock.add_nodes("TxDef", [{"id": 1, "name": "d"}])
            await run("CREATE (:Free {name: 'f'})")
            mock.reset()
            # Unlabelled targets are routed per row: rejected when a row
            # comes from the other backend, before anything is sent.
            with pytest.raises(Exception, match="only write through one backend function"):
                await run("MATCH (n) SET n.touched = true")
            assert mock.change_sets == []
            assert mock.commits + mock.rollbacks == 0
        finally:
            await run("DELETE VIRTUAL (:TxDef)")


class TestQueryLifecycle:
    async def test_one_query_context_and_one_atomic_write_per_query(self) -> None:
        await run(BIND)
        await run("CREATE (:Person {name: 'Ada'})")
        mock.reset()
        await run(
            "MATCH (p:Person) UNWIND range(1, 3) AS i "
            "CREATE (q:Person {name: p.name + tostring(i)})-[:CHILD]->(p)"
        )
        assert mock.opened == 1
        assert mock.closed == 1
        assert len({id(e["snapshot"]) for e in mock.log}) == 1
        assert len({id(e["signal"]) for e in mock.log}) == 1
        assert len(mock.change_sets) == 1
        assert len(mock.change_sets[0]) == 6
        assert mock.commits == 0

    async def test_writes_become_visible_when_the_query_ends(self) -> None:
        await run(BIND)
        r = await run("CREATE (n:V {k: 1}) WITH n MATCH (m:V) RETURN count(m) AS c")
        assert r.results == [{"c": 0}]
        assert (await run("MATCH (m:V) RETURN count(m) AS c")).results == [{"c": 1}]

    async def test_a_failed_or_cancelled_query_applies_nothing_and_closes_its_context(self) -> None:
        await run(BIND)
        mock.fail_on = "scan"
        with pytest.raises(SourceError):
            await run("CREATE (n:F {k: 1}) WITH n MATCH (m:F) RETURN m")
        mock.fail_on = None
        assert mock.change_sets == []

        started = asyncio.Event()
        DgBlock.started = started
        runner = Runner("CREATE (n:F {k: 2}) WITH n LOAD JSON FROM dgblock() AS x RETURN x")
        done = asyncio.ensure_future(runner.run())
        try:
            await asyncio.wait_for(started.wait(), 5)
            runner.cancel()
            with pytest.raises(QueryCancelledError):
                await done
        finally:
            DgBlock.started = None
        assert mock.change_sets == []
        assert mock.closed == mock.opened
        assert mock.graph_nodes() == []

    async def test_transactions_read_their_own_writes_and_commit_or_roll_back(self) -> None:
        await run("USE GRAPH mocktxbackend($request)")
        r = await run("CREATE (n:T {k: 1}) WITH n MATCH (m:T) RETURN count(m) AS c, n.id AS id")
        assert r.results == [{"c": 1, "id": 1000}]
        assert mock.commits == 1
        commit = next(q for q in mock.requests if q.get("operation") == "commit")
        assert commit == {"version": 1, "graph": True, "operation": "commit"}
        mock.reset()
        mock.fail_on = "commit"
        with pytest.raises(SourceError):
            await run("CREATE (n:T {k: 2})")
        assert mock.rollbacks == 1
        assert [n["properties"]["k"] for n in mock.graph_nodes()] == [1]


async def seed_people() -> None:
    await run("UNWIND range(1, 30) AS i CREATE (:Person {name: 'p' + tostring(i), age: i})")
    await run(
        "MATCH (a:Person {name: 'p1'}), (b:Person) WHERE b.age <= 3 AND b.age > 1 "
        "CREATE (a)-[:KNOWS]->(b)"
    )
    mock.reset()


class TestOptimizationsAndFallbacks:
    async def test_lookup_expand_predicate_and_limit_push_down_when_declared(self) -> None:
        await run(BIND)
        await seed_people()
        r = await run(
            "MATCH (a:Person {name: 'p1'})-[:KNOWS]->(b:Person) RETURN b.name AS name ORDER BY name"
        )
        assert r.results == [{"name": "p2"}, {"name": "p3"}]
        assert r.source_stats["calls"]["expand"] > 0
        assert r.source_stats["calls"]["lookup"] > 0
        first = mock.requests[0]
        assert first["operation"] == "scan"
        assert first["graph"] is True
        assert first["label"] == "Person"
        assert first["predicate"] == {"op": "eq", "property": "name", "value": "p1"}
        mock.reset()
        ranged = await run("MATCH (n:Person) WHERE n.age > 28 RETURN n.name AS name ORDER BY name")
        assert ranged.results == [{"name": "p29"}, {"name": "p30"}]
        assert mock.requests[0]["predicate"] == {"op": "gt", "property": "age", "value": 28}
        mock.reset()
        strings = await run("MATCH (n:Person) WHERE n.name > 'p8' RETURN n.name AS name")
        assert strings.results == [{"name": "p9"}]
        assert mock.requests[0]["predicate"] is None
        mock.reset()
        limited = await run(
            "MATCH (n:Person) RETURN n.name AS name LIMIT 2", None, SourceOptions(page_size=5)
        )
        assert len(limited.results) == 2
        assert mock.yielded < 30

    async def test_scan_only_backends_fall_back_to_scans_and_stay_correct(self) -> None:
        await run("USE GRAPH mockscanbackend($request)")
        await seed_people()
        r = await run(
            "MATCH (a:Person {name: 'p1'})-[:KNOWS]->(b:Person) RETURN b.name AS name ORDER BY name"
        )
        assert r.results == [{"name": "p2"}, {"name": "p3"}]
        assert {q["operation"] for q in mock.requests} == {"scan"}
        assert all(q["predicate"] is None for q in mock.requests)
        assert r.source_stats["fallbacks"] > 0

    async def test_no_schema_enumeration_or_refresh_requests(self) -> None:
        await run(BIND)
        await seed_people()
        await run("MATCH (n)-[r]->(m) RETURN count(r) AS c")
        operations = {q["operation"] for q in mock.requests}
        for op in operations:
            assert op in ["scan", "lookup", "expand"]
        assert all(q.get("graph") is True for q in mock.requests)

    async def test_source_capabilities_lists_the_binding(self) -> None:
        await run(BIND)
        r = await run(
            "LOAD JSON FROM source_capabilities() AS s WITH s WHERE s.kind = 'graph' "
            "RETURN s.function AS f, s.capabilities.writes AS w, s.capabilities.expand AS e"
        )
        assert r.results == [{"f": "mockbackend", "w": True, "e": {"left": True, "right": True}}]


class TestReplacingAndClearingTheBinding:
    async def test_subsequent_queries_see_the_change(self) -> None:
        await run("USE GRAPH mockreadonlybackend($request)")
        with pytest.raises(Exception, match="does not declare the writes capability"):
            await run("CREATE (n:X)")
        await run(BIND)
        await run("CREATE (n:X)")
        await run("DROP GRAPH")
        with pytest.raises(Exception, match=re.escape("Physical node not found for label X")):
            await run("MATCH (n:X) RETURN n")
        await run("DROP GRAPH")

    async def test_a_running_query_keeps_the_binding_it_started_with(self) -> None:
        await run(BIND)
        await run("CREATE (:Pin {name: 'kept'})")
        DgGate.release = asyncio.Event()
        DgGate.started = asyncio.Event()
        try:
            pending = asyncio.ensure_future(
                run("LOAD JSON FROM dggate() AS x MATCH (n:Pin) RETURN n.name AS name")
            )
            await asyncio.wait_for(DgGate.started.wait(), 5)
            await run("DROP GRAPH")
            DgGate.release.set()
            assert (await pending).results == [{"name": "kept"}]
        finally:
            DgGate.release = None
            DgGate.started = None
        with pytest.raises(Exception, match=re.escape("Physical node not found for label Pin")):
            await run("MATCH (n:Pin) RETURN n")

    async def test_use_graph_requires_request_and_an_async_function(self) -> None:
        with pytest.raises(Exception, match=r"must pass \$request"):
            await run("USE GRAPH mockbackend()")
        with pytest.raises(Exception, match="Expected a registered async function after USE GRAPH"):
            Runner("USE GRAPH nosuchfn($request)")
        assert Database.get_instance().default_graph is None

    async def test_use_and_graph_remain_usable_as_identifiers(self) -> None:
        r = await run("WITH 1 AS use, 2 AS graph RETURN use + graph AS s")
        assert r.results == [{"s": 3}]
