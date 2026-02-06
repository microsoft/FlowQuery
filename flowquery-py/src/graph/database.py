"""Graph database for FlowQuery."""

from __future__ import annotations

from typing import Any, Dict, Optional, Union

from ..parsing.ast_node import ASTNode
from .node import Node
from .node_data import NodeData
from .physical_node import PhysicalNode
from .physical_relationship import PhysicalRelationship
from .relationship import Relationship
from .relationship_data import RelationshipData


class Database:
    """Singleton database for storing graph data."""

    _instance: Optional['Database'] = None
    _nodes: Dict[str, 'PhysicalNode'] = {}
    _relationships: Dict[str, 'PhysicalRelationship'] = {}

    def __init__(self) -> None:
        pass

    @classmethod
    def get_instance(cls) -> 'Database':
        if cls._instance is None:
            cls._instance = Database()
        return cls._instance

    def add_node(self, node: 'Node', statement: ASTNode) -> None:
        """Adds a node to the database."""
        if node.label is None:
            raise ValueError("Node label is null")
        physical = PhysicalNode(None, node.label)
        physical.statement = statement
        Database._nodes[node.label] = physical

    def get_node(self, node: 'Node') -> Optional['PhysicalNode']:
        """Gets a node from the database."""
        return Database._nodes.get(node.label) if node.label else None

    def add_relationship(self, relationship: 'Relationship', statement: ASTNode) -> None:
        """Adds a relationship to the database."""
        if relationship.type is None:
            raise ValueError("Relationship type is null")
        physical = PhysicalRelationship()
        physical.type = relationship.type
        physical.statement = statement
        Database._relationships[relationship.type] = physical

    def get_relationship(self, relationship: 'Relationship') -> Optional['PhysicalRelationship']:
        """Gets a relationship from the database."""
        return Database._relationships.get(relationship.type) if relationship.type else None

    async def schema(self) -> list[dict[str, Any]]:
        """Returns the graph schema with node/relationship labels and sample data."""
        result: list[dict[str, Any]] = []

        for label, physical_node in Database._nodes.items():
            records = await physical_node.data()
            entry: dict[str, Any] = {"kind": "node", "label": label}
            if records:
                sample = {k: v for k, v in records[0].items() if k != "id"}
                if sample:
                    entry["sample"] = sample
            result.append(entry)

        for rel_type, physical_rel in Database._relationships.items():
            records = await physical_rel.data()
            entry_rel: dict[str, Any] = {"kind": "relationship", "type": rel_type}
            if records:
                sample = {k: v for k, v in records[0].items() if k not in ("left_id", "right_id")}
                if sample:
                    entry_rel["sample"] = sample
            result.append(entry_rel)

        return result

    async def get_data(self, element: Union['Node', 'Relationship']) -> Union['NodeData', 'RelationshipData']:
        """Gets data for a node or relationship."""
        if isinstance(element, Node):
            node = self.get_node(element)
            if node is None:
                raise ValueError(f"Physical node not found for label {element.label}")
            data = await node.data()
            return NodeData(data)
        elif isinstance(element, Relationship):
            relationship = self.get_relationship(element)
            if relationship is None:
                raise ValueError(f"Physical relationship not found for type {element.type}")
            data = await relationship.data()
            return RelationshipData(data)
        else:
            raise ValueError("Element is neither Node nor Relationship")
