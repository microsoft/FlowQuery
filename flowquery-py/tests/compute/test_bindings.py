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
async def test_update_merge_on_missing_binding_throws():
    runner = Runner(
        """
        UPDATE fresh MERGE ON id = [{id: 1, v: "x"}];
        LOAD JSON FROM fresh AS f
        RETURN f.id AS id, f.v AS v
        """
    )
    with pytest.raises(RuntimeError, match="Binding 'fresh' is not defined"):
        await runner.run()


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


@pytest.mark.asyncio
async def test_plain_update_on_missing_binding_throws():
    runner = Runner(
        """
        UPDATE undeclared = [1, 2, 3];
        LOAD JSON FROM undeclared AS x
        RETURN x
        """
    )
    with pytest.raises(RuntimeError, match="Binding 'undeclared' is not defined"):
        await runner.run()


# ---------------------------------------------------------------------------
# UPDATE ... MERGE ON — composite keys
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_merge_composite_keys_matches_on_multiple():
    runner = Runner(
        """
        LET rows = [
            {tenant: "a", id: 1, v: "old-a1"},
            {tenant: "a", id: 2, v: "old-a2"},
            {tenant: "b", id: 1, v: "old-b1"}
        ];
        UPDATE rows MERGE ON (tenant, id) = [
            {tenant: "a", id: 2, v: "new-a2"},
            {tenant: "b", id: 1, v: "new-b1"},
            {tenant: "c", id: 9, v: "new-c9"}
        ];
        LOAD JSON FROM rows AS r
        RETURN r.tenant AS tenant, r.id AS id, r.v AS v
        ORDER BY tenant, id
        """
    )
    await runner.run()
    assert runner.results == [
        {"tenant": "a", "id": 1, "v": "old-a1"},
        {"tenant": "a", "id": 2, "v": "new-a2"},
        {"tenant": "b", "id": 1, "v": "new-b1"},
        {"tenant": "c", "id": 9, "v": "new-c9"},
    ]


@pytest.mark.asyncio
async def test_update_merge_composite_single_element_equals_simple_form():
    runner = Runner(
        """
        LET rows = [{id: 1, v: "a"}, {id: 2, v: "b"}];
        UPDATE rows MERGE ON (id) = [{id: 2, v: "B"}, {id: 3, v: "C"}];
        LOAD JSON FROM rows AS r
        RETURN r.id AS id, r.v AS v
        ORDER BY id
        """
    )
    await runner.run()
    assert runner.results == [
        {"id": 1, "v": "a"},
        {"id": 2, "v": "B"},
        {"id": 3, "v": "C"},
    ]


# ---------------------------------------------------------------------------
# UPDATE ... MERGE ON ... SET — partial field merge
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_merge_set_only_listed_fields_overwrite():
    runner = Runner(
        """
        LET rows = [
            {id: 1, name: "Alice",   email: "a@x", age: 30},
            {id: 2, name: "Bob",     email: "b@x", age: 40}
        ];
        UPDATE rows MERGE ON id SET .name, .email = [
            {id: 1, name: "Alicia",  email: "alicia@x", age: 999},
            {id: 3, name: "Carol",   email: "c@x"}
        ];
        LOAD JSON FROM rows AS r
        RETURN r.id AS id, r.name AS name, r.email AS email, r.age AS age
        ORDER BY id
        """
    )
    await runner.run()
    # row 1: only name+email overwritten, age preserved at 30 (NOT 999)
    # row 2: untouched
    # row 3: appended; age missing on incoming row → projection yields None
    assert runner.results == [
        {"id": 1, "name": "Alicia", "email": "alicia@x", "age": 30},
        {"id": 2, "name": "Bob",    "email": "b@x",      "age": 40},
        {"id": 3, "name": "Carol",  "email": "c@x",      "age": None},
    ]


@pytest.mark.asyncio
async def test_update_merge_set_missing_field_on_incoming_leaves_existing():
    runner = Runner(
        """
        LET rows = [{id: 1, a: 1, b: 2}];
        UPDATE rows MERGE ON id SET .a, .b = [
            {id: 1, a: 10}
        ];
        LOAD JSON FROM rows AS r
        RETURN r.id AS id, r.a AS a, r.b AS b
        """
    )
    await runner.run()
    # `b` not present in incoming row → existing `b: 2` is preserved
    assert runner.results == [{"id": 1, "a": 10, "b": 2}]


# ---------------------------------------------------------------------------
# UPDATE ... MERGE ON ... WHEN [NOT] MATCHED
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_merge_when_matched_only_updates():
    runner = Runner(
        """
        LET rows = [{id: 1, v: "a"}, {id: 2, v: "b"}];
        UPDATE rows MERGE ON id WHEN MATCHED = [
            {id: 2, v: "B"},
            {id: 3, v: "C"}
        ];
        LOAD JSON FROM rows AS r
        RETURN r.id AS id, r.v AS v
        ORDER BY id
        """
    )
    await runner.run()
    # id=3 is NOT inserted because WHEN MATCHED suppresses the insert branch.
    assert runner.results == [
        {"id": 1, "v": "a"},
        {"id": 2, "v": "B"},
    ]


@pytest.mark.asyncio
async def test_update_merge_when_not_matched_only_inserts():
    runner = Runner(
        """
        LET rows = [{id: 1, v: "a"}, {id: 2, v: "b"}];
        UPDATE rows MERGE ON id WHEN NOT MATCHED = [
            {id: 2, v: "B-ignored"},
            {id: 3, v: "C"}
        ];
        LOAD JSON FROM rows AS r
        RETURN r.id AS id, r.v AS v
        ORDER BY id
        """
    )
    await runner.run()
    # id=2 is NOT updated; id=3 is inserted.
    assert runner.results == [
        {"id": 1, "v": "a"},
        {"id": 2, "v": "b"},
        {"id": 3, "v": "C"},
    ]


@pytest.mark.asyncio
async def test_update_merge_when_matched_composes_with_set():
    runner = Runner(
        """
        LET rows = [{id: 1, name: "Alice", age: 30}];
        UPDATE rows MERGE ON id SET .name WHEN MATCHED = [
            {id: 1, name: "Alicia", age: 999},
            {id: 2, name: "Bob",    age: 40}
        ];
        LOAD JSON FROM rows AS r
        RETURN r.id AS id, r.name AS name, r.age AS age
        ORDER BY id
        """
    )
    await runner.run()
    # Only the .name field updates on the matched row; age stays at 30.
    # id=2 is NOT inserted because WHEN MATCHED suppresses the insert.
    assert runner.results == [
        {"id": 1, "name": "Alicia", "age": 30},
    ]


# ---------------------------------------------------------------------------
# UPDATE ... AS u DELETE WHERE — row filtering
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_delete_removes_rows_matching_predicate():
    runner = Runner(
        """
        LET rows = [
            {id: 1, name: "Alice", age: 30},
            {id: 2, name: "Bob",   age: 17},
            {id: 3, name: "Carol", age: 22}
        ];
        UPDATE rows AS u DELETE WHERE u.age < 21;
        LOAD JSON FROM rows AS r
        RETURN r.id AS id, r.name AS name
        ORDER BY id
        """
    )
    await runner.run()
    assert runner.results == [
        {"id": 1, "name": "Alice"},
        {"id": 3, "name": "Carol"},
    ]


@pytest.mark.asyncio
async def test_update_delete_scalar_list_bare_alias_predicate():
    runner = Runner(
        """
        LET nums = [1, 2, 3, 4, 5];
        UPDATE nums AS n DELETE WHERE n % 2 = 0;
        LOAD JSON FROM nums AS x
        RETURN x
        """
    )
    await runner.run()
    assert runner.results == [{"x": 1}, {"x": 3}, {"x": 5}]


@pytest.mark.asyncio
async def test_update_delete_can_reference_other_bindings_in_predicate():
    runner = Runner(
        """
        LET banned = [2, 4];
        LET rows = [{id: 1}, {id: 2}, {id: 3}, {id: 4}, {id: 5}];
        UPDATE rows AS u DELETE WHERE u.id IN banned;
        LOAD JSON FROM rows AS r
        RETURN r.id AS id
        ORDER BY id
        """
    )
    await runner.run()
    assert runner.results == [{"id": 1}, {"id": 3}, {"id": 5}]


@pytest.mark.asyncio
async def test_update_delete_preserves_relative_order():
    runner = Runner(
        """
        LET rows = [
            {id: 10, drop: false},
            {id: 20, drop: true},
            {id: 30, drop: false},
            {id: 40, drop: true},
            {id: 50, drop: false}
        ];
        UPDATE rows AS u DELETE WHERE u.drop;
        LOAD JSON FROM rows AS r
        RETURN r.id AS id
        """
    )
    await runner.run()
    assert runner.results == [{"id": 10}, {"id": 30}, {"id": 50}]


@pytest.mark.asyncio
async def test_update_delete_throws_when_binding_missing():
    runner = Runner(
        """
        UPDATE no_such AS u DELETE WHERE u.x = 1;
        RETURN 1 AS done
        """
    )
    with pytest.raises(RuntimeError, match="Binding 'no_such' is not defined"):
        await runner.run()


@pytest.mark.asyncio
async def test_update_delete_throws_when_binding_not_a_list():
    runner = Runner(
        """
        LET scalar = 42;
        UPDATE scalar AS u DELETE WHERE u = 42;
        RETURN 1 AS done
        """
    )
    with pytest.raises(RuntimeError, match="requires 'scalar' to be a list"):
        await runner.run()
