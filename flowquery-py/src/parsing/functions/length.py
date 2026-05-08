"""Length function."""

from typing import Any

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Returns the number of relationships in a path",
    "category": "scalar",
    "parameters": [
        {"name": "path", "description": "A path value returned from a graph pattern match", "type": "array"}
    ],
    "output": {"description": "Number of relationships in the path", "type": "number", "example": 2},
    "examples": ["MATCH p=(:Person)-[:KNOWS*1..3]->(:Person) RETURN length(p)"]
})
class Length(Function):
    """Length function.

    Returns the number of relationships in a path, matching Cypher semantics.
    """

    def __init__(self) -> None:
        super().__init__("length")
        self._expected_parameter_count = 1

    def value(self) -> Any:
        path = self.get_children()[0].value()
        if path is None:
            return 0
        if not isinstance(path, list):
            raise ValueError("length() expects a path (array)")
        # A path is an array of alternating node and relationship objects:
        # [node, rel, node, rel, node, ...]. Count the relationship records,
        # matching Cypher semantics for length() on paths.
        count = 0
        for element in path:
            if element is None or not isinstance(element, dict):
                continue
            if all(k in element for k in ("type", "startNode", "endNode", "properties")):
                count += 1
        return count
