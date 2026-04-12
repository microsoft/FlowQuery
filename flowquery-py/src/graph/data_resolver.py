"""Resolves pattern elements to data from the Database registry."""

from __future__ import annotations

from typing import Any, AsyncIterator, Dict, List, Optional, Union

from .data_cache import DataCache
from .database import Database
from .node import Node
from .node_data import NodeData
from .node_reference import NodeReference
from .physical_relationship import PhysicalRelationship
from .relationship import Relationship
from .relationship_data import RelationshipData


class DataResolver:
    """Resolves pattern elements (nodes and relationships) to data by querying
    the Database registry. Handles label compatibility, caching, and schema
    introspection — keeping query-resolution concerns separate from storage."""

    _instance: Optional['DataResolver'] = None

    def __init__(self) -> None:
        self._data_cache: DataCache = DataCache()

    @classmethod
    def get_instance(cls) -> 'DataResolver':
        if cls._instance is None:
            cls._instance = DataResolver()
        return cls._instance

    @property
    def data_cache(self) -> DataCache:
        return self._data_cache

    @data_cache.setter
    def data_cache(self, cache: DataCache) -> None:
        """Sets the data cache for the current query execution.
        Each top-level Runner creates its own DataCache instance."""
        self._data_cache = cache

    async def schema(self) -> List[Dict[str, Any]]:
        """Returns the graph schema with node/relationship labels and sample data."""
        return [item async for item in self._schema()]

    async def _schema(self) -> AsyncIterator[Dict[str, Any]]:
        """Async generator for graph schema."""
        db = Database.get_instance()
        for label, physical_node in db.nodes.items():
            records = await physical_node.data()
            entry: Dict[str, Any] = {"kind": "Node", "label": label}
            if records:
                sample = {k: v for k, v in records[0].items() if k != "id"}
                properties = list(sample.keys())
                if properties:
                    entry["properties"] = properties
                    entry["sample"] = sample
            yield entry

        for rel_type, type_map in db.relationships.items():
            for physical_rel in type_map.values():
                records = await physical_rel.data()
                entry_rel: Dict[str, Any] = {
                    "kind": "Relationship",
                    "type": rel_type,
                    "from_label": physical_rel.source.label if physical_rel.source else None,
                    "to_label": physical_rel.target.label if physical_rel.target else None,
                }
                if records:
                    sample = {
                        k: v for k, v in records[0].items()
                        if k not in ("left_id", "right_id")
                    }
                    properties = list(sample.keys())
                    if properties:
                        entry_rel["properties"] = properties
                        entry_rel["sample"] = sample
                yield entry_rel

    async def get_data(
        self, element: Union['Node', 'Relationship']
    ) -> Union['NodeData', 'RelationshipData']:
        """Gets data for a node or relationship."""
        db = Database.get_instance()
        if isinstance(element, Node):
            args = DataResolver._extract_args(element.properties)
            if len(element.labels) == 0:
                all_records = []
                for label, physical in db.nodes.items():
                    data = await self._data_cache.get(f"node:{label}", physical, None)
                    for record in data:
                        all_records.append({**record, "_label": label})
                return NodeData(all_records)
            if len(element.labels) > 1:
                all_records = []
                for lbl in element.labels:
                    phys_node = db.nodes.get(lbl)
                    if phys_node:
                        data = await self._data_cache.get(f"node:{lbl}", phys_node, args)
                        for record in data:
                            all_records.append({**record, "_label": lbl})
                return NodeData(all_records)
            node = db.get_node(element)
            if node is None:
                raise ValueError(f"Physical node not found for label {element.label}")
            data = await self._data_cache.get(f"node:{element.label}", node, args)
            label = element.label or ""
            records = [{**record, "_label": label} for record in data]
            return NodeData(records)
        elif isinstance(element, Relationship):
            args = DataResolver._extract_args(element.properties)
            entries = self._get_relationship_entries(element, db)
            if not entries:
                if len(element.types) == 0:
                    return RelationshipData([])
                suffix = "s" if len(element.types) > 1 else ""
                types = ", ".join(element.types)
                raise ValueError(
                    f"No physical relationships found for type{suffix} {types}"
                )
            all_records = []
            for type_name, phys_rel in entries:
                src = phys_rel.source.label if phys_rel.source else None
                tgt = phys_rel.target.label if phys_rel.target else None
                cache_key = f"rel:{src or ''}:{type_name}:{tgt or ''}"
                records = await self._data_cache.get(cache_key, phys_rel, args)
                for record in records:
                    all_records.append({**record, "_type": type_name})
            return RelationshipData(all_records)
        else:
            raise ValueError("Element is neither Node nor Relationship")

    @staticmethod
    def _resolve_labels(node: Optional['Node']) -> List[str]:
        """Resolve labels, following NodeReference if the node itself has none."""
        if node is None:
            return []
        if node.labels:
            return node.labels
        if isinstance(node, NodeReference):
            ref = node.reference
            if isinstance(ref, Node):
                return list(ref.labels)
        return []

    @staticmethod
    def _is_relationship_compatible(
        relationship: 'Relationship', physical: 'PhysicalRelationship'
    ) -> bool:
        """Check if a MATCH pattern's endpoint labels are compatible."""
        def match(pattern: List[str], label: Optional[str]) -> bool:
            return len(pattern) == 0 or (label is not None and label in pattern)

        src_labels = DataResolver._resolve_labels(relationship.source)
        tgt_labels = DataResolver._resolve_labels(relationship.target)
        phys_src = physical.source.label if physical.source else None
        phys_tgt = physical.target.label if physical.target else None
        if relationship.direction == "left":
            return match(src_labels, phys_tgt) and match(tgt_labels, phys_src)
        return match(src_labels, phys_src) and match(tgt_labels, phys_tgt)

    def _get_relationship_entries(
        self,
        relationship: 'Relationship',
        db: Database,
    ) -> list[tuple[str, 'PhysicalRelationship']]:
        """Collect physical relationships matching the pattern's types and endpoint labels."""
        types = relationship.types or list(db.relationships.keys())
        return [
            (t, p)
            for t in types if t in db.relationships
            for p in db.relationships[t].values()
            if DataResolver._is_relationship_compatible(relationship, p)
        ]

    @staticmethod
    def _extract_args(
        properties: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """Extracts property constraint values to pass as $args to the inner query."""
        if not properties:
            return None
        return {key: expression.value() for key, expression in properties.items()}
