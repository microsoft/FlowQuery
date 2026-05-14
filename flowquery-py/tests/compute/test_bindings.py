"""Tests for LET / UPDATE / MERGE ON bindings."""

import pytest

from flowquery.compute.runner import Runner
from flowquery.graph.bindings import Bindings
from flowquery.graph.database import Database


@pytest.fixture(autouse=True)
def _clear_bindings():
    Bindings.get_instance().clear()
    db = Database.get_instance()
    # Snapshot virtual definitions registered before each test so we can
    # restore them on teardown — Bindings tests register short-lived
    # virtuals that reference unbound names once the test completes and
    # would otherwise poison `MATCH (n)` in later tests.
    before_nodes = dict(db.nodes)
    before_rels = {t: dict(m) for t, m in db.relationships.items()}
    yield
    Bindings.get_instance().clear()
    db.nodes.clear()
    db.nodes.update(before_nodes)
    db.relationships.clear()
    db.relationships.update(before_rels)


# ---------------------------------------------------------------------------
# LET — literal bindings
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_let_binds_a_literal_list():
    runner = Runner(
        """
        LET nums = [10, 20, 30];
        LOAD JSON FROM nums AS n
        RETURN n
        """
    )
    await runner.run()
    assert runner.results == [{"n": 10}, {"n": 20}, {"n": 30}]


@pytest.mark.asyncio
async def test_let_binds_a_map_literal():
    runner = Runner(
        """
        LET user = {id: 1, name: "Alice"};
        LOAD JSON FROM user AS u
        RETURN u.id AS id, u.name AS name
        """
    )
    await runner.run()
    assert runner.results == [{"id": 1, "name": "Alice"}]


@pytest.mark.asyncio
async def test_let_binds_list_of_objects_used_as_virtual_node_source():
    runner = Runner(
        """
        LET users = [
            {id: 1, name: "User 1", manager_id: 2},
            {id: 2, name: "User 2", manager_id: null}
        ];
        CREATE VIRTUAL (:PyLetUser) AS {
            LOAD JSON FROM users AS u
            RETURN u.id AS id, u.name AS name
        };
        CREATE VIRTUAL (:PyLetUser)-[:PY_LET_REPORTS_TO]-(:PyLetUser) AS {
            LOAD JSON FROM users AS u
            RETURN u.id AS left_id, u.manager_id AS right_id
        };
        MATCH (e:PyLetUser)
        OPTIONAL MATCH (e)-[:PY_LET_REPORTS_TO]->(m:PyLetUser)
        RETURN e.name AS name, m.name AS manager
        ORDER BY name
        """
    )
    await runner.run()
    assert runner.results == [
        {"name": "User 1", "manager": "User 2"},
        {"name": "User 2", "manager": None},
    ]


@pytest.mark.asyncio
async def test_let_binds_scalar():
    runner = Runner(
        """
        LET answer = 42;
        LOAD JSON FROM answer AS a
        RETURN a
        """
    )
    await runner.run()
    assert runner.results == [{"a": 42}]


# ---------------------------------------------------------------------------
# LET — query bindings
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_let_binds_inline_sub_query_rows():
    runner = Runner(
        """
        LET evens = UNWIND [1, 2, 3, 4] AS n WITH n WHERE n % 2 = 0 RETURN n AS value;
        LOAD JSON FROM evens AS e
        RETURN e.value AS v
        """
    )
    await runner.run()
    assert runner.results == [{"v": 2}, {"v": 4}]


@pytest.mark.asyncio
async def test_let_binds_brace_wrapped_sub_query_rows():
    runner = Runner(
        """
        LET items = { UNWIND [1, 2] AS n RETURN n AS v };
        LOAD JSON FROM items AS i
        RETURN i.v AS v
        """
    )
    await runner.run()
    assert runner.results == [{"v": 1}, {"v": 2}]


# ---------------------------------------------------------------------------
# UPDATE — full replace
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_replaces_binding():
    runner = Runner(
        """
        LET data = [{id: 1, v: "a"}];
        UPDATE data = [{id: 2, v: "b"}, {id: 3, v: "c"}];
        LOAD JSON FROM data AS d
        RETURN d.id AS id, d.v AS v
        """
    )
    await runner.run()
    assert runner.results == [
        {"id": 2, "v": "b"},
        {"id": 3, "v": "c"},
    ]


@pytest.mark.asyncio
async def test_update_replace_with_query_rhs():
    runner = Runner(
        """
        LET data = [1, 2];
        UPDATE data = UNWIND [10, 20, 30] AS x RETURN x AS x;
        LOAD JSON FROM data AS d
        RETURN d.x AS x
        """
    )
    await runner.run()
    assert runner.results == [{"x": 10}, {"x": 20}, {"x": 30}]


# ---------------------------------------------------------------------------
# UPDATE ... MERGE ON — upsert
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_merge_replaces_and_appends():
    runner = Runner(
        """
        LET data = [
            {id: 1, name: "Alice"},
            {id: 2, name: "Bob"}
        ];
        UPDATE data MERGE ON id = [
            {id: 2, name: "Bobby"},
            {id: 3, name: "Charlie"}
        ];
        LOAD JSON FROM data AS d
        RETURN d.id AS id, d.name AS name
        ORDER BY id
        """
    )
    await runner.run()
    assert runner.results == [
        {"id": 1, "name": "Alice"},
        {"id": 2, "name": "Bobby"},
        {"id": 3, "name": "Charlie"},
    ]


@pytest.mark.asyncio
async def test_update_merge_on_missing_binding_is_insert():
    runner = Runner(
        """
        UPDATE fresh MERGE ON id = [{id: 1, v: "x"}, {id: 2, v: "y"}];
        LOAD JSON FROM fresh AS f
        RETURN f.id AS id, f.v AS v
        ORDER BY id
        """
    )
    await runner.run()
    assert runner.results == [
        {"id": 1, "v": "x"},
        {"id": 2, "v": "y"},
    ]


@pytest.mark.asyncio
async def test_update_merge_supports_query_rhs():
    runner = Runner(
        """
        LET data = [{id: 1, n: 10}];
        UPDATE data MERGE ON id =
            UNWIND [{id: 1, n: 99}, {id: 2, n: 20}] AS r
            RETURN r.id AS id, r.n AS n;
        LOAD JSON FROM data AS d
        RETURN d.id AS id, d.n AS n
        ORDER BY id
        """
    )
    await runner.run()
    assert runner.results == [
        {"id": 1, "n": 99},
        {"id": 2, "n": 20},
    ]


# ---------------------------------------------------------------------------
# Error cases
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_load_from_unbound_throws():
    runner = Runner(
        """
        LOAD JSON FROM definitely_not_bound AS x
        RETURN x
        """
    )
    with pytest.raises(Exception, match="definitely_not_bound"):
        await runner.run()


def test_let_requires_equals():
    with pytest.raises(ValueError, match="Expected '='"):
        Runner("LET foo 1; RETURN 1")


def test_update_merge_requires_on():
    with pytest.raises(ValueError, match="Expected ON"):
        Runner("UPDATE foo MERGE = [1]; RETURN 1")
