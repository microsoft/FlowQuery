"""Tests for graph pattern matching."""

import pytest
from flowquery.compute.runner import Runner
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
