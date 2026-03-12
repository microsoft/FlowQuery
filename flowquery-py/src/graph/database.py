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

    def remove_node(self, node: 'Node') -> None:
        """Removes a node from the database."""
        if node.label is None:
            raise ValueError("Node label is null")
        Database._nodes.pop(node.label, None)

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

    def remove_relationship(self, relationship: 'Relationship') -> None:
        """Removes a relationship from the database."""
        if relationship.type is None:
            raise ValueError("Relationship type is null")
        Database._relationships.pop(relationship.type, None)

    def get_relationship(self, relationship: 'Relationship') -> Optional['PhysicalRelationship']:
        """Gets a relationship from the database."""
        return Database._relationships.get(relationship.type) if relationship.type else None

    def _is_relationship_compatible(
        self, relationship: 'Relationship', physical: 'PhysicalRelationship'
    ) -> bool:
        """Checks if a physical relationship is compatible with the pattern's endpoint labels."""
        pattern_source_labels = relationship.source.labels if relationship.source else []
        pattern_target_labels = relationship.target.labels if relationship.target else []
        phys_source = physical.source.label if physical.source else None
        phys_target = physical.target.label if physical.target else None

        def matches_label(pattern_labels: List[str], phys_label: Optional[str]) -> bool:
            return len(pattern_labels) == 0 or (phys_label is not None and phys_label in pattern_labels)

        if relationship.direction == "left":
            return (
                matches_label(pattern_source_labels, phys_target)
                and matches_label(pattern_target_labels, phys_source)
            )
        return (
            matches_label(pattern_source_labels, phys_source)
            and matches_label(pattern_target_labels, phys_target)
        )

    def _get_relationship_entries(
        self, relationship: 'Relationship'
    ) -> list[tuple[str, 'PhysicalRelationship']]:
        """Gets (type_name, physical) pairs, filtered by endpoint label compatibility."""
        if len(relationship.types) == 0:
            return [
                (t, p)
                for t, p in Database._relationships.items()
                if self._is_relationship_compatible(relationship, p)
            ]
        result: list[tuple[str, 'PhysicalRelationship']] = []
        for rel_type in relationship.types:
            physical = Database._relationships.get(rel_type)
            if physical and self._is_relationship_compatible(relationship, physical):
                result.append((rel_type, physical))
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
            args = self._extract_args(element.properties)
            if len(element.labels) == 0:
                # Unlabeled node: match all physical nodes in the database
                all_records = []
                for label, physical in Database._nodes.items():
                    data = await physical.data()
                    for record in data:
                        all_records.append({**record, "_label": label})
                return NodeData(all_records)
            if len(element.labels) > 1:
                # ORed labels: collect from all matching physical nodes
                all_records = []
                for lbl in element.labels:
                    phys_node = Database._nodes.get(lbl)
                    if phys_node:
                        data = await phys_node.data(args)
                        for record in data:
                            all_records.append({**record, "_label": lbl})
                return NodeData(all_records)
            node = self.get_node(element)
            if node is None:
                raise ValueError(f"Physical node not found for label {element.label}")
            data = await node.data(args)
            label = element.label or ""
            records = [{**record, "_label": label} for record in data]
            return NodeData(records)
        elif isinstance(element, Relationship):
            args = self._extract_args(element.properties)
            if len(element.types) != 1:
                entries = self._get_relationship_entries(element)
                if not entries:
                    if len(element.types) == 0:
                        return RelationshipData([])
                    raise ValueError(f"No physical relationships found for types {', '.join(element.types)}")
                all_records = []
                for type_name, phys_rel in entries:
                    records = await phys_rel.data(args)
                    for record in records:
                        all_records.append({**record, "_type": type_name})
                return RelationshipData(all_records)
            relationship = self.get_relationship(element)
            if relationship is None:
                raise ValueError(f"Physical relationship not found for type {element.type}")
            data = await relationship.data(args)
            return RelationshipData(data)
        else:
            raise ValueError("Element is neither Node nor Relationship")

    def _extract_args(
        self, properties: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Extracts property constraint values to pass as $args to the inner query."""
        if not properties:
            return None
        args: Dict[str, Any] = {}
        for key, expression in properties.items():
            args[key] = expression.value()
        return args
