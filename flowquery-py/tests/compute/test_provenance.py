"""Tests for row-level provenance, path lineage, property values, and
deep-mode threaded virtual sub-query lineage.

Mirrors ``tests/compute/provenance.test.ts`` from the TypeScript port.
"""

from __future__ import annotations

import pytest

from flowquery.compute.runner import Runner, RunnerOptions


async def _create_city_graph() -> None:
    await Runner("""
        CREATE VIRTUAL (:ProvCity) AS {
            UNWIND [
                {id: 'nyc', name: 'New York', country: 'US'},
                {id: 'lax', name: 'Los Angeles', country: 'US'},
                {id: 'yyz', name: 'Toronto', country: 'CA'},
                {id: 'lhr', name: 'London', country: 'UK'}
            ] AS c
            RETURN c.id AS id, c.name AS name, c.country AS country
        }
    """).run()
    await Runner("""
        CREATE VIRTUAL (:ProvCity)-[:PROV_FLIGHT]-(:ProvCity) AS {
            UNWIND [
                {left_id: 'nyc', right_id: 'lax', airline: 'AA'},
                {left_id: 'nyc', right_id: 'yyz', airline: 'AC'},
                {left_id: 'lax', right_id: 'yyz', airline: 'AC'},
                {left_id: 'yyz', right_id: 'lhr', airline: 'BA'}
            ] AS f
            RETURN f.left_id AS left_id, f.right_id AS right_id, f.airline AS airline
        }
    """).run()


async def _drop_city_graph() -> None:
    await Runner(
        "DELETE VIRTUAL (:ProvCity)-[:PROV_FLIGHT]-(:ProvCity)"
    ).run()
    await Runner("DELETE VIRTUAL (:ProvCity)").run()


class TestProvenance:
    """Row-level provenance and lineage."""

    @pytest.mark.asyncio
    async def test_disabled_by_default_returns_empty_array(self):
        await _create_city_graph()
        try:
            runner = Runner("MATCH (a:ProvCity) RETURN a.name AS name")
            await runner.run()
            assert len(runner.results) > 0
            assert runner.provenance == []
        finally:
            await _drop_city_graph()

    @pytest.mark.asyncio
    async def test_records_node_id_per_row(self):
        await _create_city_graph()
        try:
            runner = Runner(
                """
                MATCH (a:ProvCity)
                WHERE a.country = 'US'
                RETURN a.name AS name
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            assert len(runner.results) == len(runner.provenance)
            for prov in runner.provenance:
                assert prov.relationships == []
                assert len(prov.nodes) == 1
                assert prov.nodes[0].alias == "a"
                assert prov.nodes[0].label == "ProvCity"
                assert isinstance(prov.nodes[0].id, str)
            ids = sorted(p.nodes[0].id for p in runner.provenance)
            assert ids == ["lax", "nyc"]
        finally:
            await _drop_city_graph()

    @pytest.mark.asyncio
    async def test_records_relationship_left_right_type_per_row(self):
        await _create_city_graph()
        try:
            runner = Runner(
                """
                MATCH (a:ProvCity {name: 'New York'})-[r:PROV_FLIGHT]->(b:ProvCity)
                RETURN a.name AS origin, b.name AS destination
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            assert len(runner.results) == 2
            assert len(runner.provenance) == 2
            for p in runner.provenance:
                assert len(p.nodes) == 2
                assert [n.alias for n in p.nodes] == ["a", "b"]
                assert p.nodes[0].id == "nyc"
                assert len(p.relationships) == 1
                rel = p.relationships[0]
                assert rel.alias == "r"
                assert rel.type == "PROV_FLIGHT"
                assert len(rel.hops) == 1
                assert rel.hops[0].left_id == "nyc"
                assert rel.hops[0].type == "PROV_FLIGHT"
            right_ids = sorted(
                p.relationships[0].hops[0].right_id for p in runner.provenance
            )
            assert right_ids == ["lax", "yyz"]
        finally:
            await _drop_city_graph()

    @pytest.mark.asyncio
    async def test_preserves_scalar_id_type(self):
        await Runner("""
            CREATE VIRTUAL (:ProvNumId) AS {
                UNWIND [{id: 1, name: 'A'}, {id: 2, name: 'B'}] AS r
                RETURN r.id AS id, r.name AS name
            }
        """).run()
        try:
            runner = Runner(
                "MATCH (n:ProvNumId) RETURN n.name AS name",
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            assert len(runner.provenance) == 2
            for p in runner.provenance:
                # bool is a subclass of int in Python; guard against that.
                assert isinstance(p.nodes[0].id, int) and not isinstance(
                    p.nodes[0].id, bool
                )
            ids = sorted(p.nodes[0].id for p in runner.provenance)
            assert ids == [1, 2]
        finally:
            await Runner("DELETE VIRTUAL (:ProvNumId)").run()

    @pytest.mark.asyncio
    async def test_variable_length_paths_list_every_hop_in_order(self):
        await _create_city_graph()
        try:
            runner = Runner(
                """
                MATCH (a:ProvCity {name: 'New York'})-[r:PROV_FLIGHT*1..2]->(b:ProvCity)
                RETURN a.name AS origin, b.name AS destination
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            assert len(runner.results) == len(runner.provenance)
            multi = [p for p in runner.provenance if len(p.relationships[0].hops) > 1]
            assert len(multi) > 0
            for p in multi:
                hops = p.relationships[0].hops
                for i in range(len(hops) - 1):
                    assert hops[i].right_id == hops[i + 1].left_id
        finally:
            await _drop_city_graph()

    @pytest.mark.asyncio
    async def test_anonymous_aliases_are_none(self):
        await _create_city_graph()
        try:
            runner = Runner(
                """
                MATCH (a:ProvCity {name: 'New York'})-[:PROV_FLIGHT]->(:ProvCity)
                RETURN a.name AS origin
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            assert len(runner.results) == 2
            for p in runner.provenance:
                named = next((n for n in p.nodes if n.alias == "a"), None)
                assert named is not None
                anon = next((n for n in p.nodes if n.alias is None), None)
                assert anon is not None
                assert anon.label == "ProvCity"
                assert len(p.relationships) == 1
                assert p.relationships[0].alias is None
        finally:
            await _drop_city_graph()

    @pytest.mark.asyncio
    async def test_order_by_and_limit_permute_in_lockstep(self):
        await _create_city_graph()
        try:
            runner = Runner(
                """
                MATCH (a:ProvCity)
                RETURN a.name AS name
                ORDER BY a.name ASC
                LIMIT 2
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            assert len(runner.results) == 2
            assert len(runner.provenance) == 2
            assert [r["name"] for r in runner.results] == ["London", "Los Angeles"]
            assert [p.nodes[0].id for p in runner.provenance] == ["lhr", "lax"]
        finally:
            await _drop_city_graph()

    @pytest.mark.asyncio
    async def test_aggregate_return_unions_contributing_ids(self):
        await _create_city_graph()
        try:
            runner = Runner(
                """
                MATCH (a:ProvCity)-[:PROV_FLIGHT]->(b:ProvCity)
                RETURN a.country AS country, count(b) AS reachable
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            assert len(runner.results) == len(runner.provenance)
            us_idx = next(
                i for i, r in enumerate(runner.results) if r["country"] == "US"
            )
            us_prov = runner.provenance[us_idx]
            us_a_ids = sorted(n.id for n in us_prov.nodes if n.alias == "a")
            assert us_a_ids == ["lax", "nyc"]
        finally:
            await _drop_city_graph()

    @pytest.mark.asyncio
    async def test_empty_for_non_graph_queries(self):
        runner = Runner(
            "WITH 1 AS x, 2 AS y RETURN x + y AS sum",
            options=RunnerOptions(provenance=True),
        )
        await runner.run()
        assert runner.results == [{"sum": 3}]
        assert len(runner.provenance) == 1
        prov = runner.provenance[0]
        assert prov.nodes == []
        assert prov.relationships == []
        assert len(prov.rows) == 1
        assert prov.rows[0].nodes == []
        assert prov.rows[0].relationships == []

    @pytest.mark.asyncio
    async def test_optional_match_yields_null_on_misses(self):
        await _create_city_graph()
        try:
            runner = Runner(
                """
                MATCH (a:ProvCity {name: 'London'})
                OPTIONAL MATCH (a)-[r:PROV_FLIGHT]->(b:ProvCity)
                RETURN a.name AS origin, b.name AS destination
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            assert len(runner.results) == 1
            assert runner.results[0]["destination"] is None
            p = runner.provenance[0]
            a_binding = next(n for n in p.nodes if n.alias == "a")
            assert a_binding.id == "lhr"
            b_binding = next(n for n in p.nodes if n.alias == "b")
            assert b_binding.id is None
            assert p.relationships[0].hops == []
        finally:
            await _drop_city_graph()

    @pytest.mark.asyncio
    async def test_union_all_preserves_branch_contributions(self):
        await _create_city_graph()
        try:
            runner = Runner(
                """
                MATCH (a:ProvCity {name: 'New York'}) RETURN a.name AS name
                UNION ALL
                MATCH (b:ProvCity {name: 'London'}) RETURN b.name AS name
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            assert len(runner.results) == 2
            assert len(runner.provenance) == 2
            assert runner.provenance[0].nodes[0].id == "nyc"
            assert runner.provenance[0].nodes[0].alias == "a"
            assert runner.provenance[1].nodes[0].id == "lhr"
            assert runner.provenance[1].nodes[0].alias == "b"
        finally:
            await _drop_city_graph()

    @pytest.mark.asyncio
    async def test_union_dedups_results_keeps_first_branch(self):
        await _create_city_graph()
        try:
            runner = Runner(
                """
                MATCH (a:ProvCity {name: 'New York'}) RETURN a.name AS name
                UNION
                MATCH (b:ProvCity {name: 'New York'}) RETURN b.name AS name
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            assert len(runner.results) == 1
            assert len(runner.provenance) == 1
            assert runner.provenance[0].nodes[0].alias == "a"
        finally:
            await _drop_city_graph()

    @pytest.mark.asyncio
    async def test_chained_match_no_dup_aliases(self):
        await Runner("""
            CREATE VIRTUAL (:ProvPerson) AS {
                UNWIND [
                    {id: 1, name: 'Alice'},
                    {id: 2, name: 'Bob'},
                    {id: 3, name: 'Carol'}
                ] AS r
                RETURN r.id AS id, r.name AS name
            }
        """).run()
        await Runner("""
            CREATE VIRTUAL (:ProvPerson)-[:PROV_KNOWS]-(:ProvPerson) AS {
                UNWIND [
                    {left_id: 1, right_id: 2},
                    {left_id: 2, right_id: 3}
                ] AS r
                RETURN r.left_id AS left_id, r.right_id AS right_id
            }
        """).run()
        try:
            runner = Runner(
                """
                MATCH (a:ProvPerson)-[:PROV_KNOWS]-(b:ProvPerson)
                MATCH (b)-[:PROV_KNOWS]-(c:ProvPerson)
                RETURN a.name AS a, b.name AS b, c.name AS c
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            assert len(runner.results) > 0
            assert len(runner.results) == len(runner.provenance)
            for p in runner.provenance:
                aliases = sorted(n.alias for n in p.nodes)
                assert aliases == ["a", "b", "c"]
        finally:
            await Runner(
                "DELETE VIRTUAL (:ProvPerson)-[:PROV_KNOWS]-(:ProvPerson)"
            ).run()
            await Runner("DELETE VIRTUAL (:ProvPerson)").run()

    @pytest.mark.asyncio
    async def test_create_delete_virtual_yield_empty(self):
        runner = Runner(
            "CREATE VIRTUAL (:ProvEmpty) AS { RETURN 1 AS id }",
            options=RunnerOptions(provenance=True),
        )
        await runner.run()
        assert runner.provenance == []
        await Runner("DELETE VIRTUAL (:ProvEmpty)").run()

    @pytest.mark.asyncio
    async def test_aggregated_with_to_return(self):
        await _create_city_graph()
        try:
            runner = Runner(
                """
                MATCH (a:ProvCity)-[r:PROV_FLIGHT]->(b:ProvCity)
                WITH a.country AS country, count(b) AS reachable
                RETURN country, reachable
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            assert len(runner.results) == len(runner.provenance)
            us_idx = next(
                i for i, r in enumerate(runner.results) if r["country"] == "US"
            )
            us_prov = runner.provenance[us_idx]
            us_a_ids = sorted(n.id for n in us_prov.nodes if n.alias == "a")
            assert us_a_ids == ["lax", "nyc"]
            us_hops = [
                h
                for rel in us_prov.relationships
                if rel.alias == "r"
                for h in rel.hops
            ]
            assert len(us_hops) == 3
        finally:
            await _drop_city_graph()

    @pytest.mark.asyncio
    async def test_aggregated_with_combines_with_post_with_match(self):
        await Runner("""
            CREATE VIRTUAL (:ProvUser) AS {
                UNWIND [
                    {id: 1, name: 'Alice'},
                    {id: 2, name: 'Bob'},
                    {id: 3, name: 'Carol'}
                ] AS u
                RETURN u.id AS id, u.name AS name
            }
        """).run()
        await Runner("""
            CREATE VIRTUAL (:ProvUser)-[:PROV_KNOWS]-(:ProvUser) AS {
                UNWIND [
                    {left_id: 1, right_id: 2},
                    {left_id: 1, right_id: 3}
                ] AS r
                RETURN r.left_id AS left_id, r.right_id AS right_id
            }
        """).run()
        await Runner("""
            CREATE VIRTUAL (:ProvProject) AS {
                UNWIND [
                    {id: 10, name: 'Atlas'},
                    {id: 11, name: 'Borealis'}
                ] AS p
                RETURN p.id AS id, p.name AS name
            }
        """).run()
        await Runner("""
            CREATE VIRTUAL (:ProvUser)-[:PROV_WORKS_ON]-(:ProvProject) AS {
                UNWIND [
                    {left_id: 1, right_id: 10},
                    {left_id: 1, right_id: 11}
                ] AS r
                RETURN r.left_id AS left_id, r.right_id AS right_id
            }
        """).run()
        try:
            runner = Runner(
                """
                MATCH (u:ProvUser)-[:PROV_KNOWS]->(s:ProvUser)
                WITH u, count(s) AS acquaintances
                MATCH (u)-[:PROV_WORKS_ON]->(p:ProvProject)
                RETURN u.name AS name, acquaintances, p.name AS project
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            assert len(runner.results) == 2
            assert len(runner.provenance) == 2
            for p in runner.provenance:
                u = next(n for n in p.nodes if n.alias == "u")
                assert u.id == 1
                known_ids = sorted(n.id for n in p.nodes if n.alias == "s")
                assert known_ids == [2, 3]
                project = next(n for n in p.nodes if n.alias == "p")
                assert project.id in (10, 11)
                knows_hops = [
                    h
                    for rel in p.relationships
                    if rel.type == "PROV_KNOWS" or rel.alias is None
                    for h in rel.hops
                ]
                assert any(h.left_id == 1 for h in knows_hops)
        finally:
            await Runner(
                "DELETE VIRTUAL (:ProvUser)-[:PROV_WORKS_ON]-(:ProvProject)"
            ).run()
            await Runner(
                "DELETE VIRTUAL (:ProvUser)-[:PROV_KNOWS]-(:ProvUser)"
            ).run()
            await Runner("DELETE VIRTUAL (:ProvProject)").run()
            await Runner("DELETE VIRTUAL (:ProvUser)").run()

    @pytest.mark.asyncio
    async def test_chained_aggregated_with(self):
        await _create_city_graph()
        try:
            runner = Runner(
                """
                MATCH (a:ProvCity)-[r:PROV_FLIGHT]->(b:ProvCity)
                WITH a.country AS country, a.name AS origin, count(b) AS reachable
                WITH country, sum(reachable) AS total
                RETURN country, total
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            assert len(runner.results) == len(runner.provenance)
            assert len(runner.results) > 0
            us_idx = next(
                i for i, r in enumerate(runner.results) if r["country"] == "US"
            )
            us_prov = runner.provenance[us_idx]
            us_a_ids = sorted(n.id for n in us_prov.nodes if n.alias == "a")
            assert us_a_ids == ["lax", "nyc"]
            us_hops = [
                h
                for rel in us_prov.relationships
                if rel.alias == "r"
                for h in rel.hops
            ]
            assert len(us_hops) == 3
        finally:
            await _drop_city_graph()


class TestProvenanceDeepMode:
    """Threaded virtual sub-query lineage."""

    @pytest.mark.asyncio
    async def test_unwind_virtual_threads_source_onto_node(self):
        await Runner("""
            CREATE VIRTUAL (:DeepCity) AS {
                UNWIND [
                    {id: 'nyc', name: 'New York'},
                    {id: 'lhr', name: 'London'}
                ] AS c
                RETURN c.id AS id, c.name AS name
            }
        """).run()
        try:
            runner = Runner(
                "MATCH (c:DeepCity) RETURN c.id AS id",
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            assert len(runner.results) == 2
            assert len(runner.provenance) == 2
            for row in runner.provenance:
                binding = next(n for n in row.nodes if n.alias == "c")
                assert binding.source is not None
                assert binding.source.nodes == []
                assert binding.source.relationships == []
        finally:
            await Runner("DELETE VIRTUAL (:DeepCity)").run()

    @pytest.mark.asyncio
    async def test_match_virtual_threads_inner_lineage(self):
        await Runner("""
            CREATE VIRTUAL (:SrcCity) AS {
                UNWIND [
                    {id: 'nyc', country: 'US'},
                    {id: 'lax', country: 'US'},
                    {id: 'lhr', country: 'UK'}
                ] AS c
                RETURN c.id AS id, c.country AS country
            }
        """).run()
        await Runner("""
            CREATE VIRTUAL (:DerivedCity) AS {
                MATCH (s:SrcCity)
                WHERE s.country = 'US'
                RETURN s.id AS id
            }
        """).run()
        try:
            runner = Runner(
                "MATCH (d:DerivedCity) RETURN d.id AS id",
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            ids = sorted(r["id"] for r in runner.results)
            assert ids == ["lax", "nyc"]
            assert len(runner.provenance) == 2
            for i in range(len(runner.results)):
                d = next(n for n in runner.provenance[i].nodes if n.alias == "d")
                assert d.source is not None
                s_binding = next(n for n in d.source.nodes if n.alias == "s")
                assert s_binding.id == d.id
        finally:
            await Runner("DELETE VIRTUAL (:DerivedCity)").run()
            await Runner("DELETE VIRTUAL (:SrcCity)").run()

    @pytest.mark.asyncio
    async def test_virtual_relationship_threads_source_onto_hops(self):
        await Runner("""
            CREATE VIRTUAL (:DeepCity) AS {
                UNWIND [{id: 'nyc'}, {id: 'lax'}] AS c
                RETURN c.id AS id
            }
        """).run()
        await Runner("""
            CREATE VIRTUAL (:DeepCity)-[:DEEP_FLIGHT]-(:DeepCity) AS {
                UNWIND [{left_id: 'nyc', right_id: 'lax', airline: 'AA'}] AS f
                RETURN f.left_id AS left_id, f.right_id AS right_id, f.airline AS airline
            }
        """).run()
        try:
            runner = Runner(
                "MATCH (a:DeepCity)-[r:DEEP_FLIGHT]->(b:DeepCity) RETURN a.id, b.id",
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            assert len(runner.results) == 1
            assert len(runner.provenance) == 1
            row = runner.provenance[0]
            a_binding = next(n for n in row.nodes if n.alias == "a")
            b_binding = next(n for n in row.nodes if n.alias == "b")
            assert a_binding.source is not None
            assert b_binding.source is not None
            r_hop = next(rel for rel in row.relationships if rel.alias == "r").hops[0]
            assert r_hop.source is not None
            assert r_hop.source.nodes == []
            assert r_hop.source.relationships == []
        finally:
            await Runner(
                "DELETE VIRTUAL (:DeepCity)-[:DEEP_FLIGHT]-(:DeepCity)"
            ).run()
            await Runner("DELETE VIRTUAL (:DeepCity)").run()

    @pytest.mark.asyncio
    async def test_recurses_through_nested_virtuals(self):
        await Runner("""
            CREATE VIRTUAL (:LevelA) AS {
                UNWIND [{id: 1}, {id: 2}] AS r
                RETURN r.id AS id
            }
        """).run()
        await Runner("""
            CREATE VIRTUAL (:LevelB) AS {
                MATCH (a:LevelA) RETURN a.id AS id
            }
        """).run()
        await Runner("""
            CREATE VIRTUAL (:LevelC) AS {
                MATCH (b:LevelB) RETURN b.id AS id
            }
        """).run()
        try:
            runner = Runner(
                "MATCH (c:LevelC) RETURN c.id AS id",
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            assert len(runner.results) == 2
            for row in runner.provenance:
                c = next(n for n in row.nodes if n.alias == "c")
                assert c.source is not None
                b = next(n for n in c.source.nodes if n.alias == "b")
                assert b.id == c.id
                assert b.source is not None
                a = next(n for n in b.source.nodes if n.alias == "a")
                assert a.id == c.id
        finally:
            await Runner("DELETE VIRTUAL (:LevelC)").run()
            await Runner("DELETE VIRTUAL (:LevelB)").run()
            await Runner("DELETE VIRTUAL (:LevelA)").run()


class TestProvenancePathAndProperties:
    """Always-on path and matched-property metadata."""

    @pytest.mark.asyncio
    async def test_relationship_path_lists_node_ids(self):
        await _create_city_graph()
        try:
            runner = Runner(
                """
                MATCH (a:ProvCity {name: 'New York'})-[r:PROV_FLIGHT]->(b:ProvCity)
                RETURN a.name AS origin, b.name AS destination
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            for p in runner.provenance:
                rel = p.relationships[0]
                assert rel.path is not None
                assert isinstance(rel.path, list)
                assert rel.path == [rel.hops[0].left_id, rel.hops[0].right_id]
        finally:
            await _drop_city_graph()

    @pytest.mark.asyncio
    async def test_variable_length_path_lists_every_visited_node(self):
        await _create_city_graph()
        try:
            runner = Runner(
                """
                MATCH (a:ProvCity {name: 'New York'})-[r:PROV_FLIGHT*1..2]->(b:ProvCity)
                RETURN a.name AS origin, b.name AS destination
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            for p in runner.provenance:
                rel = p.relationships[0]
                assert len(rel.path) == len(rel.hops) + 1
                expected = [rel.hops[0].left_id]
                for h in rel.hops:
                    expected.append(h.right_id)
                assert rel.path == expected
        finally:
            await _drop_city_graph()

    @pytest.mark.asyncio
    async def test_non_aggregate_rows_expose_single_segment(self):
        await _create_city_graph()
        try:
            runner = Runner(
                """
                MATCH (a:ProvCity)
                WHERE a.country = 'US'
                RETURN a.name AS name
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            for p in runner.provenance:
                assert isinstance(p.rows, list)
                assert len(p.rows) == 1
                assert p.rows[0].nodes == p.nodes
                assert p.rows[0].relationships == p.relationships
        finally:
            await _drop_city_graph()

    @pytest.mark.asyncio
    async def test_aggregate_rows_expose_one_segment_per_input(self):
        await _create_city_graph()
        try:
            runner = Runner(
                """
                MATCH (a:ProvCity)-[:PROV_FLIGHT]->(b:ProvCity)
                RETURN a.country AS country, collect(b.name) AS destinations
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            assert len(runner.results) == len(runner.provenance)
            for i in range(len(runner.results)):
                result = runner.results[i]
                prov = runner.provenance[i]
                destinations = result["destinations"]
                assert len(prov.rows) == len(destinations)
                for k in range(len(destinations)):
                    segment = prov.rows[k]
                    b_binding = next(
                        (n for n in segment.nodes if n.alias == "b"), None
                    )
                    assert b_binding is not None
                    a_binding = next(
                        (n for n in segment.nodes if n.alias == "a"), None
                    )
                    assert a_binding is not None
        finally:
            await _drop_city_graph()

    @pytest.mark.asyncio
    async def test_attaches_matched_properties_onto_node(self):
        await _create_city_graph()
        try:
            runner = Runner(
                """
                MATCH (a:ProvCity)
                WHERE a.country = 'US'
                RETURN a.name AS name
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            for p in runner.provenance:
                a = p.nodes[0]
                assert a.properties is not None
                assert "name" in a.properties
                assert a.properties["country"] == "US"
                assert "id" not in a.properties
                assert "_label" not in a.properties
        finally:
            await _drop_city_graph()

    @pytest.mark.asyncio
    async def test_attaches_matched_properties_onto_relationship_hop(self):
        await _create_city_graph()
        try:
            runner = Runner(
                """
                MATCH (a:ProvCity {name: 'New York'})-[r:PROV_FLIGHT]->(b:ProvCity)
                RETURN a.name AS origin, b.name AS destination
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            for p in runner.provenance:
                hop = p.relationships[0].hops[0]
                assert hop.properties is not None
                assert "airline" in hop.properties
                assert "left_id" not in hop.properties
                assert "right_id" not in hop.properties
        finally:
            await _drop_city_graph()
