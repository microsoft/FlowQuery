"""Graph database for FlowQuery."""

from __future__ import annotations

from typing import Any, AsyncIterator, Dict, List, Optional, Union

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
        if relationship.source is not None:
            physical.source = relationship.source
        if relationship.target is not None:
            physical.target = relationship.target
        Database._relationships[relationship.type] = physical

    def get_relationship(self, relationship: 'Relationship') -> Optional['PhysicalRelationship']:
        """Gets a relationship from the database."""
        return Database._relationships.get(relationship.type) if relationship.type else None

    def get_relationships(self, relationship: 'Relationship') -> list['PhysicalRelationship']:
        """Gets multiple physical relationships for ORed types."""
        result = []
        for rel_type in relationship.types:
            physical = Database._relationships.get(rel_type)
            if physical:
                result.append(physical)
        return result

    async def schema(self) -> List[Dict[str, Any]]:
        """Returns the graph schema with node/relationship labels and sample data."""
        return [item async for item in self._schema()]

    async def _schema(self) -> AsyncIterator[Dict[str, Any]]:
        """Async generator for graph schema with node/relationship labels and sample data."""
        for label, physical_node in Database._nodes.items():
            records = await physical_node.data()
            entry: Dict[str, Any] = {"kind": "Node", "label": label}
            if records:
                sample = {k: v for k, v in records[0].items() if k != "id"}
                properties = list(sample.keys())
                if properties:
                    entry["properties"] = properties
                    entry["sample"] = sample
            yield entry

        for rel_type, physical_rel in Database._relationships.items():
            records = await physical_rel.data()
            entry_rel: Dict[str, Any] = {
                "kind": "Relationship",
                "type": rel_type,
                "from_label": physical_rel.source.label if physical_rel.source else None,
                "to_label": physical_rel.target.label if physical_rel.target else None,
            }
            if records:
                sample = {k: v for k, v in records[0].items() if k not in ("left_id", "right_id")}
                properties = list(sample.keys())
                if properties:
                    entry_rel["properties"] = properties
                    entry_rel["sample"] = sample
            yield entry_rel

    async def get_data(self, element: Union['Node', 'Relationship']) -> Union['NodeData', 'RelationshipData']:
        """Gets data for a node or relationship."""
        if isinstance(element, Node):
            node = self.get_node(element)
            if node is None:
                raise ValueError(f"Physical node not found for label {element.label}")
            data = await node.data()
            return NodeData(data)
        elif isinstance(element, Relationship):
            if len(element.types) > 1:
                physicals = self.get_relationships(element)
                if not physicals:
                    raise ValueError(f"No physical relationships found for types {', '.join(element.types)}")
                all_records = []
                for i, physical in enumerate(physicals):
                    records = await physical.data()
                    type_name = element.types[i]
                    for record in records:
                        all_records.append({**record, "_type": type_name})
                return RelationshipData(all_records)
            relationship = self.get_relationship(element)
            if relationship is None:
                raise ValueError(f"Physical relationship not found for type {element.type}")
            data = await relationship.data()
            return RelationshipData(data)
        else:
            raise ValueError("Element is neither Node nor Relationship")
