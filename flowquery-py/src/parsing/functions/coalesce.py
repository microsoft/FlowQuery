"""Coalesce function."""

from typing import Any

from .function import Function
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Returns the first non-null value from a list of expressions",
    "category": "scalar",
    "parameters": [
        {"name": "expressions", "description": "Two or more expressions to evaluate", "type": "any"}
    ],
    "output": {"description": "The first non-null value, or null if all values are null", "type": "any"},
    "examples": [
        "RETURN coalesce(null, 'hello', 'world')",
        "MATCH (n) RETURN coalesce(n.nickname, n.name) AS displayName"
    ]
})
class Coalesce(Function):
    """Coalesce function.

    Returns the first non-null value from a list of expressions.
    Equivalent to Neo4j's coalesce() function.
    """

    def __init__(self) -> None:
        super().__init__("coalesce")
        self._expected_parameter_count = None  # variable number of parameters

    def value(self) -> Any:
        children = self.get_children()
        if len(children) == 0:
            raise ValueError("coalesce() requires at least one argument")
        for child in children:
            try:
                val = child.value()
            except (KeyError, AttributeError):
                # Treat missing properties/keys as null, matching Neo4j behavior
                val = None
            if val is not None:
                return val
        return None
