"""Resolves pattern elements to data from the Database registry."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, AsyncGenerator, Dict, List, Optional, Tuple, Union

from .data_cache import DataCache
from .database import Database
from .node import Node
from .node_data import NodeData
from .node_reference import NodeReference
from .physical_relationship import PhysicalRelationship
from .relationship import Relationship
from .relationship_data import RelationshipData
from .source_access import NodeSourceAccess, RelationshipSourceAccess
from .source_context import SourceContext
from .statement_source import materialize_scan
from .virtual_sources import attach_virtual_source, get_virtual_source

if TYPE_CHECKING:
    from .default_graph import DefaultGraph


class DataResolver:
    """Resolves pattern elements (nodes and relationships) to data by querying
    the Database registry. Handles label compatibility, caching, and schema
    introspection — keeping query-resolution concerns separate from storage."""

    _instance: Optional['DataResolver'] = None

    def __init__(self) -> None:
        self._data_cache: DataCache = DataCache()
        self._source_context: Optional[SourceContext] = None

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

    @property
    def source_context(self) -> Optional[SourceContext]:
        """Source context of the most recently started top-level query."""
        return self._source_context

    @source_context.setter
    def source_context(self, ctx: Optional[SourceContext]) -> None:
        self._source_context = ctx

    @staticmethod
    def _deferrable(physical: Any, ctx: SourceContext) -> bool:
        return getattr(physical, "provider", None) is not None and not (
            ctx.provenance and physical.statement is not None
        )

    @staticmethod
    def _node_candidates(
        element: Node, db: Database, graph: Optional['DefaultGraph']
    ) -> Tuple[List[Tuple[str, Any]], List[Dict[str, Any]]]:
        """Node definitions (and default-graph entries) an element reads from.
        Labels with a ``CREATE VIRTUAL`` definition are always served by it;
        other labels, and unlabelled patterns, fall back to the default
        graph pinned by the query, if any."""
        physical: List[Tuple[str, Any]] = []
        graph_entries: List[Dict[str, Any]] = []
        if element.all_labels:
            if graph is None or any(label in db.nodes for label in element.labels):
                raise ValueError(
                    f"Node pattern (:{':'.join(element.labels)}) requires every label: "
                    "this is only supported for labels without a CREATE VIRTUAL "
                    "definition, read through the default graph (USE GRAPH)"
                )
            graph_entries.append({"label": element.labels[0], "labels": list(element.labels)})
            return physical, graph_entries
        if len(element.labels) == 0:
            physical.extend(db.nodes.items())
            if graph is not None:
                graph_entries.append({"label": None, "labels": None})
            return physical, graph_entries
        for label in element.labels:
            p = db.nodes.get(label)
            if p is not None:
                physical.append((label, p))
            elif graph is not None:
                graph_entries.append({"label": label, "labels": None})
        return physical, graph_entries

    @staticmethod
    def _label_hint(node: Optional[Node]) -> Optional[str]:
        """Endpoint label hint of a pattern node (sent to the default graph)."""
        labels = DataResolver._resolve_labels(node)
        if len(labels) == 1:
            return labels[0]
        if node is not None and node.all_labels:
            return labels[0]
        if (
            isinstance(node, NodeReference)
            and isinstance(node.reference, Node)
            and node.reference.all_labels
        ):
            return labels[0]
        return None

    @staticmethod
    def _relationship_graph_entries(
        relationship: Relationship, db: Database, graph: Optional['DefaultGraph']
    ) -> List[Dict[str, Any]]:
        """Default-graph entries for a relationship pattern (types without definitions)."""
        if graph is None:
            return []
        if relationship.direction == "left":
            left, right = relationship.target, relationship.source
        else:
            left, right = relationship.source, relationship.target
        source_label = DataResolver._label_hint(left)
        target_label = DataResolver._label_hint(right)
        if len(relationship.types) == 0:
            return [{"type": None, "sourceLabel": source_label, "targetLabel": target_label}]
        return [
            {"type": t, "sourceLabel": source_label, "targetLabel": target_label}
            for t in relationship.types
            if t not in db.relationships
        ]

    def get_access(
        self, element: Union[Node, Relationship], ctx: SourceContext
    ) -> Optional[Union[NodeSourceAccess, RelationshipSourceAccess]]:
        """Returns provider-backed access for an element when every physical
        definition it can match is backed by a source provider; otherwise
        None, and the element is loaded eagerly through get_data."""
        db = Database.get_instance()
        graph = ctx.graph
        if isinstance(element, Node):
            physical, graph_entries = DataResolver._node_candidates(element, db, graph)
            if len(physical) + len(graph_entries) == 0 or not all(
                DataResolver._deferrable(p, ctx) for _, p in physical
            ):
                return None
            assert graph is not None or len(graph_entries) == 0
            return NodeSourceAccess(
                ctx,
                [{"label": label, "provider": p.provider} for label, p in physical]
                + [
                    {
                        "label": g["label"],
                        "labels": g["labels"],
                        "provider": graph.node_provider if graph is not None else None,
                        "graph": True,
                    }
                    for g in graph_entries
                ],
            )
        entries = self._get_relationship_entries(element, db)
        rel_graph_entries = DataResolver._relationship_graph_entries(element, db, graph)
        if len(entries) + len(rel_graph_entries) == 0 or not all(
            DataResolver._deferrable(p, ctx) for _, p in entries
        ):
            return None
        return RelationshipSourceAccess(
            ctx,
            [
                {
                    "type": t,
                    "sourceLabel": p.source.label if p.source is not None else None,
                    "targetLabel": p.target.label if p.target is not None else None,
                    "provider": p.provider,
                }
                for t, p in entries
            ]
            + [
                {
                    **g,
                    "provider": graph.relationship_provider if graph is not None else None,
                    "graph": True,
                }
                for g in rel_graph_entries
            ],
        )

    async def schema(self) -> List[Dict[str, Any]]:
        """Returns the graph schema with node/relationship labels and sample data."""
        return [item async for item in self._schema()]

    async def _schema(self) -> AsyncGenerator[Dict[str, Any], None]:
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
        ctx = self._source_context
        graph = ctx.graph if ctx is not None else None
        if isinstance(element, Node):
            args = DataResolver._extract_args(element.properties)
            physical, graph_entries = DataResolver._node_candidates(element, db, graph)
            if len(element.labels) == 1 and len(physical) == 0 and len(graph_entries) == 0:
                raise ValueError(f"Physical node not found for label {element.label}")
            # Unlabelled and ORed labels collect from every matching definition.
            all_records: List[Dict[str, Any]] = []
            for label, phys_node in physical:
                data = await self._data_cache.get(
                    f"node:{label}", phys_node, None if len(element.labels) == 0 else args
                )
                for record in data:
                    enriched = {**record, "_label": label}
                    src = get_virtual_source(record)
                    if src is not None:
                        attach_virtual_source(enriched, src)
                    all_records.append(enriched)
            for entry in graph_entries:
                assert graph is not None
                base = (
                    {"label": entry["label"], "labels": entry["labels"]}
                    if entry["labels"] is not None
                    else {"label": entry["label"]}
                )
                rows = await materialize_scan(
                    graph.node_provider, "node", graph.description, base, None, ctx
                )
                for row in rows:
                    all_records.append(
                        {**row, "_label": entry["label"]} if entry["label"] is not None else row
                    )
            return NodeData(all_records)
        elif isinstance(element, Relationship):
            args = DataResolver._extract_args(element.properties)
            entries = self._get_relationship_entries(element, db)
            rel_graph_entries = DataResolver._relationship_graph_entries(element, db, graph)
            if not entries and not rel_graph_entries:
                if len(element.types) == 0 or graph is not None:
                    return RelationshipData([])
                suffix = "s" if len(element.types) > 1 else ""
                types = ", ".join(element.types)
                raise ValueError(
                    f"No physical relationships found for type{suffix} {types}"
                )
            all_records = []
            for type_name, phys_rel in entries:
                rel_src = phys_rel.source.label if phys_rel.source else None
                rel_tgt = phys_rel.target.label if phys_rel.target else None
                cache_key = f"rel:{rel_src or ''}:{type_name}:{rel_tgt or ''}"
                rel_records = await self._data_cache.get(cache_key, phys_rel, args)
                for record in rel_records:
                    enriched = {**record, "_type": type_name}
                    rec_src = get_virtual_source(record)
                    if rec_src is not None:
                        attach_virtual_source(enriched, rec_src)
                    all_records.append(enriched)
            for rel_entry in rel_graph_entries:
                assert graph is not None
                all_records.extend(
                    await materialize_scan(
                        graph.relationship_provider,
                        "relationship",
                        graph.description,
                        rel_entry,
                        None,
                        ctx,
                    )
                )
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
