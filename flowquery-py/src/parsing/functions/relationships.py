"""Relationships function."""

from typing import Any, List

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Returns all relationships in a path as an array",
    "category": "scalar",
    "parameters": [
        {"name": "path", "description": "A path value returned from a graph pattern match", "type": "array"}
    ],
    "output": {
        "description": "Array of relationship records", "type": "array",
        "example": [{"type": "KNOWS", "properties": {"since": "2020"}}]
    },
    "examples": ["MATCH p=(:Person)-[:KNOWS]-(:Person) RETURN relationships(p)"]
})
class Relationships(Function):
    """Relationships function.

    Returns all relationships in a path as an array.
    """

    def __init__(self) -> None:
        super().__init__("relationships")
        self._expected_parameter_count = 1

    def value(self) -> Any:
        path = self.get_children()[0].value()
        if path is None:
            return []
        if not isinstance(path, list):
            raise ValueError("relationships() expects a path (array)")
        # A path is an array of alternating node and relationship objects:
        # [node, rel, node, rel, node, ...]
        # Relationships are RelationshipMatchRecords (have 'type', 'startNode', 'endNode', 'properties')
        result: List[Any] = []
        for element in path:
            if element is None or not isinstance(element, dict):
                continue
            if all(k in element for k in ("type", "startNode", "endNode", "properties")):
                result.append(element)
        return result
