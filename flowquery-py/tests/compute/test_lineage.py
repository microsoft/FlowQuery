"""Tests for column-level lineage (info.returns), trace_row, lineage(),
and data-source / LET-chain provenance.

Mirrors the corresponding TS tests in ``tests/compute/runner.test.ts``.
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pytest

from flowquery.compute.runner import Runner, RunnerOptions
from flowquery.parsing.statement_info_crawler import ColumnLineage


class TestColumnLineageMetadata:
    """``StatementInfo.returns`` exposes per-output-column lineage."""

    @pytest.mark.asyncio
    async def test_combined_with_provenance_traces_each_cell(self):
        await Runner("""
            CREATE VIRTUAL (:ColTraceCity) AS {
                UNWIND [
                    {id: 'nyc', name: 'New York', country: 'US'},
                    {id: 'lhr', name: 'London', country: 'UK'}
                ] AS c
                RETURN c.id AS id, c.name AS name, c.country AS country
            }
        """).run()
        try:
            runner = Runner(
                """
                MATCH (c:ColTraceCity)
                WHERE c.country = 'US'
                RETURN c.name AS origin, c.country AS region
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()

            info = runner.metadata.info
            assert info is not None
            assert len(runner.results) == 1
            row = runner.results[0]
            prov = runner.provenance[0]
            for column, value in row.items():
                lineage = info.returns[column]
                assert lineage is not None
                assert len(lineage.references) > 0
                ref = lineage.references[0]
                binding = next(
                    (n for n in prov.nodes if n.alias == ref.alias), None
                )
                assert binding is not None
                assert binding.label == ref.labels[0]
                assert binding.properties is not None
                assert binding.properties[ref.property] == value
        finally:
            await Runner("DELETE VIRTUAL (:ColTraceCity)").run()

    def test_returns_is_empty_for_queries_without_return(self):
        runner = Runner(
            "CREATE VIRTUAL (:ColLinEmpty) AS { UNWIND [{id: 1}] AS r RETURN r.id AS id }"
        )
        info = runner.metadata.info
        assert info is not None
        assert info.returns == {}

    def test_returns_is_a_deep_copy(self):
        runner = Runner("WITH 1 AS x RETURN x AS y")
        info1 = runner.metadata.info
        assert info1 is not None
        info1.returns["injected"] = ColumnLineage(references=[], kind="literal")
        if "y" in info1.returns:
            from flowquery.parsing.statement_info_crawler import ColumnReference

            info1.returns["y"].references.append(
                ColumnReference(
                    alias="MUT", kind="node", labels=["MUT"], property="MUT"
                )
            )
        info2 = runner.metadata.info
        assert info2 is not None
        assert "injected" not in info2.returns
        assert info2.returns["y"].references == []

    @pytest.mark.asyncio
    async def test_maps_each_output_column_to_its_alias_property_reference(self):
        """Each RETURN column exposes its alias/labels/property reference."""
        await Runner("""
            CREATE VIRTUAL (:ColLinCity) AS {
                UNWIND [{id: 'nyc', name: 'New York', country: 'US'}] AS c
                RETURN c.id AS id, c.name AS name, c.country AS country
            }
        """).run()
        try:
            runner = Runner("""
                MATCH (c:ColLinCity)
                RETURN c.name AS origin, c.country AS region
            """)
            info = runner.metadata.info
            assert info is not None
            assert set(info.returns.keys()) == {"origin", "region"}
            origin = info.returns["origin"]
            assert origin.kind == "property"
            assert len(origin.references) == 1
            assert origin.references[0].alias == "c"
            assert origin.references[0].kind == "node"
            assert origin.references[0].labels == ["ColLinCity"]
            assert origin.references[0].property == "name"
            region = info.returns["region"]
            assert region.kind == "property"
            assert len(region.references) == 1
            assert region.references[0].alias == "c"
            assert region.references[0].kind == "node"
            assert region.references[0].labels == ["ColLinCity"]
            assert region.references[0].property == "country"
        finally:
            await Runner("DELETE VIRTUAL (:ColLinCity)").run()

    def test_kind_literal_for_pure_literal_columns(self):
        """Pure literal RETURN columns report ``kind='literal'`` with no refs."""
        runner = Runner("WITH 1 AS x RETURN 42 AS answer, 'hi' AS greeting")
        info = runner.metadata.info
        assert info is not None
        assert info.returns["answer"].kind == "literal"
        assert info.returns["answer"].references == []
        assert info.returns["greeting"].kind == "literal"
        assert info.returns["greeting"].references == []

    @pytest.mark.asyncio
    async def test_kind_expression_when_column_combines_multiple_references(self):
        """A column combining multiple lookups reports ``kind='expression'``."""
        await Runner("""
            CREATE VIRTUAL (:ColLinPerson) AS {
                UNWIND [{id: 1, first: 'Ada', last: 'Lovelace'}] AS r
                RETURN r.id AS id, r.first AS first, r.last AS last
            }
        """).run()
        try:
            runner = Runner("""
                MATCH (p:ColLinPerson)
                RETURN p.first + ' ' + p.last AS fullName
            """)
            info = runner.metadata.info
            assert info is not None
            full = info.returns["fullName"]
            assert full.kind == "expression"
            assert len(full.references) == 2
            props = sorted(ref.property for ref in full.references)
            assert props == ["first", "last"]
            for ref in full.references:
                assert ref.alias == "p"
                assert ref.kind == "node"
                assert ref.labels == ["ColLinPerson"]
        finally:
            await Runner("DELETE VIRTUAL (:ColLinPerson)").run()

    @pytest.mark.asyncio
    async def test_kind_aggregate_surfaces_function_name_and_inner_references(self):
        """Aggregate columns report ``kind='aggregate'`` with function name."""
        await Runner("""
            CREATE VIRTUAL (:ColLinAggCity) AS {
                UNWIND [{id: 'a', country: 'US'}, {id: 'b', country: 'US'}] AS r
                RETURN r.id AS id, r.country AS country
            }
        """).run()
        try:
            runner = Runner("""
                MATCH (c:ColLinAggCity)
                RETURN c.country AS country, count(c) AS n, collect(c.id) AS ids
            """)
            info = runner.metadata.info
            assert info is not None
            assert info.returns["country"].kind == "property"
            n_col = info.returns["n"]
            assert n_col.kind == "aggregate"
            assert n_col.aggregate == "count"
            assert n_col.references == []
            ids_col = info.returns["ids"]
            assert ids_col.kind == "aggregate"
            assert ids_col.aggregate == "collect"
            assert len(ids_col.references) == 1
            assert ids_col.references[0].alias == "c"
            assert ids_col.references[0].kind == "node"
            assert ids_col.references[0].labels == ["ColLinAggCity"]
            assert ids_col.references[0].property == "id"
        finally:
            await Runner("DELETE VIRTUAL (:ColLinAggCity)").run()

    @pytest.mark.asyncio
    async def test_covers_relationship_references(self):
        """Relationship variables in RETURN are tracked with ``kind='relationship'``."""
        await Runner("""
            CREATE VIRTUAL (:ColLinRelCity) AS {
                UNWIND [{id: 'nyc'}, {id: 'lax'}] AS c RETURN c.id AS id
            }
        """).run()
        await Runner("""
            CREATE VIRTUAL (:ColLinRelCity)-[:COL_LIN_FLIGHT]-(:ColLinRelCity) AS {
                UNWIND [{left_id: 'nyc', right_id: 'lax', airline: 'AA'}] AS f
                RETURN f.left_id AS left_id, f.right_id AS right_id, f.airline AS airline
            }
        """).run()
        try:
            runner = Runner("""
                MATCH (a:ColLinRelCity)-[r:COL_LIN_FLIGHT]->(b:ColLinRelCity)
                RETURN r.airline AS airline
            """)
            info = runner.metadata.info
            assert info is not None
            airline = info.returns["airline"]
            assert airline.kind == "property"
            assert len(airline.references) == 1
            ref = airline.references[0]
            assert ref.alias == "r"
            assert ref.kind == "relationship"
            assert ref.labels == ["COL_LIN_FLIGHT"]
            assert ref.property == "airline"
        finally:
            await Runner(
                "DELETE VIRTUAL (:ColLinRelCity)-[:COL_LIN_FLIGHT]-(:ColLinRelCity)"
            ).run()
            await Runner("DELETE VIRTUAL (:ColLinRelCity)").run()


class TestTraceRow:
    """:meth:`Runner.trace_row` bundles structural lineage with row provenance."""

    @pytest.mark.asyncio
    async def test_pairs_each_column_with_lineage_and_bindings(self):
        await Runner("""
            CREATE VIRTUAL (:TraceRowCity) AS {
                UNWIND [
                    {id: 'nyc', name: 'New York', country: 'US'},
                    {id: 'lhr', name: 'London', country: 'UK'}
                ] AS c
                RETURN c.id AS id, c.name AS name, c.country AS country
            }
        """).run()
        try:
            runner = Runner(
                """
                MATCH (c:TraceRowCity)
                WHERE c.country = 'US'
                RETURN c.name AS origin, c.country AS region
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            assert len(runner.results) == 1
            trace = runner.trace_row(0)
            assert sorted(trace.keys()) == ["origin", "region"]

            assert trace["origin"].column == "origin"
            assert trace["origin"].value == "New York"
            assert trace["origin"].lineage is not None
            assert trace["origin"].lineage.kind == "property"
            assert len(trace["origin"].lineage.references) == 1
            ref = trace["origin"].lineage.references[0]
            assert ref.alias == "c"
            assert ref.kind == "node"
            assert ref.labels == ["TraceRowCity"]
            assert ref.property == "name"
            assert len(trace["origin"].bindings) == 1
            assert trace["origin"].bindings[0].reference.alias == "c"
            assert trace["origin"].bindings[0].reference.property == "name"
            assert trace["origin"].bindings[0].value == "New York"
            assert trace["origin"].bindings[0].node is not None
            assert trace["origin"].bindings[0].node.id == "nyc"
            assert trace["origin"].bindings[0].relationship is None

            assert trace["region"].value == "US"
            assert trace["region"].bindings[0].value == "US"
            assert trace["region"].bindings[0].node is not None
            assert trace["region"].bindings[0].node.properties is not None
            assert trace["region"].bindings[0].node.properties["country"] == "US"
        finally:
            await Runner("DELETE VIRTUAL (:TraceRowCity)").run()

    @pytest.mark.asyncio
    async def test_expression_column_lists_all_references(self):
        await Runner("""
            CREATE VIRTUAL (:TraceRowPerson) AS {
                UNWIND [{id: 1, first: 'Ada', last: 'Lovelace'}] AS r
                RETURN r.id AS id, r.first AS first, r.last AS last
            }
        """).run()
        try:
            runner = Runner(
                """
                MATCH (p:TraceRowPerson)
                RETURN p.first + ' ' + p.last AS fullName
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()

            trace = runner.trace_row(0)
            assert trace["fullName"].value == "Ada Lovelace"
            assert trace["fullName"].lineage is not None
            assert trace["fullName"].lineage.kind == "expression"
            assert len(trace["fullName"].bindings) == 2
            by_prop = {b.reference.property: b.value for b in trace["fullName"].bindings}
            assert by_prop["first"] == "Ada"
            assert by_prop["last"] == "Lovelace"
            assert (
                trace["fullName"].bindings[0].node.id
                == trace["fullName"].bindings[1].node.id
            )
        finally:
            await Runner("DELETE VIRTUAL (:TraceRowPerson)").run()

    @pytest.mark.asyncio
    async def test_aggregate_column_one_binding_per_input_row(self):
        await Runner("""
            CREATE VIRTUAL (:TraceRowAggCity) AS {
                UNWIND [
                    {id: 'a', country: 'US'},
                    {id: 'b', country: 'US'},
                    {id: 'c', country: 'US'}
                ] AS r
                RETURN r.id AS id, r.country AS country
            }
        """).run()
        try:
            runner = Runner(
                """
                MATCH (c:TraceRowAggCity)
                RETURN c.country AS country, collect(c.id) AS ids
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            assert len(runner.results) == 1
            trace = runner.trace_row(0)
            assert trace["country"].lineage.kind == "property"
            assert trace["country"].value == "US"

            assert trace["ids"].lineage.kind == "aggregate"
            assert trace["ids"].lineage.aggregate is not None
            assert trace["ids"].lineage.aggregate.lower() in ("collect",)
            assert sorted(trace["ids"].value) == ["a", "b", "c"]
            assert len(trace["ids"].bindings) == 3
            id_values = sorted(b.value for b in trace["ids"].bindings)
            assert id_values == ["a", "b", "c"]
            for b in trace["ids"].bindings:
                assert b.reference.property == "id"
                assert b.node is not None
        finally:
            await Runner("DELETE VIRTUAL (:TraceRowAggCity)").run()

    @pytest.mark.asyncio
    async def test_literal_column_has_lineage_no_bindings(self):
        runner = Runner(
            "WITH 1 AS x RETURN 42 AS answer", options=RunnerOptions(provenance=True)
        )
        await runner.run()
        trace = runner.trace_row(0)
        assert trace["answer"].value == 42
        assert trace["answer"].lineage is not None
        assert trace["answer"].lineage.references == []
        assert trace["answer"].lineage.kind == "literal"
        assert trace["answer"].bindings == []

    @pytest.mark.asyncio
    async def test_empty_bindings_when_provenance_disabled(self):
        await Runner("""
            CREATE VIRTUAL (:TraceRowNoProv) AS {
                UNWIND [{id: 1, name: 'a'}] AS r RETURN r.id AS id, r.name AS name
            }
        """).run()
        try:
            runner = Runner("MATCH (c:TraceRowNoProv) RETURN c.name AS n")
            await runner.run()
            trace = runner.trace_row(0)
            assert trace["n"].value == "a"
            assert trace["n"].lineage is not None
            assert trace["n"].lineage.kind == "property"
            assert trace["n"].lineage.references[0].alias == "c"
            assert trace["n"].bindings == []
        finally:
            await Runner("DELETE VIRTUAL (:TraceRowNoProv)").run()

    @pytest.mark.asyncio
    async def test_relationship_bindings_with_matching_hop_value(self):
        await Runner("""
            CREATE VIRTUAL (:TraceRowRelCity) AS {
                UNWIND [{id: 'nyc'}, {id: 'lax'}] AS c RETURN c.id AS id
            }
        """).run()
        await Runner("""
            CREATE VIRTUAL (:TraceRowRelCity)-[:TRACE_ROW_FLIGHT]-(:TraceRowRelCity) AS {
                UNWIND [{left_id: 'nyc', right_id: 'lax', airline: 'AA'}] AS f
                RETURN f.left_id AS left_id, f.right_id AS right_id, f.airline AS airline
            }
        """).run()
        try:
            runner = Runner(
                """
                MATCH (a:TraceRowRelCity)-[r:TRACE_ROW_FLIGHT]->(b:TraceRowRelCity)
                RETURN r.airline AS airline
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()

            trace = runner.trace_row(0)
            assert trace["airline"].value == "AA"
            assert len(trace["airline"].bindings) == 1
            bound = trace["airline"].bindings[0]
            assert bound.reference.kind == "relationship"
            assert bound.reference.property == "airline"
            assert bound.relationship is not None
            assert bound.node is None
            assert bound.value == "AA"
            assert bound.relationship.hops[0].properties is not None
            assert bound.relationship.hops[0].properties["airline"] == "AA"
        finally:
            await Runner(
                "DELETE VIRTUAL (:TraceRowRelCity)-[:TRACE_ROW_FLIGHT]-(:TraceRowRelCity)"
            ).run()
            await Runner("DELETE VIRTUAL (:TraceRowRelCity)").run()

    @pytest.mark.asyncio
    async def test_raises_index_error_when_out_of_bounds(self):
        runner = Runner(
            "WITH 1 AS x RETURN x AS y", options=RunnerOptions(provenance=True)
        )
        await runner.run()
        with pytest.raises(IndexError):
            runner.trace_row(-1)
        with pytest.raises(IndexError):
            runner.trace_row(1)


class TestLineageReport:
    """:meth:`Runner.lineage` returns a combined report."""

    @pytest.mark.asyncio
    async def test_returns_columns_and_aligned_rows(self):
        await Runner("""
            CREATE VIRTUAL (:LineageReportCity) AS {
                UNWIND [
                    {id: 'a', name: 'Alpha', country: 'US'},
                    {id: 'b', name: 'Bravo', country: 'UK'}
                ] AS r
                RETURN r.id AS id, r.name AS name, r.country AS country
            }
        """).run()
        try:
            runner = Runner(
                """
                MATCH (c:LineageReportCity)
                RETURN c.name AS name, c.country AS country
                """,
                options=RunnerOptions(provenance=True),
            )
            await runner.run()

            report = runner.lineage()
            assert sorted(report.columns.keys()) == ["country", "name"]
            assert report.columns["name"].kind == "property"
            assert report.columns["country"].kind == "property"

            assert len(report.rows) == 2
            for i in range(len(report.rows)):
                assert sorted(report.rows[i].keys()) == ["country", "name"]
                assert report.rows[i]["name"].value == runner.results[i]["name"]
                assert (
                    report.rows[i]["country"].value == runner.results[i]["country"]
                )
                assert (
                    report.rows[i]["name"].bindings[0].node.id
                    == report.rows[i]["country"].bindings[0].node.id
                )
        finally:
            await Runner("DELETE VIRTUAL (:LineageReportCity)").run()

    @pytest.mark.asyncio
    async def test_columns_and_traces_are_deep_copies(self):
        from flowquery.parsing.statement_info_crawler import ColumnReference

        await Runner("""
            CREATE VIRTUAL (:LineageCopyCity) AS {
                UNWIND [{id: 'x', name: 'X'}] AS r RETURN r.id AS id, r.name AS name
            }
        """).run()
        try:
            runner = Runner(
                "MATCH (c:LineageCopyCity) RETURN c.name AS name",
                options=RunnerOptions(provenance=True),
            )
            await runner.run()

            first = runner.lineage()
            first.columns["name"].references.append(
                ColumnReference(
                    alias="MUT", kind="node", labels=["MUT"], property="MUT"
                )
            )
            first.columns["injected"] = ColumnLineage(references=[], kind="literal")
            first.rows[0]["name"].lineage.references.append(
                ColumnReference(
                    alias="MUT2", kind="node", labels=["MUT2"], property="MUT2"
                )
            )

            second = runner.lineage()
            assert len(second.columns["name"].references) == 1
            assert second.columns["name"].references[0].alias == "c"
            assert second.columns["name"].references[0].labels == [
                "LineageCopyCity"
            ]
            assert second.columns["name"].references[0].property == "name"
            assert "injected" not in second.columns
            assert len(second.rows[0]["name"].lineage.references) == 1
        finally:
            await Runner("DELETE VIRTUAL (:LineageCopyCity)").run()

    @pytest.mark.asyncio
    async def test_returns_empty_rows_when_no_results(self):
        await Runner("""
            CREATE VIRTUAL (:LineageEmpty) AS {
                UNWIND [] AS r RETURN r.id AS id
            }
        """).run()
        try:
            runner = Runner(
                "MATCH (c:LineageEmpty) RETURN c.id AS id",
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            report = runner.lineage()
            assert report.rows == []
            assert report.columns["id"].kind == "property"
        finally:
            await Runner("DELETE VIRTUAL (:LineageEmpty)").run()


class TestLetChainSources:
    """``info.sources`` and provenance ``data_sources`` chase ``LET``
    bindings to their underlying ``LOAD`` sources.
    """

    @pytest.mark.asyncio
    async def test_info_sources_chases_let_bindings(self):
        tmp_dir = tempfile.mkdtemp(prefix="flowquery-letchain-")
        file_path = Path(tmp_dir) / "cities.json"
        file_path.write_text(
            '[{"id": "nyc", "name": "New York"}, '
            '{"id": "lhr", "name": "London"}]'
        )
        file_uri = "file://" + str(file_path).replace("\\", "/")
        try:
            runner = Runner(f"""
                LET letChainCities = {{ LOAD JSON FROM "{file_uri}" AS c RETURN c.id AS id, c.name AS name }};
                CREATE VIRTUAL (:LetChainCity) AS {{
                    LOAD JSON FROM letChainCities AS c RETURN c.id AS id, c.name AS name
                }};
                MATCH (c:LetChainCity) RETURN c.name AS name ORDER BY name
            """)
            await runner.run()

            info = runner.metadata.info
            assert info is not None
            assert "LetChainCity" in info.nodes
            sources = info.nodes["LetChainCity"].sources
            assert "let://letChainCities" in sources
            assert file_uri in sources
            assert "let://letChainCities" in info.sources
            assert file_uri in info.sources
        finally:
            await Runner(
                "DELETE VIRTUAL (:LetChainCity); DROP BINDING letChainCities"
            ).run()
            try:
                file_path.unlink()
                os.rmdir(tmp_dir)
            except OSError:
                pass

    @pytest.mark.asyncio
    async def test_provenance_chains_data_sources_through_let(self):
        tmp_dir = tempfile.mkdtemp(prefix="flowquery-letprov-")
        file_path = Path(tmp_dir) / "cities.json"
        file_path.write_text(
            '[{"id": "nyc", "name": "New York"}, '
            '{"id": "lhr", "name": "London"}]'
        )
        file_uri = "file://" + str(file_path).replace("\\", "/")
        try:
            await Runner(
                f'LET letProvCities = {{ LOAD JSON FROM "{file_uri}" '
                "AS c RETURN c.id AS id, c.name AS name }"
            ).run()
            await Runner("""
                CREATE VIRTUAL (:LetProvCity) AS {
                    LOAD JSON FROM letProvCities AS c RETURN c.id AS id, c.name AS name
                }
            """).run()

            runner = Runner(
                "MATCH (c:LetProvCity) WHERE c.id = 'nyc' RETURN c.name AS name",
                options=RunnerOptions(provenance=True),
            )
            await runner.run()
            assert runner.results == [{"name": "New York"}]

            prov = runner.provenance[0]
            assert len(prov.nodes) == 1
            virtual_source = prov.nodes[0].source
            assert virtual_source is not None
            assert virtual_source.data_sources is not None
            let_ds = next(
                (
                    d
                    for d in virtual_source.data_sources
                    if d.source == "let://letProvCities"
                ),
                None,
            )
            assert let_ds is not None
            assert let_ds.source_provenance is not None
            assert let_ds.source_provenance.data_sources is not None
            file_ds = next(
                (
                    d
                    for d in let_ds.source_provenance.data_sources
                    if d.source == file_uri
                ),
                None,
            )
            assert file_ds is not None
        finally:
            await Runner(
                "DELETE VIRTUAL (:LetProvCity); DROP BINDING letProvCities"
            ).run()
            try:
                file_path.unlink()
                os.rmdir(tmp_dir)
            except OSError:
                pass
