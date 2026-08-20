"""Round function."""

import math
from typing import Any, List

from ..ast_node import ASTNode
from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Rounds a number to the nearest integer, or to an optional number of decimal places",
    "category": "scalar",
    "parameters": [
        {"name": "value", "description": "Number to round", "type": "number"},
        {
            "name": "precision",
            "description": "Number of decimal places to round to (optional)",
            "type": "integer",
        }
    ],
    "output": {"description": "Rounded number", "type": "number", "example": 4},
    "examples": ["WITH 3.7 AS n RETURN round(n)", "RETURN round(3.14159, 2)"]
})
class Round(Function):
    """Round function.

    Rounds a number to the nearest integer, or to an optional number of
    decimal places.
    """

    def __init__(self) -> None:
        super().__init__("round")

    @property
    def parameters(self) -> List[ASTNode]:
        return self.get_children()

    @parameters.setter
    def parameters(self, nodes: List[ASTNode]) -> None:
        if len(nodes) < 1 or len(nodes) > 2:
            raise ValueError(
                f"Function round expected 1 or 2 parameters, but got {len(nodes)}"
            )
        for node in nodes:
            self.add_child(node)

    def value(self) -> Any:
        children = self.get_children()
        val = children[0].value()
        if val is None:
            return None
        if not isinstance(val, (int, float)):
            raise ValueError("Invalid argument for round function")
        if len(children) == 1:
            return round(val)
        precision = children[1].value()
        if precision is None:
            return None
        if not isinstance(precision, (int, float)) or (
            isinstance(precision, float) and not precision.is_integer()
        ):
            raise ValueError("Invalid precision argument for round function")
        precision = int(precision)
        # Round half away from zero to `precision` decimal places.
        factor = 10 ** precision
        return math.copysign(math.floor(abs(val) * factor + 0.5), val) / factor
