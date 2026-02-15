"""ElementId function."""

from typing import Any

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": (
        "Returns the element id of a node or relationship as a string. "
        "For nodes, returns the string representation of the id property. "
        "For relationships, returns the type."
    ),
    "category": "scalar",
    "parameters": [
        {"name": "entity", "description": "A node or relationship to get the element id from", "type": "object"}
    ],
    "output": {"description": "The element id of the entity as a string", "type": "string", "example": "\"1\""},
    "examples": [
        "MATCH (n:Person) RETURN elementId(n)",
        "MATCH (a)-[r]->(b) RETURN elementId(r)"
    ]
})
class ElementId(Function):
    """ElementId function.

    Returns the element id of a node or relationship as a string.
    """

    def __init__(self) -> None:
        super().__init__("elementid")
        self._expected_parameter_count = 1

    def value(self) -> Any:
        obj = self.get_children()[0].value()
        if obj is None:
            return None
        if not isinstance(obj, dict):
            raise ValueError("elementId() expects a node or relationship")

        # If it's a RelationshipMatchRecord (has type, startNode, endNode, properties)
        if all(k in obj for k in ("type", "startNode", "endNode", "properties")):
            return str(obj["type"])

        # If it's a node record (has id field)
        if "id" in obj:
            return str(obj["id"])

        raise ValueError("elementId() expects a node or relationship")
