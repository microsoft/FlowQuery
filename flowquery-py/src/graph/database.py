"""Graph database registry for FlowQuery."""

from __future__ import annotations

from typing import Dict, Optional

from ..parsing.ast_node import ASTNode
from .node import Node
from .physical_node import PhysicalNode
from .physical_relationship import PhysicalRelationship
from .relationship import Relationship


class Database:
    """Singleton registry for virtual node and relationship definitions."""

    _instance: Optional['Database'] = None
    _nodes: Dict[str, 'PhysicalNode'] = {}
    _relationships: Dict[str, Dict[str, 'PhysicalRelationship']] = {}

    @classmethod
    def get_instance(cls) -> 'Database':
        if cls._instance is None:
            cls._instance = Database()
        return cls._instance

    @property
    def nodes(self) -> Dict[str, 'PhysicalNode']:
        """Read-only access to registered nodes."""
        return Database._nodes

    @property
    def relationships(self) -> Dict[str, Dict[str, 'PhysicalRelationship']]:
        """Read-only access to registered relationships (type -> endpoint_key -> physical)."""
        return Database._relationships

    def add_node(
        self,
        node: 'Node',
        statement: ASTNode,
        is_static: bool = False,
        refresh_every_ms: Optional[int] = None,
    ) -> None:
        """Adds a node to the database."""
        if node.label is None:
            raise ValueError("Node label is null")
        existing = Database._nodes.get(node.label)
        if existing is not None and (existing.is_static or is_static):
            raise ValueError(
                f"Virtual node (:{node.label}) already exists; "
                f"DROP VIRTUAL (:{node.label}) first"
            )
        physical = PhysicalNode(None, node.label)
        physical.statement = statement
        physical.is_static = is_static
        physical.refresh_every_ms = refresh_every_ms
        Database._nodes[node.label] = physical

    def remove_node(self, node: 'Node') -> None:
        """Removes a node from the database."""
        if node.label is None:
            raise ValueError("Node label is null")
        Database._nodes.pop(node.label, None)

    def refresh_node(self, node: 'Node') -> None:
        """Invalidates the cache of a STATIC virtual node."""
        if node.label is None:
            raise ValueError("Node label is null")
        physical = Database._nodes.get(node.label)
        if physical is None:
            raise ValueError(f"Virtual node (:{node.label}) does not exist")
        physical.invalidate_cache()

    def get_node(self, node: 'Node') -> Optional['PhysicalNode']:
        """Gets a node from the database."""
        return Database._nodes.get(node.label) if node.label else None

    @staticmethod
    def _endpoint_key(
        src: Optional[str], tgt: Optional[str]
    ) -> str:
        """Endpoint key: 'Source:Target'."""
        return f"{src or ''}:{tgt or ''}"

    def add_relationship(
        self,
        relationship: 'Relationship',
        statement: ASTNode,
        is_static: bool = False,
        refresh_every_ms: Optional[int] = None,
    ) -> None:
        """Adds a relationship to the database."""
        if relationship.type is None:
            raise ValueError("Relationship type is null")
        key = Database._endpoint_key(
            relationship.source.label if relationship.source else None,
            relationship.target.label if relationship.target else None,
        )
        type_map = Database._relationships.get(relationship.type)
        existing = type_map.get(key) if type_map is not None else None
        if existing is not None and (existing.is_static or is_static):
            src = relationship.source.label if relationship.source else ""
            tgt = relationship.target.label if relationship.target else ""
            raise ValueError(
                f"Virtual relationship [:{relationship.type}] between "
                f"(:{src}) and (:{tgt}) already exists; "
                f"DROP VIRTUAL ...-[:{relationship.type}]-... first"
            )
        physical = PhysicalRelationship()
        physical.type = relationship.type
        physical.statement = statement
        if relationship.source is not None:
            physical.source = relationship.source
        if relationship.target is not None:
            physical.target = relationship.target
        physical.is_static = is_static
        physical.refresh_every_ms = refresh_every_ms
        if type_map is None:
            type_map = {}
            Database._relationships[relationship.type] = type_map
        type_map[key] = physical

    def remove_relationship(self, relationship: 'Relationship') -> None:
        """Removes a relationship from the database."""
        if relationship.type is None:
            raise ValueError("Relationship type is null")
        type_map = Database._relationships.get(relationship.type)
        if type_map is None:
            return
        key = Database._endpoint_key(
            relationship.source.label if relationship.source else None,
            relationship.target.label if relationship.target else None,
        )
        type_map.pop(key, None)
        if not type_map:
            Database._relationships.pop(relationship.type, None)

    def refresh_relationship(self, relationship: 'Relationship') -> None:
        """Invalidates the cache of a STATIC virtual relationship."""
        if relationship.type is None:
            raise ValueError("Relationship type is null")
        type_map = Database._relationships.get(relationship.type)
        key = Database._endpoint_key(
            relationship.source.label if relationship.source else None,
            relationship.target.label if relationship.target else None,
        )
        physical = type_map.get(key) if type_map is not None else None
        if physical is None:
            src = relationship.source.label if relationship.source else ""
            tgt = relationship.target.label if relationship.target else ""
            raise ValueError(
                f"Virtual relationship [:{relationship.type}] between "
                f"(:{src}) and (:{tgt}) does not exist"
            )
        physical.invalidate_cache()

    def get_relationship(self, relationship: 'Relationship') -> Optional['PhysicalRelationship']:
        """Gets a relationship from the database (null labels act as wildcards)."""
        type_map = Database._relationships.get(relationship.type) if relationship.type else None
        if not type_map:
            return None
        src = relationship.source.label if relationship.source else None
        tgt = relationship.target.label if relationship.target else None
        if src is not None or tgt is not None:
            return type_map.get(Database._endpoint_key(src, tgt))
        # Null labels = wildcard: return last entry
        last = None
        for p in type_map.values():
            last = p
        return last
