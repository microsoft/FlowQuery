"""Join function."""

from typing import Any, List

from .function import Function
from ..ast_node import ASTNode
from ..expressions.string import String
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Joins an array of strings with a delimiter",
    "category": "scalar",
    "parameters": [
        {"name": "array", "description": "Array of values to join", "type": "array"},
        {"name": "delimiter", "description": "Delimiter to join with", "type": "string"}
    ],
    "output": {"description": "Joined string", "type": "string", "example": "a,b,c"},
    "examples": ["WITH ['a', 'b', 'c'] AS arr RETURN join(arr, ',')"]
})
class Join(Function):
    """Join function.
    
    Joins an array of strings with a delimiter.
    """

    def __init__(self):
        super().__init__("join")
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
        array = self.get_children()[0].value()
        delimiter = self.get_children()[1].value()
        if not isinstance(array, list) or not isinstance(delimiter, str):
            raise ValueError("Invalid arguments for join function")
        return delimiter.join(str(item) for item in array)
