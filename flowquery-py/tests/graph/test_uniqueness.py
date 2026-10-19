"""Relationship uniqueness within a MATCH clause (openCypher isomorphism)."""

import json
import re
from typing import Any, Dict, Iterator, List

import pytest

from flowquery.compute.runner import Runner
from flowquery.graph.database import Database
from flowquery.graph.testing import in_memory_node_source, in_memory_relationship_source

from .mock_backend import mock

db = Database.get_instance()


async def query(statement: str) -> List[Dict[str, Any]]:
    runner = Runner(statement)
    await runner.run()
    return runner.results


def ordered(rows: List[Dict[str, Any]]) -> List[str]:
    return sorted(json.dumps(r, sort_keys=True) for r in rows)


P = [
    {"id": 1, "name": "Ben"},
    {"id": 2, "name": "Ana"},
]
X = [{"id": 10, "name": "Atlas"}]
W = [
    {"left_id": 1, "right_id": 10},
    {"left_id": 2, "right_id": 10},
]
PARALLEL_W = [
    {"id": 101, "left_id": 1, "right_id": 10},
    {"id": 102, "left_id": 1, "right_id": 10},
    {"id": 103, "left_id": 2, "right_id": 10},
]


def literal(rows: List[Dict[str, Any]]) -> str:
    return re.sub(r'"(\w+)":', r"\1:", json.dumps(rows))


async def define(prefix: str, kind: str, w: List[Dict[str, Any]]) -> None:
    """Define (:pP), (:pX) and (:pP)-[:pW]-(:pX) in one of the supported ways."""
    p, x, t = f"{prefix}P", f"{prefix}X", f"{prefix}W"
    if kind == "inMemory":
        db.register_node_source(p, in_memory_node_source(P))
        db.register_node_source(x, in_memory_node_source(X))
        db.register_relationship_source(t, p, x, in_memory_relationship_source(w))
        return
    if kind == "mockbackend":
        mock.add_nodes(p, P)
        mock.add_nodes(x, X)
        mock.add_relationships(t, w)
        await query(
            f"CREATE VIRTUAL (:{p}) AS {{ LOAD JSON FROM mockbackend($request) AS r "
            "RETURN r.id AS id, r.name AS name }"
        )
        await query(
            f"CREATE VIRTUAL (:{x}) AS {{ LOAD JSON FROM mockbackend($request) AS r "
            "RETURN r.id AS id, r.name AS name }"
        )
        await query(
            f"CREATE VIRTUAL (:{p})-[:{t}]-(:{x}) AS {{ LOAD JSON FROM mockbackend($request) AS e "
            "RETURN e.id AS id, e.left_id AS left_id, e.right_id AS right_id }"
        )
        return
    caps = "WITH CAPABILITIES {lookup: true, expand: true, predicates: true}" if kind == "capabilities" else ""
    rel_caps = "WITH CAPABILITIES {expand: true, predicates: true}" if kind == "capabilities" else ""
    await query(
        f"CREATE VIRTUAL (:{p}) {caps} AS {{ UNWIND {literal(P)} AS r RETURN r.id AS id, r.name AS name }}"
    )
    await query(
        f"CREATE VIRTUAL (:{x}) {caps} AS {{ UNWIND {literal(X)} AS r RETURN r.id AS id, r.name AS name }}"
    )
    await query(
        f"CREATE VIRTUAL (:{p})-[:{t}]-(:{x}) {rel_caps} AS {{ UNWIND {literal(w)} AS e "
        "RETURN e.id AS id, e.left_id AS left_id, e.right_id AS right_id }"
    )


_defined: set = set()


async def ensure(kind: str) -> str:
    prefix = f"U{kind}"
    if kind not in _defined:
        _defined.add(kind)
        await define(prefix, kind, W)
        await define(f"{prefix}Par", kind, PARALLEL_W)
    return prefix


KINDS = ["eager", "capabilities", "inMemory", "mockbackend"]


@pytest.fixture(scope="module", autouse=True)
def drop_definitions() -> Iterator[None]:
    """Database definitions are process-wide: drop this module's ones."""
    yield
    prefixes = tuple(f"U{kind}" for kind in KINDS) + ("ULoop", "ULOOP_K")
    for label in [label for label in db.nodes if label.startswith(prefixes)]:
        db.nodes.pop(label, None)
    for rel_type in [t for t in db.relationships if t.startswith(prefixes)]:
        db.relationships.pop(rel_type, None)


@pytest.mark.parametrize("kind", KINDS)
class TestRelationshipUniqueness:
    async def test_a_pattern_cannot_walk_back_over_the_same_relationship(self, kind: str) -> None:
        p = await ensure(kind)
        rows = await query(
            f"MATCH (b:{p}P {{name: 'Ben'}})-[:{p}W]->(x:{p}X)<-[:{p}W]-(c:{p}P) RETURN c.name AS c"
        )
        assert rows == [{"c": "Ana"}]

    async def test_relationship_variables_do_not_change_the_rule(self, kind: str) -> None:
        p = await ensure(kind)
        rows = await query(
            f"MATCH (b:{p}P {{name: 'Ben'}})-[r1:{p}W]->(x:{p}X)<-[r2:{p}W]-(c:{p}P) RETURN c.name AS c"
        )
        assert rows == [{"c": "Ana"}]

    async def test_comma_separated_patterns_of_one_match_share_the_rule(self, kind: str) -> None:
        p = await ensure(kind)
        rows = await query(
            f"MATCH (b:{p}P {{name: 'Ben'}})-[:{p}W]->(x:{p}X), (c:{p}P)-[:{p}W]->(x) RETURN c.name AS c"
        )
        assert rows == [{"c": "Ana"}]

    async def test_separate_match_clauses_stay_independent(self, kind: str) -> None:
        p = await ensure(kind)
        rows = await query(
            f"MATCH (b:{p}P {{name: 'Ben'}})-[:{p}W]->(x:{p}X) MATCH (x)<-[:{p}W]-(c:{p}P) RETURN c.name AS c"
        )
        assert ordered(rows) == ordered([{"c": "Ben"}, {"c": "Ana"}])

    async def test_distinct_parallel_relationships_still_match_one_per_ordered_pair(self, kind: str) -> None:
        p = f"{await ensure(kind)}Par"
        rows = await query(
            f"MATCH (a:{p}P)-[:{p}W]->(x:{p}X)<-[:{p}W]-(b:{p}P) RETURN a.name AS a, b.name AS b"
        )
        assert ordered(rows) == ordered([
            {"a": "Ben", "b": "Ben"},
            {"a": "Ben", "b": "Ben"},
            {"a": "Ben", "b": "Ana"},
            {"a": "Ben", "b": "Ana"},
            {"a": "Ana", "b": "Ben"},
            {"a": "Ana", "b": "Ben"},
        ])


class TestSelfLoopsAndVariableLength:
    _defined = False

    async def _define(self) -> None:
        if TestSelfLoopsAndVariableLength._defined:
            return
        await query("CREATE VIRTUAL (:ULoop) AS { UNWIND [{id: 1}, {id: 2}] AS r RETURN r.id AS id }")
        await query(
            "CREATE VIRTUAL (:ULoop)-[:ULOOP_K]-(:ULoop) AS { UNWIND [{l: 1, r: 1}, {l: 1, r: 2}] AS e "
            "RETURN e.l AS left_id, e.r AS right_id }"
        )
        TestSelfLoopsAndVariableLength._defined = True

    async def test_an_undirected_chain_cannot_reuse_a_self_loop(self) -> None:
        await self._define()
        rows = await query(
            "MATCH (a:ULoop)-[:ULOOP_K]-(b:ULoop)-[:ULOOP_K]-(c:ULoop) RETURN a.id AS a, b.id AS b, c.id AS c"
        )
        assert rows == [{"a": 1, "b": 1, "c": 2}]

    async def test_a_single_relationship_pattern_still_matches_a_self_loop(self) -> None:
        await self._define()
        rows = await query("MATCH (a:ULoop)-[:ULOOP_K]->(a) RETURN a.id AS a")
        assert rows == [{"a": 1}]
