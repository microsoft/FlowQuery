"""Substring function."""

from typing import Any, List

from ..ast_node import ASTNode
from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Returns a substring of a string, starting at a 0-based index with an optional length",
    "category": "scalar",
    "parameters": [
        {"name": "original", "description": "The original string", "type": "string"},
        {"name": "start", "description": "The 0-based start index", "type": "integer"},
        {
            "name": "length",
            "description": "The length of the substring (optional)",
            "type": "integer",
        }
    ],
    "output": {"description": "The substring", "type": "string", "example": "llo"},
    "examples": [
        "RETURN substring('hello', 1, 3)",
        "RETURN substring('hello', 2)"
    ]
})
class Substring(Function):
    """Substring function.

    Returns a substring of a string, starting at a 0-based index with an optional length.
    """

    def __init__(self) -> None:
        super().__init__("substring")

    @property
    def parameters(self) -> List[ASTNode]:
        return self.get_children()

    @parameters.setter
    def parameters(self, nodes: List[ASTNode]) -> None:
        if len(nodes) < 2 or len(nodes) > 3:
            raise ValueError(
                f"Function substring expected 2 or 3 parameters, but got {len(nodes)}"
            )
        for node in nodes:
            self.add_child(node)

    def value(self) -> Any:
        children = self.get_children()
        original = children[0].value()
        start = children[1].value()

        if not isinstance(original, str):
            raise ValueError(
                "Invalid argument for substring function: expected a string as the first argument"
            )
        if not isinstance(start, (int, float)) or (isinstance(start, float) and not start.is_integer()):
            raise ValueError(
                "Invalid argument for substring function: expected an integer as the second argument"
            )
        start = int(start)

        if len(children) == 3:
            length = children[2].value()
            if not isinstance(length, (int, float)) or (isinstance(length, float) and not length.is_integer()):
                raise ValueError(
                    "Invalid argument for substring function: expected an integer as the third argument"
                )
            length = int(length)
            return original[start:start + length]

        return original[start:]
