"""Labels function."""

from typing import Any

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Returns the labels of a node as an array",
    "category": "scalar",
    "parameters": [
        {"name": "node", "description": "A node to get the labels from", "type": "object"}
    ],
    "output": {"description": "Array of labels", "type": "array", "example": ["Person"]},
    "examples": [
        "MATCH (n:Person) RETURN labels(n)",
        "MATCH (n) RETURN labels(n)"
    ]
})
class Labels(Function):
    """Labels function.

    Returns the labels of a node as an array.
    """

    def __init__(self) -> None:
        super().__init__("labels")
        self._expected_parameter_count = 1

    def value(self) -> Any:
        val = self.get_children()[0].value()
        if val is None:
            return None
        if not isinstance(val, dict):
            raise ValueError("labels() expects a node")
        label = val.get("_label")
        if label:
            return [label]
        return []
