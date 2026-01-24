"""Split function."""

from typing import Any, List

from .function import Function
from ..ast_node import ASTNode
from ..expressions.string import String
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Splits a string into an array by a delimiter",
    "category": "scalar",
    "parameters": [
        {"name": "text", "description": "String to split", "type": "string"},
        {"name": "delimiter", "description": "Delimiter to split by", "type": "string"}
    ],
    "output": {"description": "Array of string parts", "type": "array", "items": {"type": "string"}, "example": ["a", "b", "c"]},
    "examples": ["WITH 'a,b,c' AS s RETURN split(s, ',')"]
})
class Split(Function):
    """Split function.
    
    Splits a string into an array by a delimiter.
    """

    def __init__(self):
        super().__init__("split")
        self._expected_parameter_count = 2

    @property
    def parameters(self) -> List[ASTNode]:
        return self.get_children()

    @parameters.setter
    def parameters(self, nodes: List[ASTNode]) -> None:
        if len(nodes) == 1:
            nodes.append(String(""))
        for node in nodes:
            self.add_child(node)

    def value(self) -> Any:
        text = self.get_children()[0].value()
        delimiter = self.get_children()[1].value()
        if not isinstance(text, str) or not isinstance(delimiter, str):
            raise ValueError("Invalid arguments for split function")
        return text.split(delimiter)
