"""Tests for graph pattern matching."""

import pytest
from unittest.mock import AsyncMock, patch
from flowquery.compute.runner import Runner
from flowquery.graph.database import Database
from flowquery.graph.physical_node import PhysicalNode
from flowquery.parsing.operations.create_node import CreateNode
from flowquery.parsing.parser import Parser


class TestMatch:
    """Test cases for Match operation."""

    @pytest.mark.asyncio
    async def test_create_node_and_match_operations(self):
        """Test CreateNode and match operations."""
        node = PhysicalNode(None, "Person")
        assert node.label == "Person"
        assert node.statement is None
        
        parser = Parser()
        statement = parser.parse("""
            unwind [
                {id: 1, name: 'Person 1'},
                {id: 2, name: 'Person 2'}
            ] as record
            RETURN record.id as id, record.name as name
        """)
        op = CreateNode(node, statement)
        await op.run()
        
        runner = Runner("match (n:Person) RETURN n")
        await runner.run()
        
        assert len(runner.results) == 2
        assert runner.results[0]["n"] is not None
        assert runner.results[0]["n"]["id"] == 1
        assert runner.results[0]["n"]["name"] == "Person 1"
        assert runner.results[1]["n"] is not None
        assert runner.results[1]["n"]["id"] == 2
        assert runner.results[1]["n"]["name"] == "Person 2"

    @pytest.mark.asyncio
    async def test_unlabeled_node_match_returns_all_nodes(self):
        """Test that MATCH (n) returns all nodes from all labels."""
        await Runner("""
            CREATE VIRTUAL (:Veggie) AS {
                UNWIND [
                    {id: 1, name: 'Carrot'},
                    {id: 2, name: 'Potato'}
                ] AS record
                RETURN record.id AS id, record.name AS name
            }
        """).run()
        await Runner("""
            CREATE VIRTUAL (:Spice) AS {
                UNWIND [
                    {id: 3, name: 'Pepper'},
                    {id: 4, name: 'Salt'}
                ] AS record
                RETURN record.id AS id, record.name AS name
            }
        """).run()
        runner = Runner("MATCH (n) RETURN n")
        await runner.run()
        results = runner.results
        # Should return nodes from all labels (at least Veggie + Spice)
        assert len(results) >= 4
        names = [r["n"]["name"] for r in results if "name" in r["n"]]
        assert "Carrot" in names
        assert "Potato" in names
        assert "Pepper" in names
        assert "Salt" in names

    @pytest.mark.asyncio
    async def test_unlabeled_node_match_with_property_filter(self):
        """Test that MATCH (n {name: 'Carrot'}) filters across all labels."""
        runner = Runner("MATCH (n {name: 'Carrot'}) RETURN n.name AS name")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0]["name"] == "Carrot"

    @pytest.mark.asyncio
    async def test_match_with_ored_node_labels(self):
        """Test that MATCH (n:Label1|Label2) returns nodes from both labels."""
        await Runner("""
            CREATE VIRTUAL (:Mammal) AS {
                UNWIND [
                    {id: 1, name: 'Cat'},
                    {id: 2, name: 'Dog'}
                ] AS record
                RETURN record.id AS id, record.name AS name
            }
        """).run()
        await Runner("""
            CREATE VIRTUAL (:Bird) AS {
                UNWIND [
                    {id: 3, name: 'Eagle'},
                    {id: 4, name: 'Parrot'}
                ] AS record
                RETURN record.id AS id, record.name AS name
            }
        """).run()
        await Runner("""
            CREATE VIRTUAL (:Reptile) AS {
                UNWIND [
                    {id: 5, name: 'Snake'}
                ] AS record
                RETURN record.id AS id, record.name AS name
            }
        """).run()
        runner = Runner("MATCH (n:Mammal|Bird) RETURN n ORDER BY n.id")
        await runner.run()
        results = runner.results
        assert len(results) == 4
        names = [r["n"]["name"] for r in results]
        assert "Cat" in names
        assert "Dog" in names
        assert "Eagle" in names
        assert "Parrot" in names
        assert "Snake" not in names

    @pytest.mark.asyncio
    async def test_match_with_ored_node_labels_returns_correct_label(self):
        """Test that labels() returns the correct label for ORed label matches."""
        runner = Runner("MATCH (n:Mammal|Bird) RETURN n.name AS name, labels(n) AS lbls ORDER BY n.id")
        await runner.run()
        results = runner.results
        assert len(results) == 4
        assert results[0] == {"name": "Cat", "lbls": ["Mammal"]}
        assert results[2] == {"name": "Eagle", "lbls": ["Bird"]}

    @pytest.mark.asyncio
    async def test_match_with_ored_node_labels_optional_colon(self):
        """Test that MATCH (n:Mammal|:Bird) syntax also works."""
        runner = Runner("MATCH (n:Mammal|:Bird) RETURN n ORDER BY n.id")
        await runner.run()
        results = runner.results
        assert len(results) == 4

    @pytest.mark.asyncio
    async def test_data_cache_same_label_loaded_once(self):
        """Data for the same label should be fetched only once per query."""
        await Runner("""
            CREATE VIRTUAL (:CachePerson) AS {
                UNWIND [{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}] AS r
                RETURN r.id AS id, r.name AS name
            }
        """).run()
        await Runner("""
            CREATE VIRTUAL (:CachePerson)-[:CACHE_KNOWS]-(:CachePerson) AS {
                UNWIND [{left_id: 1, right_id: 2}] AS r
                RETURN r.left_id AS left_id, r.right_id AS right_id
            }
        """).run()

        db = Database.get_instance()
        physical_node = db.get_node(type("N", (), {"label": "CachePerson", "labels": ["CachePerson"]})())
        original_data = physical_node.data

        call_count = 0
        async def tracking_data(args=None):
            nonlocal call_count
            call_count += 1
            return await original_data(args)

        physical_node.data = tracking_data

        runner = Runner("MATCH (a:CachePerson)-[:CACHE_KNOWS]->(b:CachePerson) RETURN a.name, b.name")
        await runner.run()

        assert call_count == 1
        assert len(runner.results) > 0

        physical_node.data = original_data
        await Runner("DELETE VIRTUAL (:CachePerson)-[:CACHE_KNOWS]-(:CachePerson)").run()
        await Runner("DELETE VIRTUAL (:CachePerson)").run()

    @pytest.mark.asyncio
    async def test_data_cache_filter_passdown_bypasses_cache(self):
        """Filter pass-down queries (with args) should bypass the cache."""
        await Runner("""
            CREATE VIRTUAL (:CacheTodo) AS {
                UNWIND [{id: coalesce($id, 1), title: f'Todo {coalesce($id, 1)}'}] AS r
                RETURN r.id AS id, r.title AS title
            }
        """).run()

        db = Database.get_instance()
        physical_node = db.get_node(type("N", (), {"label": "CacheTodo", "labels": ["CacheTodo"]})())
        original_data = physical_node.data

        call_count = 0
        async def tracking_data(args=None):
            nonlocal call_count
            call_count += 1
            return await original_data(args)

        physical_node.data = tracking_data

        await Runner("MATCH (t:CacheTodo {id: 1}) RETURN t.title AS title").run()
        await Runner("MATCH (t:CacheTodo {id: 2}) RETURN t.title AS title").run()

        # Each query has args, so cache is bypassed — data() called once per run
        assert call_count == 2

        physical_node.data = original_data
        await Runner("DELETE VIRTUAL (:CacheTodo)").run()

    @pytest.mark.asyncio
    async def test_data_cache_cleared_between_runs(self):
        """Cache should be cleared between separate Runner.run() calls."""
        await Runner("""
            CREATE VIRTUAL (:CacheItem) AS {
                UNWIND [{id: 1, v: 'x'}] AS r RETURN r.id AS id, r.v AS v
            }
        """).run()

        db = Database.get_instance()
        physical_node = db.get_node(type("N", (), {"label": "CacheItem", "labels": ["CacheItem"]})())
        original_data = physical_node.data

        call_count = 0
        async def tracking_data(args=None):
            nonlocal call_count
            call_count += 1
            return await original_data(args)

        physical_node.data = tracking_data

        await Runner("MATCH (n:CacheItem) RETURN n").run()
        await Runner("MATCH (n:CacheItem) RETURN n").run()

        # Each Runner.run() clears the cache, so data() is called once per run
        assert call_count == 2

        physical_node.data = original_data
        await Runner("DELETE VIRTUAL (:CacheItem)").run()
