"""Tests for top-level query parameters and doubled-backtick identifiers."""

from typing import Any, Dict, List, Optional

import pytest

from flowquery.compute.runner import Runner, RunnerOptions
from flowquery.graph.database import Database
from flowquery.graph.source_provider import matches_predicate

db = Database.get_instance()

PEOPLE = [
    {"id": 1, "name": "Ada", "age": 36},
    {"id": 2, "name": "Ben", "age": 25},
    {"id": 3, "name": "Cy", "age": 51},
]


async def run(statement: str, parameters: Optional[Dict[str, Any]] = None) -> Runner:
    runner = Runner(statement, options=RunnerOptions(parameters=parameters))
    await runner.run()
    return runner


class _People:
    def __init__(self) -> None:
        self.requests: List[Dict[str, Any]] = []
        self.capabilities = {
            "version": 1,
            "lookup": True,
            "predicates": {"operators": ["eq", "in", "gt", "gte", "lt", "lte"]},
        }

    def scan(self, request: Dict[str, Any], context: Any) -> List[Dict[str, Any]]:
        self.requests.append(request)
        return [r for r in PEOPLE if matches_predicate(request["predicate"], r)]

    def lookup(self, request: Dict[str, Any], context: Any) -> List[Dict[str, Any]]:
        self.requests.append(request)
        return [r for r in PEOPLE if r["id"] in request["ids"]]


@pytest.fixture
def people() -> _People:
    provider = _People()
    db.register_node_source("ParamPerson", provider)
    return provider


class TestTopLevelParameters:
    async def test_return_parameter(self) -> None:
        assert (await run("RETURN $x AS v", {"x": 1})).results == [{"v": 1}]

    async def test_rerun_with_different_parameters(self) -> None:
        assert (await run("RETURN $x + 1 AS v", {"x": 1})).results == [{"v": 2}]
        assert (await run("RETURN $x + 1 AS v", {"x": 41})).results == [{"v": 42}]

    async def test_pattern_property_parameters_are_pushed(self, people: _People) -> None:
        runner = await run(
            "MATCH (p:ParamPerson {name: $name}) RETURN p.name AS name", {"name": "Ada"}
        )
        assert runner.results == [{"name": "Ada"}]
        assert people.requests[0]["predicate"] == {"op": "eq", "property": "name", "value": "Ada"}
        people.requests.clear()
        await run("MATCH (p:ParamPerson {name: 'Ada'}) RETURN p.name AS name")
        assert people.requests[0]["predicate"] == {"op": "eq", "property": "name", "value": "Ada"}

    async def test_where_parameters_are_pushed(self, people: _People) -> None:
        runner = await run(
            "MATCH (p:ParamPerson) WHERE p.age >= $min RETURN p.name AS name", {"min": 36}
        )
        assert sorted(r["name"] for r in runner.results) == ["Ada", "Cy"]
        assert people.requests[0]["predicate"] == {"op": "gte", "property": "age", "value": 36}

    async def test_unwind_list_parameter(self) -> None:
        runner = await run("UNWIND $ids AS id RETURN id", {"ids": [1, 2, 3]})
        assert runner.results == [{"id": 1}, {"id": 2}, {"id": 3}]

    async def test_parameters_in_subqueries(self, people: _People) -> None:
        runner = await run(
            "MATCH (p:ParamPerson) WHERE EXISTS { MATCH (q:ParamPerson) WHERE q.id = p.id AND q.age > $min } "
            "RETURN p.name AS name",
            {"min": 40},
        )
        assert runner.results == [{"name": "Cy"}]

    async def test_missing_parameter(self) -> None:
        with pytest.raises(ValueError, match=r"Missing value for parameter \$missing"):
            await run("RETURN $missing AS v", {"other": 1})

    async def test_reserved_names(self) -> None:
        with pytest.raises(ValueError, match=r"\$args is only available inside virtual"):
            await run("RETURN $args AS v")
        with pytest.raises(ValueError, match=r"\$request is only available inside virtual"):
            await run("RETURN $request AS v")
        assert (await run("RETURN $args AS v", {"args": 7})).results == [{"v": 7}]

    async def test_definition_bodies_keep_args_and_see_query_parameters(self) -> None:
        await run(
            "CREATE VIRTUAL (:ParamList) AS { "
            "UNWIND $people AS p RETURN p.id AS id, p.name AS name, $args AS args }"
        )
        runner = await run(
            "MATCH (n:ParamList) RETURN n.name AS name, n.args AS args", {"people": PEOPLE}
        )
        assert [r["name"] for r in runner.results] == ["Ada", "Ben", "Cy"]
        assert runner.results[0]["args"] == {}
        db.nodes.pop("ParamList", None)


class TestDoubledBackticks:
    async def test_label_with_escaped_backtick(self) -> None:
        await run("CREATE VIRTUAL (:`a``b`) AS { RETURN 1 AS id }")
        runner = await run("MATCH (n:`a``b`) RETURN n.id AS id")
        assert runner.results == [{"id": 1}]
        assert "a`b" in db.nodes
        db.nodes.pop("a`b", None)

    async def test_map_key_with_escaped_backtick(self) -> None:
        assert (await run("WITH {`a``b`: 1} AS m RETURN m")).results == [{"m": {"a`b": 1}}]

    async def test_backslash_escape_still_works(self) -> None:
        assert (await run("WITH {`a\\`b`: 1} AS m RETURN m")).results == [{"m": {"a`b": 1}}]

    async def test_quoted_strings_unchanged(self) -> None:
        assert (await run("RETURN 'a``b' AS s")).results == [{"s": "a``b"}]
