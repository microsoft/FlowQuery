"""Stringify function."""

import json
from typing import Any, List

from .function import Function
from ..ast_node import ASTNode
from ..expressions.number import Number
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Converts a value to its JSON string representation",
    "category": "scalar",
    "parameters": [
        {"name": "value", "description": "Value to stringify", "type": "any"}
    ],
    "output": {"description": "JSON string", "type": "string", "example": '{"a":1}'},
    "examples": ["WITH {a: 1} AS obj RETURN stringify(obj)"]
})
class Stringify(Function):
    """Stringify function.
    
    Converts a value to its JSON string representation.
    """

    def __init__(self):
        super().__init__("stringify")
        self._expected_parameter_count = 2

    @property
    def parameters(self) -> List[ASTNode]:
        return self.get_children()

    @parameters.setter
    def parameters(self, nodes: List[ASTNode]) -> None:
        if len(nodes) == 1:
            nodes.append(Number("3"))  # Default indent of 3
        for node in nodes:
            self.add_child(node)

    def value(self) -> Any:
        val = self.get_children()[0].value()
        indent = int(self.get_children()[1].value())
        if not isinstance(val, (dict, list)):
            raise ValueError("Invalid argument for stringify function")
        return json.dumps(val, indent=indent, default=str)
