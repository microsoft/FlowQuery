"""Properties function."""

from typing import Any

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": (
        "Returns a map containing all the properties of a node, relationship, or map. "
        "For nodes and relationships, internal identifiers are excluded."
    ),
    "category": "scalar",
    "parameters": [
        {"name": "entity", "description": "A node, relationship, or map to extract properties from", "type": "object"}
    ],
    "output": {"description": "Map of properties", "type": "object", "example": {"name": "Alice", "age": 30}},
    "examples": [
        "MATCH (n:Person) RETURN properties(n)",
        "WITH { name: 'Alice', age: 30 } AS obj RETURN properties(obj)"
    ]
})
class Properties(Function):
    """Properties function.

    Returns a map containing all the properties of a node, relationship, or map.
    """

    def __init__(self) -> None:
        super().__init__("properties")
        self._expected_parameter_count = 1

    def value(self) -> Any:
        obj = self.get_children()[0].value()
        if obj is None:
            return None
        if not isinstance(obj, dict):
            raise ValueError("properties() expects a node, relationship, or map")

        # If it's a RelationshipMatchRecord (has type, startNode, endNode, properties)
        if all(k in obj for k in ("type", "startNode", "endNode", "properties")):
            return obj["properties"]

        # If it's a node record (has id field), exclude id
        if "id" in obj:
            return {k: v for k, v in obj.items() if k != "id"}

        # Otherwise, treat as a plain map and return a copy
        return dict(obj)
