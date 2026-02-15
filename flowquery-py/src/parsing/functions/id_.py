"""Id function."""

from typing import Any

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": (
        "Returns the id of a node or relationship. "
        "For nodes, returns the id property. For relationships, returns the type."
    ),
    "category": "scalar",
    "parameters": [
        {"name": "entity", "description": "A node or relationship to get the id from", "type": "object"}
    ],
    "output": {"description": "The id of the entity", "type": "any", "example": "1"},
    "examples": [
        "MATCH (n:Person) RETURN id(n)",
        "MATCH (a)-[r]->(b) RETURN id(r)"
    ]
})
class Id(Function):
    """Id function.

    Returns the id of a node or relationship.
    """

    def __init__(self) -> None:
        super().__init__("id")
        self._expected_parameter_count = 1

    def value(self) -> Any:
        obj = self.get_children()[0].value()
        if obj is None:
            return None
        if not isinstance(obj, dict):
            raise ValueError("id() expects a node or relationship")

        # If it's a RelationshipMatchRecord (has type, startNode, endNode, properties)
        if all(k in obj for k in ("type", "startNode", "endNode", "properties")):
            return obj["type"]

        # If it's a node record (has id field)
        if "id" in obj:
            return obj["id"]

        raise ValueError("id() expects a node or relationship")
