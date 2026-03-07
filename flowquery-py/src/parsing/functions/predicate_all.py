"""PredicateAll function."""

from typing import Any

from .function_metadata import FunctionDef
from .predicate_function import PredicateFunction


@FunctionDef({
    "description": "Returns true if all elements in the list satisfy the condition.",
    "category": "predicate",
    "parameters": [
        {"name": "variable", "description": "Variable name to bind each element", "type": "string"},
        {"name": "list", "description": "List to iterate over", "type": "array"},
        {"name": "where", "description": "Condition to test for each element", "type": "boolean"},
    ],
    "output": {"description": "True if all elements satisfy the condition", "type": "boolean", "example": True},
    "examples": [
        "RETURN all(n IN [2, 4, 6] WHERE n > 0)",
    ],
})
class PredicateAll(PredicateFunction):
    def __init__(self) -> None:
        super().__init__("all")

    def value(self) -> Any:
        ref = self.reference
        if hasattr(ref, 'referred'):
            ref.referred = self._value_holder
        array = self.array.value()
        if array is None or not isinstance(array, list):
            return True
        for item in array:
            self._value_holder.holder = item
            if self.where is not None and not self.where.value():
                return False
        return True
