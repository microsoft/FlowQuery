"""Named graphs (``USE GRAPH name = fn($request)``) and relationships across namespaces."""

import re
from typing import Any, AsyncIterator, Dict, Iterator, List, Optional

import pytest

from flowquery import MemoryGraph
from flowquery.compute.runner import Runner, RunnerOptions
from flowquery.graph.database import Database

from .mock_backend import mock


async def run(statement: str, parameters: Optional[Dict[str, Any]] = None) -> Runner:
    runner = Runner(statement, options=RunnerOptions(parameters=parameters))
    await runner.run()
    return runner


_definitions: List[str] = []


async def define(statement: str, drop: str) -> None:
    await run(statement)
    _definitions.append(drop)


async def unbind_all() -> None:
    db = Database.get_instance()
    for name in list(db.graphs.keys()):
        db.bind_graph(name, None)


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
async def clean() -> AsyncIterator[None]:
    MemoryGraph.clear()
    mock.clear()
    mock.reset()
    await unbind_all()
    yield
    drops = list(reversed(_definitions))
    _definitions.clear()
    for drop in drops:
        await run(drop)
    await run("DROP GRAPH; DROP GRAPH hr; DROP GRAPH crm")
    assert len(Database.get_instance().graphs) == 0
    MemoryGraph.clear()
    mock.clear()
    mock.reset()


class TestNamedGraphs:
    async def test_bind_write_read_and_drop_a_named_graph(self) -> None:
        await run("USE GRAPH memorygraph($request); USE GRAPH hr = memorygraph($request, 'hr')")
        with pytest.raises(
            Exception,
            match=re.escape(
                "A query can only write through one backend function "
                '(graph hr (memorygraph("hr")) and default graph memorygraph)'
            ),
        ):
            await run("CREATE (:hr.Person {name: 'Ada'}), (:Person {name: 'Default'})")
        await run("CREATE (:hr.Person {name: 'Ada'})")
        await run("CREATE (:Person {name: 'Default'})")
        assert (
            await run("MATCH (p:hr.Person) RETURN p.name AS name, labels(p) AS labels")
        ).results == [{"name": "Ada", "labels": ["Person"]}]
        assert (await run("MATCH (p:Person) RETURN p.name AS name")).results == [
            {"name": "Default"}
        ]
        assert MemoryGraph.store("hr").node_count() == 1
        assert MemoryGraph.store("default").node_count() == 1
        all_ = await run("MATCH (n) RETURN n.name AS name ORDER BY name")
        assert all_.results == [{"name": "Ada"}, {"name": "Default"}]

        await run("DROP GRAPH hr")
        with pytest.raises(
            Exception,
            match=re.escape("Graph hr is not bound; bind it with USE GRAPH hr = fn($request)"),
        ):
            await run("MATCH (p:hr.Person) RETURN p")
        with pytest.raises(Exception, match="Graph hr is not bound"):
            await run("CREATE (:hr.Person)")

    async def test_requests_and_changes_of_a_named_graph_carry_graph_name(self) -> None:
        await run("USE GRAPH hr = mockbackend($request)")
        await run("CREATE (:hr.Person {name: 'Ada'})")
        assert mock.change_sets == [
            [
                {
                    "op": "createNode",
                    "ref": "$1",
                    "labels": ["Person"],
                    "properties": {"name": "Ada"},
                    "graphName": "hr",
                }
            ]
        ]
        mock.reset()
        await run("MATCH (p:hr.Person) RETURN p")
        request = mock.requests[0]
        assert request["graph"] is True
        assert request["graphName"] == "hr"
        assert request["label"] == "Person"

    async def test_multi_label_ored_and_typed_patterns_in_a_named_graph(self) -> None:
        await run("USE GRAPH hr = memorygraph($request)")
        await run(
            "CREATE (a:hr.Person:Manager {name: 'Ada'})-[:hr.MANAGES]->(b:hr.Person {name: 'Bo'})"
        )
        assert (await run("MATCH (m:hr.Manager:Person) RETURN m.name AS n")).results == [
            {"n": "Ada"}
        ]
        assert (await run("MATCH (m:hr.Nobody|Manager) RETURN m.name AS n")).results == [
            {"n": "Ada"}
        ]
        r = await run(
            "MATCH (a:hr.Person)-[r:hr.MANAGES|LIKES]->(b) "
            "RETURN a.name AS a, type(r) AS t, b.name AS b"
        )
        assert r.results == [{"a": "Ada", "t": "MANAGES", "b": "Bo"}]
        # Unqualified types read the default graph, which is not bound here.
        with pytest.raises(Exception, match="No physical relationships found for type MANAGES"):
            await run("MATCH (a:hr.Person)-[:MANAGES]->(b) RETURN a")

    async def test_named_graphs_are_not_shadowed_by_definitions_the_default_graph_is(
        self,
    ) -> None:
        await define(
            "CREATE VIRTUAL (:Curated) AS { UNWIND [{id: 1, name: 'def'}] AS r "
            "RETURN r.id AS id, r.name AS name }",
            "DELETE VIRTUAL (:Curated)",
        )
        await run("USE GRAPH memorygraph($request); USE GRAPH hr = memorygraph($request, 'hr')")
        await run("CREATE (:hr.Curated {name: 'hr'})")
        assert (await run("MATCH (n:hr.Curated) RETURN n.name AS n")).results == [{"n": "hr"}]
        assert (await run("MATCH (n:Curated) RETURN n.name AS n")).results == [{"n": "def"}]
        with pytest.raises(
            Exception,
            match=re.escape(
                "Cannot write to (:default.Curated): (:Curated) has a CREATE VIRTUAL "
                "definition, which takes precedence over the default graph"
            ),
        ):
            await run("CREATE (:default.Curated)")
        await run("MATCH (n:hr.Curated) SET n:Tagged")
        assert (await run("MATCH (n:hr.Tagged) RETURN n.name AS n")).results == [{"n": "hr"}]

    async def test_source_capabilities_lists_every_graph(self) -> None:
        await run("USE GRAPH memorygraph($request); USE GRAPH hr = mockbackend($request)")
        r = await run(
            "LOAD JSON FROM source_capabilities() AS s WITH s WHERE s.kind = 'graph' "
            "RETURN s.name AS name, s.function AS f ORDER BY name"
        )
        assert r.results == [
            {"name": "default", "f": "memorygraph"},
            {"name": "hr", "f": "mockbackend"},
        ]

    async def test_syntax_errors(self) -> None:
        with pytest.raises(
            Exception,
            match=re.escape(
                "'virtual' is reserved for CREATE VIRTUAL definitions and cannot name a graph"
            ),
        ):
            Runner("USE GRAPH virtual = memorygraph($request)")
        with pytest.raises(
            Exception, match="Only the first label of a node can be qualified with a graph name"
        ):
            Runner("MATCH (n:hr.A:crm.B) RETURN n")
        with pytest.raises(
            Exception, match="Only the first relationship type can be qualified with a graph name"
        ):
            Runner("MATCH ()-[:hr.A|crm.B]->() RETURN 1")
        with pytest.raises(
            Exception,
            match=re.escape(
                "CREATE VIRTUAL defines a virtual node; (:hr.Person) belongs to graph hr"
            ),
        ):
            Runner("CREATE VIRTUAL (:hr.Person) AS { RETURN 1 AS id }")
        await run("USE GRAPH default = memorygraph($request)")
        default_graph = Database.get_instance().default_graph
        assert default_graph is not None and default_graph.name == "memorygraph"


class TestRelationshipsAcrossGraphsOfOneBackend:
    @pytest.fixture(autouse=True)
    async def graphs(self, clean: None) -> None:
        # Both graphs live in the same memorygraph store: one backend.
        await run("USE GRAPH memorygraph($request); USE GRAPH hr = memorygraph($request)")
        await run("CREATE (:hr.Employee {name: 'Ada'}), (:Person {name: 'Ada L.'})")

    async def test_create_and_traverse_in_both_directions_atomically(self) -> None:
        created = await run(
            "MATCH (e:hr.Employee), (p:Person) CREATE (e)-[:hr.SAME_AS]->(p) RETURN 1"
        )
        assert created.write_result is not None
        assert created.write_result.stats["relationshipsCreated"] == 1
        forward = await run(
            "MATCH (e:hr.Employee)-[:hr.SAME_AS]->(p:Person) RETURN e.name AS e, p.name AS p"
        )
        assert forward.results == [{"e": "Ada", "p": "Ada L."}]
        backward = await run(
            "MATCH (p:Person)<-[:hr.SAME_AS]-(e) RETURN e.name AS e, labels(e) AS l"
        )
        assert backward.results == [{"e": "Ada", "l": ["Employee"]}]
        untyped = await run("MATCH (p:Person)<-[r]-(e) RETURN type(r) AS t")
        assert untyped.results == [{"t": "SAME_AS"}]
        assert MemoryGraph.store().relationship_count("hr") == 1

    async def test_writes_to_both_graphs_in_one_query_are_atomic(self) -> None:
        await run(
            "MATCH (e:hr.Employee), (p:Person) CREATE (e)-[:hr.SAME_AS]->(p) "
            "SET e.linked = true, p.linked = true"
        )
        assert (
            await run("MATCH (e:hr.Employee), (p:Person) RETURN e.linked AS e, p.linked AS p")
        ).results == [{"e": True, "p": True}]
        with pytest.raises(Exception, match="still has relationships"):
            await run("CREATE (:hr.Employee {name: 'Zed'}) WITH 1 AS x MATCH (p:Person) DELETE p")
        assert MemoryGraph.store().node_count("hr") == 1

    async def test_batched_traversal_through_anchors_of_several_graphs(self) -> None:
        await run(
            "CREATE (:hr.P {name: 'h0'}), (:hr.P {name: 'h1'}), (:hr.X {name: 'h2'}), "
            "(:hr.X {name: 'h3'}), (:D {name: 'd1'})"
        )
        await run(
            "MATCH (a:hr.P {name: 'h1'}), (b:hr.X {name: 'h2'}), (d:D), (c:hr.X {name: 'h3'}) "
            "CREATE (a)-[:hr.KNOWS]->(b), (a)-[:hr.KNOWS]->(d), (b)-[:hr.LIKES]->(c), "
            "(d)-[:hr.LIKES]->(c)"
        )
        r = await run(
            "MATCH (a:hr.P)-[:hr.KNOWS]->(b)-[:hr.LIKES]->(c) "
            "RETURN a.name AS a, b.name AS b, c.name AS c ORDER BY b"
        )
        assert r.results == [
            {"a": "h1", "b": "d1", "c": "h3"},
            {"a": "h1", "b": "h2", "c": "h3"},
        ]

    async def test_referential_integrity_across_graphs(self) -> None:
        await run("MATCH (e:hr.Employee), (p:Person) CREATE (e)-[:hr.SAME_AS]->(p)")
        with pytest.raises(Exception, match="still has relationships"):
            await run("MATCH (p:Person) DELETE p")
        await run("MATCH (p:Person) DETACH DELETE p")
        assert MemoryGraph.store().relationship_count() == 0
        assert MemoryGraph.store().node_count("hr") == 1


class TestRelationshipsAcrossBackends:
    @pytest.fixture(autouse=True)
    async def graphs(self, clean: None) -> None:
        # Separate stores: two backends, ids collide (both start at 1).
        await run(
            "USE GRAPH memorygraph($request); USE GRAPH hr = memorygraph($request, 'hrstore')"
        )
        await run("CREATE (:Person {name: 'p1'}), (:Person {name: 'p2'})")
        await run("CREATE (:hr.Employee {name: 'e1'}), (:hr.Employee {name: 'e2'})")

    async def test_ids_never_join_across_graphs(self) -> None:
        await run(
            "MATCH (e:hr.Employee {name: 'e1'}), (p:Person {name: 'p2'}) "
            "CREATE (e)-[:hr.SAME_AS]->(p)"
        )
        r = await run(
            "MATCH (e:hr.Employee)-[:hr.SAME_AS]->(x) "
            "RETURN e.name AS e, x.name AS x, id(e) AS eid, id(x) AS xid"
        )
        assert r.results == [{"e": "e1", "x": "p2", "eid": 1, "xid": 2}]
        back = await run("MATCH (p:Person {name: 'p2'})<-[r]-(x) RETURN x.name AS x")
        assert back.results == [{"x": "e1"}]
        assert (
            await run("MATCH (p:Person {name: 'p1'})<-[r]-(x) RETURN x.name AS x")
        ).results == []

    async def test_relationships_with_equal_ids_in_different_graphs_are_distinct(self) -> None:
        await run(
            "MATCH (a:Person {name: 'p1'}), (b:Person {name: 'p2'}) CREATE (a)-[:KNOWS]->(b)"
        )
        await run(
            "MATCH (a:hr.Employee {name: 'e1'}), (b:hr.Employee {name: 'e2'}) "
            "CREATE (a)-[:hr.KNOWS]->(b)"
        )
        r = await run(
            "MATCH (a:Person)-[r1:KNOWS]->(b), (x:hr.Employee)-[r2:hr.KNOWS]->(y) "
            "RETURN id(r1) AS r1, id(r2) AS r2"
        )
        assert r.results == [{"r1": 3, "r2": 3}]

    async def test_one_backend_per_query_deleting_a_node_referenced_from_another_backend_fails(
        self,
    ) -> None:
        with pytest.raises(Exception, match="A query can only write through one backend function"):
            await run("CREATE (:hr.Employee) CREATE (:Person)")
        await run(
            "MATCH (e:hr.Employee {name: 'e1'}), (p:Person {name: 'p1'}) "
            "CREATE (e)-[:hr.SAME_AS]->(p)"
        )
        with pytest.raises(
            Exception,
            match=re.escape(
                "Cannot delete node 1: relationships stored in graph hr (memorygraph) still "
                "reference it; delete them first in a separate query"
            ),
        ):
            await run("MATCH (p:Person {name: 'p1'}) DETACH DELETE p")
        await run("MATCH (p:Person {name: 'p2'}) DETACH DELETE p")
        await run("MATCH (:hr.Employee)-[r:hr.SAME_AS]->() DELETE r")
        await run("MATCH (p:Person {name: 'p1'}) DETACH DELETE p")
        assert MemoryGraph.store().node_count() == 0


class TestDefinitionsAndGraphs:
    async def test_relationship_definitions_may_end_in_a_graph(self) -> None:
        await define(
            "CREATE VIRTUAL (:Badge) AS { UNWIND [{id: 1, code: 'B1'}, {id: 2, code: 'B2'}] AS r "
            "RETURN r.id AS id, r.code AS code }",
            "DELETE VIRTUAL (:Badge)",
        )
        await define(
            "CREATE VIRTUAL (:Badge)-[:ISSUED_TO]-(:Person) AS { UNWIND [{left_id: 1, right_id: 2}] "
            "AS r RETURN r.left_id AS left_id, r.right_id AS right_id }",
            "DELETE VIRTUAL (:Badge)-[:ISSUED_TO]-(:Person)",
        )
        await define(
            "CREATE VIRTUAL (:Badge)-[:HR_RECORD]-(:hr.Employee) AS { UNWIND "
            "[{left_id: 2, right_id: 1}] AS r RETURN r.left_id AS left_id, r.right_id AS right_id }",
            "DELETE VIRTUAL (:Badge)-[:HR_RECORD]-(:hr.Employee)",
        )
        await run(
            "USE GRAPH memorygraph($request); USE GRAPH hr = memorygraph($request, 'hrstore')"
        )
        await run("CREATE (:Person {name: 'p1'}), (:Person {name: 'p2'})")
        await run("CREATE (:hr.Employee {name: 'e1'})")
        issued = await run(
            "MATCH (b:Badge)-[:ISSUED_TO]->(p:Person) RETURN b.code AS b, p.name AS p"
        )
        assert issued.results == [{"b": "B1", "p": "p2"}]
        reverse = await run("MATCH (p:Person)<-[:ISSUED_TO]-(b) RETURN b.code AS b, p.name AS p")
        assert reverse.results == [{"b": "B1", "p": "p2"}]
        hr = await run(
            "MATCH (b:Badge)-[:HR_RECORD]->(e:hr.Employee) RETURN b.code AS b, e.name AS e"
        )
        assert hr.results == [{"b": "B2", "e": "e1"}]
        # Badge 1 and person 1 share an id but never join.
        assert (
            await run("MATCH (b:Badge {id: 1})-[:ISSUED_TO]->(x) RETURN x.name AS x")
        ).results == [{"x": "p2"}]

    async def test_writable_relationship_definitions_record_graph_endpoints(self) -> None:
        mock.add_nodes("WEmployee", [{"id": 1, "name": "emp"}])
        await define(
            "CREATE VIRTUAL (:WEmployee) AS { LOAD JSON FROM mockbackend($request) AS n "
            "RETURN n.id AS id, n.name AS name }",
            "DELETE VIRTUAL (:WEmployee)",
        )
        await define(
            "CREATE VIRTUAL (:WEmployee)-[:IS_PERSON]-(:Person) AS { LOAD JSON FROM "
            "mockbackend($request) AS r RETURN r.id AS id, r.left_id AS left_id, "
            "r.right_id AS right_id }",
            "DELETE VIRTUAL (:WEmployee)-[:IS_PERSON]-(:Person)",
        )
        await run("USE GRAPH mockbackend($request)")
        await run("CREATE (:Person {name: 'Ada'})")
        mock.reset()
        await run("MATCH (e:WEmployee), (p:Person) CREATE (e)-[:IS_PERSON]->(p)")
        assert mock.change_sets == [
            [
                {
                    "op": "createRelationship",
                    "ref": "$1",
                    "type": "IS_PERSON",
                    "start": 1,
                    "end": 1000,
                    "properties": {},
                    "endGraph": "default",
                }
            ]
        ]
        assert (
            await run(
                "MATCH (e:WEmployee)-[:IS_PERSON]->(p:Person) RETURN e.name AS e, p.name AS p"
            )
        ).results == [{"e": "emp", "p": "Ada"}]
        with pytest.raises(
            Exception,
            match=re.escape(
                "Cannot create [:IS_PERSON]: its CREATE VIRTUAL definition connects a "
                "definition node to a node of graph default, but an endpoint is a definition node"
            ),
        ):
            await run("MATCH (a:WEmployee), (b:WEmployee) CREATE (a)-[:IS_PERSON]->(b)")

    async def test_graph_relationships_to_definition_nodes(self) -> None:
        mock.add_nodes("WEmp", [{"id": 1, "name": "emp1"}, {"id": 2, "name": "emp2"}])
        await define(
            "CREATE VIRTUAL (:WEmp) AS { LOAD JSON FROM mockbackend($request) AS n "
            "RETURN n.id AS id, n.name AS name }",
            "DELETE VIRTUAL (:WEmp)",
        )
        await run("USE GRAPH memorygraph($request)")
        await run("CREATE (:Person {name: 'p1'})")
        created = await run(
            "MATCH (p:Person), (e:WEmp {id: 2}) CREATE (p)-[:WORKS_AS]->(e) RETURN 1"
        )
        assert created.write_result is not None
        assert created.write_result.changes == [
            {
                "op": "createRelationship",
                "ref": "$1",
                "type": "WORKS_AS",
                "start": 1,
                "end": 2,
                "properties": {},
                "endGraph": "virtual",
                "endLabel": "WEmp",
            }
        ]
        assert (
            await run("MATCH (p:Person)-[:WORKS_AS]->(x) RETURN x.name AS x")
        ).results == [{"x": "emp2"}]
        assert (
            await run("MATCH (e:WEmp)<-[:WORKS_AS]-(p) RETURN e.name AS e, p.name AS p")
        ).results == [{"e": "emp2", "p": "p1"}]
        # Person 1 and WEmp 1 share an id but never join.
        assert (await run("MATCH (e:WEmp {id: 1})<-[r]-(p) RETURN p.name AS p")).results == []

        mock.reset()
        with pytest.raises(
            Exception,
            match=re.escape(
                "Cannot delete node 2: relationships stored in default graph memorygraph still "
                "reference it; delete them first in a separate query"
            ),
        ):
            await run("MATCH (e:WEmp {id: 2}) DETACH DELETE e")
        assert mock.change_sets == []
        await run("MATCH (e:WEmp {id: 1}) DETACH DELETE e")
        assert mock.change_sets == [
            [{"op": "deleteNode", "target": 1, "label": "WEmp", "detach": True}]
        ]

        # A relationship whose definition node disappeared is hidden.
        mock.clear()
        assert (
            await run("MATCH (p:Person)-[:WORKS_AS]->(x) RETURN x.name AS x")
        ).results == []
