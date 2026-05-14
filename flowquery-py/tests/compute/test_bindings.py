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


@pytest.mark.asyncio
async def test_sub_query_tolerates_no_whitespace_after_opening_brace():
    runner = Runner(
        """
        LET users = [{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}];
        CREATE VIRTUAL (:UserNoWs) AS {LOAD JSON FROM users AS u RETURN u.id AS id, u.name AS name};
        MATCH (u:UserNoWs)
        RETURN u.id AS id, u.name AS name
        ORDER BY id
        """
    )
    await runner.run()
    assert runner.results == [
        {"id": 1, "name": "Alice"},
        {"id": 2, "name": "Bob"},
    ]


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
        MERGE INTO data
            USING [
                {id: 2, name: "Bobby"},
                {id: 3, name: "Charlie"}
            ]
            ON id
            WHEN MATCHED THEN UPDATE SET .id, .name
            WHEN NOT MATCHED THEN INSERT;
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
        MERGE INTO fresh
            USING [{id: 1, v: "x"}]
            ON id
            WHEN NOT MATCHED THEN INSERT;
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
        MERGE INTO data
            USING
                UNWIND [{id: 1, n: 99}, {id: 2, n: 20}] AS r
                RETURN r.id AS id, r.n AS n
            ON id
            WHEN MATCHED THEN UPDATE SET .id, .n
            WHEN NOT MATCHED THEN INSERT;
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
    with pytest.raises(ValueError, match="MERGE INTO requires at least one WHEN clause"):
        Runner("LET d = [1]; MERGE INTO d USING [1] ON id; RETURN 1")


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
# MERGE INTO — composite keys
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
        MERGE INTO rows
            USING [
                {tenant: "a", id: 2, v: "new-a2"},
                {tenant: "b", id: 1, v: "new-b1"},
                {tenant: "c", id: 9, v: "new-c9"}
            ]
            ON (tenant, id)
            WHEN MATCHED THEN UPDATE SET .tenant, .id, .v
            WHEN NOT MATCHED THEN INSERT;
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
        MERGE INTO rows
            USING [{id: 2, v: "B"}, {id: 3, v: "C"}]
            ON (id)
            WHEN MATCHED THEN UPDATE SET .id, .v
            WHEN NOT MATCHED THEN INSERT;
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
# MERGE INTO ... WHEN MATCHED THEN UPDATE SET — partial field merge
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_merge_set_only_listed_fields_overwrite():
    runner = Runner(
        """
        LET rows = [
            {id: 1, name: "Alice",   email: "a@x", age: 30},
            {id: 2, name: "Bob",     email: "b@x", age: 40}
        ];
        MERGE INTO rows
            USING [
                {id: 1, name: "Alicia",  email: "alicia@x", age: 999},
                {id: 3, name: "Carol",   email: "c@x"}
            ]
            ON id
            WHEN MATCHED THEN UPDATE SET .name, .email
            WHEN NOT MATCHED THEN INSERT;
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
        MERGE INTO rows
            USING [{id: 1, a: 10}]
            ON id
            WHEN MATCHED THEN UPDATE SET .a, .b
            WHEN NOT MATCHED THEN INSERT;
        LOAD JSON FROM rows AS r
        RETURN r.id AS id, r.a AS a, r.b AS b
        """
    )
    await runner.run()
    # `b` not present in incoming row → existing `b: 2` is preserved
    assert runner.results == [{"id": 1, "a": 10, "b": 2}]


# ---------------------------------------------------------------------------
# MERGE INTO — selective branches
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_merge_when_matched_only_updates():
    runner = Runner(
        """
        LET rows = [{id: 1, v: "a"}, {id: 2, v: "b"}];
        MERGE INTO rows
            USING [{id: 2, v: "B"}, {id: 3, v: "C"}]
            ON id
            WHEN MATCHED THEN UPDATE SET .id, .v;
        LOAD JSON FROM rows AS r
        RETURN r.id AS id, r.v AS v
        ORDER BY id
        """
    )
    await runner.run()
    # id=3 is NOT inserted because the WHEN NOT MATCHED branch is omitted.
    assert runner.results == [
        {"id": 1, "v": "a"},
        {"id": 2, "v": "B"},
    ]


@pytest.mark.asyncio
async def test_update_merge_when_not_matched_only_inserts():
    runner = Runner(
        """
        LET rows = [{id: 1, v: "a"}, {id: 2, v: "b"}];
        MERGE INTO rows
            USING [{id: 2, v: "B-ignored"}, {id: 3, v: "C"}]
            ON id
            WHEN NOT MATCHED THEN INSERT;
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
        MERGE INTO rows
            USING [
                {id: 1, name: "Alicia", age: 999},
                {id: 2, name: "Bob",    age: 40}
            ]
            ON id
            WHEN MATCHED THEN UPDATE SET .name;
        LOAD JSON FROM rows AS r
        RETURN r.id AS id, r.name AS name, r.age AS age
        ORDER BY id
        """
    )
    await runner.run()
    # Only the .name field updates on the matched row; age stays at 30.
    # id=2 is NOT inserted because the WHEN NOT MATCHED branch is omitted.
    assert runner.results == [
        {"id": 1, "name": "Alicia", "age": 30},
    ]


# ---------------------------------------------------------------------------
# MERGE INTO — per-row expressions across aliases
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_merge_when_matched_then_delete():
    runner = Runner(
        """
        LET users = [
            {id: 1, name: "Alice"},
            {id: 2, name: "Bob"},
            {id: 3, name: "Carol"}
        ];
        MERGE INTO users
            USING [{id: 2}, {id: 3}]
            ON id
            WHEN MATCHED THEN DELETE;
        LOAD JSON FROM users AS u
        RETURN u.id AS id, u.name AS name
        ORDER BY id
        """
    )
    await runner.run()
    assert runner.results == [{"id": 1, "name": "Alice"}]


@pytest.mark.asyncio
async def test_merge_set_expression_references_target_and_source_aliases():
    runner = Runner(
        """
        LET users = [
            {id: 1, name: "Alice"},
            {id: 2, name: "Bob"}
        ];
        MERGE INTO users AS u
            USING [
                {id: 1, name: "Smith"},
                {id: 2, name: "Jones"}
            ] AS s
            ON id
            WHEN MATCHED THEN UPDATE SET .name = s.name + " " + u.name;
        LOAD JSON FROM users AS u
        RETURN u.id AS id, u.name AS name
        ORDER BY id
        """
    )
    await runner.run()
    assert runner.results == [
        {"id": 1, "name": "Smith Alice"},
        {"id": 2, "name": "Jones Bob"},
    ]


@pytest.mark.asyncio
async def test_merge_on_predicate_evaluates_per_pair():
    runner = Runner(
        """
        LET users = [
            {tenant: "a", email: "x@a", v: 1},
            {tenant: "b", email: "x@b", v: 2}
        ];
        MERGE INTO users AS u
            USING [
                {tenant: "a", email: "x@a", v: 99},
                {tenant: "b", email: "y@b", v: 100}
            ] AS s
            ON u.tenant = s.tenant AND u.email = s.email
            WHEN MATCHED THEN UPDATE SET .v = s.v
            WHEN NOT MATCHED THEN INSERT;
        LOAD JSON FROM users AS u
        RETURN u.tenant AS tenant, u.email AS email, u.v AS v
        ORDER BY tenant, email
        """
    )
    await runner.run()
    assert runner.results == [
        {"tenant": "a", "email": "x@a", "v": 99},
        {"tenant": "b", "email": "x@b", "v": 2},
        {"tenant": "b", "email": "y@b", "v": 100},
    ]


@pytest.mark.asyncio
async def test_merge_insert_explicit_row_expression():
    runner = Runner(
        """
        LET users = [{id: 1, name: "Alice"}];
        MERGE INTO users AS u
            USING [{id: 2, name: "Bob"}] AS s
            ON id
            WHEN NOT MATCHED THEN INSERT {id: s.id, name: "New: " + s.name};
        LOAD JSON FROM users AS u
        RETURN u.id AS id, u.name AS name
        ORDER BY id
        """
    )
    await runner.run()
    assert runner.results == [
        {"id": 1, "name": "Alice"},
        {"id": 2, "name": "New: Bob"},
    ]


@pytest.mark.asyncio
async def test_merge_bare_binding_source_via_using():
    runner = Runner(
        """
        LET users = [{id: 1, v: "a"}];
        LET incoming = [{id: 1, v: "A"}, {id: 2, v: "B"}];
        MERGE INTO users
            USING incoming AS s
            ON id
            WHEN MATCHED THEN UPDATE SET .v = s.v
            WHEN NOT MATCHED THEN INSERT;
        LOAD JSON FROM users AS u
        RETURN u.id AS id, u.v AS v
        ORDER BY id
        """
    )
    await runner.run()
    assert runner.results == [
        {"id": 1, "v": "A"},
        {"id": 2, "v": "B"},
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
