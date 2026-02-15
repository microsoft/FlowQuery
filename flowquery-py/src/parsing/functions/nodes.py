"""Nodes function."""

from typing import Any, List

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Returns all nodes in a path as an array",
    "category": "scalar",
    "parameters": [
        {"name": "path", "description": "A path value returned from a graph pattern match", "type": "array"}
    ],
    "output": {
        "description": "Array of node records", "type": "array",
        "example": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]
    },
    "examples": ["MATCH p=(:Person)-[:KNOWS]-(:Person) RETURN nodes(p)"]
})
class Nodes(Function):
    """Nodes function.

    Returns all nodes in a path as an array.
    """

    def __init__(self) -> None:
        super().__init__("nodes")
        self._expected_parameter_count = 1

    def value(self) -> Any:
        path = self.get_children()[0].value()
        if path is None:
            return []
        if not isinstance(path, list):
            raise ValueError("nodes() expects a path (array)")
        # A path is an array of alternating node and relationship objects:
        # [node, rel, node, rel, node, ...]
        # Nodes are plain dicts (have 'id' but not all of 'type'/'startNode'/'endNode'/'properties')
        # Relationships are RelationshipMatchRecords (have 'type', 'startNode', 'endNode', 'properties')
        result: List[Any] = []
        for element in path:
            if element is None or not isinstance(element, dict):
                continue
            # A RelationshipMatchRecord has type, startNode, endNode, properties
            if not all(k in element for k in ("type", "startNode", "endNode", "properties")):
                result.append(element)
        return result
