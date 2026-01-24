"""Graph database for FlowQuery."""

from typing import Any, Dict, Optional, Union, TYPE_CHECKING

from ..parsing.ast_node import ASTNode

if TYPE_CHECKING:
    from .node import Node
    from .relationship import Relationship
    from .node_data import NodeData
    from .relationship_data import RelationshipData


class Database:
    """Singleton database for storing graph data."""

    _instance: Optional['Database'] = None
    _nodes: Dict[str, 'PhysicalNode'] = {}
    _relationships: Dict[str, 'PhysicalRelationship'] = {}

    def __init__(self):
        pass

    @classmethod
    def get_instance(cls) -> 'Database':
        if cls._instance is None:
            cls._instance = Database()
        return cls._instance

    def add_node(self, node: 'Node', statement: ASTNode) -> None:
        """Adds a node to the database."""
        from .physical_node import PhysicalNode
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
        from .physical_relationship import PhysicalRelationship
        if relationship.type is None:
            raise ValueError("Relationship type is null")
        physical = PhysicalRelationship()
        physical.type = relationship.type
        physical.statement = statement
        Database._relationships[relationship.type] = physical

    def get_relationship(self, relationship: 'Relationship') -> Optional['PhysicalRelationship']:
        """Gets a relationship from the database."""
        return Database._relationships.get(relationship.type) if relationship.type else None

    async def get_data(self, element: Union['Node', 'Relationship']) -> Union['NodeData', 'RelationshipData']:
        """Gets data for a node or relationship."""
        from .node import Node
        from .relationship import Relationship
        from .node_data import NodeData
        from .relationship_data import RelationshipData
        
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


# Import for type hints
from .physical_node import PhysicalNode
from .physical_relationship import PhysicalRelationship
