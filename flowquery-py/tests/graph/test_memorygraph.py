"""Built-in in-memory graph store: ``USE GRAPH memorygraph($request)``."""

import asyncio
import re
from typing import Any, AsyncIterator, Dict, Iterator, Optional

import pytest

from flowquery import MemoryGraph
from flowquery.compute.runner import Runner, RunnerOptions
from flowquery.graph.database import Database
from flowquery.graph.source_provider import SourceError
from flowquery.parsing.functions.async_function import AsyncFunction
from flowquery.parsing.functions.function_metadata import FunctionDef


@FunctionDef({
    "description": "Waits for the test to open the gate (tests only)",
    "category": "async",
    "parameters": [],
    "output": {"description": "rows", "type": "object"},
})
class MgGate(AsyncFunction):
    started: Optional[asyncio.Event] = None
    release: Optional[asyncio.Event] = None

    def __init__(self) -> None:
        super().__init__("mggate")

    async def generate(self) -> AsyncIterator[Any]:
        if MgGate.started is not None:
            MgGate.started.set()
        if MgGate.release is not None:
            await MgGate.release.wait()
        yield {"x": 1}


async def run(statement: str, parameters: Optional[Dict[str, Any]] = None) -> Runner:
    runner = Runner(statement, options=RunnerOptions(parameters=parameters))
    await runner.run()
    return runner


@pytest.fixture(scope="module", autouse=True)
def isolated_registry() -> Iterator[None]:
    """Definitions left by other test modules would take precedence over the
    default graph; hide them meanwhile."""
    db = Database.get_instance()
    saved_nodes = dict(db.nodes)
    saved_relationships = dict(db.relationships)
    db.nodes.clear()
    db.relationships.clear()
    yield
    db.nodes.clear()
    db.nodes.update(saved_nodes)
    db.relationships.clear()
    db.relationships.update(saved_relationships)


@pytest.fixture(autouse=True)
async def bound() -> AsyncIterator[None]:
    MemoryGraph.clear()
    await run("USE GRAPH memorygraph($request)")
    yield
    await run("DROP GRAPH")
    assert Database.get_instance().default_graph is None
    MemoryGraph.clear()


async def test_works_out_of_the_box_for_the_change_request_queries() -> None:
    created = await run(
        "CREATE (p:Person {name: 'Ada'}) CREATE (x:Project {name: 'Beacon'}) "
        "CREATE (p)-[:WORKS_ON {role: 'lead'}]->(x) RETURN p.id AS person, x.id AS project"
    )
    assert created.results == [{"person": 1, "project": 2}]
    assert created.write_result is not None
    stats = created.write_result.stats
    assert stats["nodesCreated"] == 2
    assert stats["relationshipsCreated"] == 1
    assert stats["propertiesSet"] == 3
    read = await run(
        "MATCH (p:Person)-[w:WORKS_ON]->(x:Project) RETURN p.name AS person, "
        "x.name AS project, w.role AS role"
    )
    assert read.results == [{"person": "Ada", "project": "Beacon", "role": "lead"}]
    merged = await run(
        "MERGE (p:Person {name: 'Ada'}) ON MATCH SET p.title = 'Lead' RETURN p.id AS id"
    )
    assert merged.results == [{"id": 1}]
    title = await run("MATCH (p:Person) RETURN p.title AS title")
    assert title.results == [{"title": "Lead"}]


async def test_merge_of_nodes_and_relationships_is_idempotent() -> None:
    m = "MERGE (a:Team {name: 'core'}) ON CREATE SET a.n = 1 ON MATCH SET a.n = 2 RETURN a.id AS id"
    assert (await run(m)).results == [{"id": 1}]
    assert (await run(m)).results == [{"id": 1}]
    await run("CREATE (:Person {name: 'Ada'})")
    r = "MATCH (p:Person), (t:Team) MERGE (p)-[m:MEMBER_OF]->(t) RETURN m.id AS id"
    first = await run(r)
    assert (await run(r)).results == first.results
    counts = await run(
        "MATCH (t:Team) OPTIONAL MATCH (p)-[m:MEMBER_OF]->(t) RETURN t.n AS n, count(m) AS members"
    )
    assert counts.results == [{"n": 2, "members": 1}]
    assert MemoryGraph.store().node_count() == 2
    assert MemoryGraph.store().relationship_count() == 1


async def test_reads_its_own_writes_within_a_query() -> None:
    r = await run("CREATE (n:V {k: 1}) WITH n MATCH (m:V) RETURN count(m) AS c")
    assert r.results == [{"c": 1}]


async def test_a_failing_query_leaves_the_store_unchanged() -> None:
    await run("CREATE (:D {k: 1})-[:L]->(:D {k: 2})")
    with pytest.raises(Exception, match="still has relationships"):
        await run("MATCH (a:D {k: 1}) CREATE (:D {k: 3}) DELETE a")
    assert (await run("MATCH (n:D) RETURN n.k AS k ORDER BY k")).results == [{"k": 1}, {"k": 2}]
    await run("MATCH (n) DETACH DELETE n")
    assert MemoryGraph.store().node_count() == 0
    assert MemoryGraph.store().relationship_count() == 0


async def test_unlabelled_and_multi_label_nodes_label_and_property_updates() -> None:
    await run("CREATE (a {name: 'free'}), (b:Person:Employee {name: 'Bo'}), (a)-[:LINKS]->(b)")
    assert (
        await run("MATCH (n) RETURN n.name AS name, labels(n) AS labels ORDER BY name")
    ).results == [
        {"name": "Bo", "labels": ["Person", "Employee"]},
        {"name": "free", "labels": []},
    ]
    await run("MATCH (n:Person:Employee) SET n:Manager, n.level = 3 REMOVE n:Employee")
    after = await run(
        "MATCH (a)-[r]->(b:Manager) RETURN a.name AS a, type(r) AS t, labels(b) AS labels, "
        "properties(b) AS props"
    )
    assert after.results == [
        {"a": "free", "t": "LINKS", "labels": ["Person", "Manager"], "props": {"name": "Bo", "level": 3}}
    ]
    await run("MATCH (n:Manager) SET n = {name: 'Bea'}")
    assert (await run("MATCH (n:Manager) RETURN properties(n) AS p")).results == [
        {"p": {"name": "Bea"}}
    ]


async def test_parallel_relationships_keep_their_identity() -> None:
    await run("CREATE (a:P), (b:P), (a)-[:R {n: 1}]->(b), (a)-[:R {n: 2}]->(b)")
    await run("MATCH (:P)-[r:R {n: 1}]->(:P) DELETE r")
    assert (await run("MATCH (:P)-[r:R]->(:P) RETURN r.n AS n")).results == [{"n": 2}]


async def test_named_stores_are_separate() -> None:
    await run("CREATE (:Item {name: 'default'})")
    await run("USE GRAPH memorygraph($request, 'scratch')")
    await run("CREATE (:Item {name: 'scratch'})")
    assert (await run("MATCH (n:Item) RETURN n.name AS name")).results == [{"name": "scratch"}]
    assert MemoryGraph.store("default").node_count() == 1
    assert MemoryGraph.store("scratch").node_count() == 1


async def test_a_commit_after_a_concurrent_commit_to_the_same_store_fails() -> None:
    MgGate.release = asyncio.Event()
    MgGate.started = asyncio.Event()
    try:
        slow = asyncio.ensure_future(
            run("CREATE (n:A) WITH n LOAD JSON FROM mggate() AS g RETURN n.id AS id")
        )
        await asyncio.wait_for(MgGate.started.wait(), 5)
        await run("CREATE (:B)")
        MgGate.release.set()
        with pytest.raises(SourceError, match=re.escape("was changed by another query")):
            await slow
    finally:
        MgGate.release = None
        MgGate.started = None
    assert (await run("MATCH (n) RETURN labels(n) AS l")).results == [{"l": ["B"]}]


async def test_writes_stay_with_the_binding_they_were_routed_to() -> None:
    with pytest.raises(
        Exception,
        match=re.escape(
            "USE GRAPH and DROP GRAPH cannot be combined with write clauses in one statement"
        ),
    ):
        await run("USE GRAPH memorygraph($request, 'b') CREATE (n:Foo)")
    with pytest.raises(
        Exception,
        match=re.escape(
            "A query can only write through one backend function "
            '(default graph memorygraph and default graph memorygraph("d"))'
        ),
    ):
        await run("CREATE (n:Foo); USE GRAPH memorygraph($request, 'd'); CREATE (m:Bar)")
    assert MemoryGraph.store("default").node_count() == 0
    assert MemoryGraph.store("d").node_count() == 0
    await run("USE GRAPH memorygraph($request, 'e'); CREATE (m:Bar)")
    assert MemoryGraph.store("e").node_count() == 1


async def test_is_only_usable_as_the_default_graph() -> None:
    await run(
        "CREATE VIRTUAL (:MgDef) AS { LOAD JSON FROM memorygraph($request) AS n RETURN n.id AS id }"
    )
    try:
        with pytest.raises(Exception, match="bind it with USE GRAPH memorygraph"):
            await run("MATCH (n:MgDef) RETURN n")
    finally:
        await run("DELETE VIRTUAL (:MgDef)")
