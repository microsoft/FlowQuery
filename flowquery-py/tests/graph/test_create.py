"""Tests for graph node and relationship creation."""

import pytest
from flowquery.graph.database import Database
from flowquery.graph.physical_node import PhysicalNode
from flowquery.graph.physical_relationship import PhysicalRelationship
from flowquery.parsing.operations.create_node import CreateNode
from flowquery.parsing.operations.create_relationship import CreateRelationship
from flowquery.parsing.parser import Parser


class TestCreateNode:
    """Test cases for CreateNode operation."""

    @pytest.mark.asyncio
    async def test_create_node_operation(self):
        """Test CreateNode operation."""
        node = PhysicalNode(None, "Person")
        assert node.label == "Person"
        assert node.statement is None
        
        parser = Parser()
        statement = parser.parse("WITH 1 as x RETURN x")
        op = CreateNode(node, statement)
        await op.run()
        
        db = Database.get_instance()
        found = db.get_node(node)
        assert found is not None
        assert found.label == node.label
        
        data = await found.data()
        assert data == [{"x": 1}]


class TestCreateRelationship:
    """Test cases for CreateRelationship operation."""

    @pytest.mark.asyncio
    async def test_create_relationship_operation(self):
        """Test CreateRelationship operation."""
        relationship = PhysicalRelationship()
        relationship.type = "KNOWS"
        assert relationship.type == "KNOWS"
        assert relationship.statement is None
        
        parser = Parser()
        statement = parser.parse("WITH 1 as x RETURN x")
        op = CreateRelationship(relationship, statement)
        await op.run()
        
        db = Database.get_instance()
        found = db.get_relationship(relationship)
        
        data = await found.data()
        assert data == [{"x": 1}]
