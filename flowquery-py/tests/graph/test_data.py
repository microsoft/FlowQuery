"""Tests for graph data iteration."""

import pytest
from flowquery.graph.data import Data
from flowquery.graph.node_data import NodeData
from flowquery.graph.relationship_data import RelationshipData


class TestDataIteration:
    """Test cases for Data class iteration."""

    def test_data_iteration(self):
        """Test data iteration."""
        records = [
            {"id": "1", "name": "Alice"},
            {"id": "2", "name": "Bob"},
            {"id": "3", "name": "Charlie"},
        ]
        data = Data(records)
        assert data.next() is True
        assert data.next() is True
        assert data.next() is True
        assert data.next() is False


class TestNodeDataFind:
    """Test cases for NodeData find operations."""

    def test_data_find(self):
        """Test data find."""
        records = [
            {"id": "1", "name": "Alice"},
            {"id": "2", "name": "Bob"},
            {"id": "3", "name": "Charlie"},
            {"id": "2", "name": "Bob Duplicate"},
        ]
        data = NodeData(records)
        data.find("2")
        assert data.current() == {"id": "2", "name": "Bob"}
        assert data.find("2") is True
        assert data.current() == {"id": "2", "name": "Bob Duplicate"}
        assert data.find("2") is False

    def test_data_find_non_existing(self):
        """Test data find non-existing."""
        records = [
            {"id": "1", "name": "Alice"},
            {"id": "2", "name": "Bob"},
        ]
        data = NodeData(records)
        assert data.find("3") is False


class TestRelationshipDataFind:
    """Test cases for RelationshipData find operations."""

    def test_relationship_data_find(self):
        """Test RelationshipData find."""
        records = [
            {"left_id": "1", "right_id": "2", "type": "FRIEND", "id": "r1"},
            {"left_id": "2", "right_id": "3", "type": "COLLEAGUE", "id": "r2"},
            {"left_id": "1", "right_id": "3", "type": "FRIEND", "id": "r3"},
        ]
        data = RelationshipData(records)
        data.find("1")
        assert data.current() == {"left_id": "1", "right_id": "2", "type": "FRIEND", "id": "r1"}
        assert data.find("1") is True
        assert data.current() == {"left_id": "1", "right_id": "3", "type": "FRIEND", "id": "r3"}
        assert data.find("1") is False
        assert data.find("2") is True
        assert data.current() == {"left_id": "2", "right_id": "3", "type": "COLLEAGUE", "id": "r2"}
        assert data.find("2") is False
        assert data.find("4") is False
