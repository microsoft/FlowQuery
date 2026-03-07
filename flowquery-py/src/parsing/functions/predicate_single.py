"""PredicateSingle function."""

from typing import Any

from .function_metadata import FunctionDef
from .predicate_function import PredicateFunction


@FunctionDef({
    "description": "Returns true if exactly one element in the list satisfies the condition.",
    "category": "predicate",
    "parameters": [
        {"name": "variable", "description": "Variable name to bind each element", "type": "string"},
        {"name": "list", "description": "List to iterate over", "type": "array"},
        {"name": "where", "description": "Condition to test for each element", "type": "boolean"},
    ],
    "output": {
        "description": "True if exactly one element satisfies the condition",
        "type": "boolean",
        "example": True,
    },
    "examples": [
        "RETURN single(n IN [1, 2, 3] WHERE n > 2)",
    ],
})
class PredicateSingle(PredicateFunction):
    def __init__(self) -> None:
        super().__init__("single")

    def value(self) -> Any:
        ref = self.reference
        if hasattr(ref, 'referred'):
            ref.referred = self._value_holder
        array = self.array.value()
        if array is None or not isinstance(array, list):
            return False
        count = 0
        for item in array:
            self._value_holder.holder = item
            if self.where is not None and self.where.value():
                count += 1
                if count > 1:
                    return False
        return count == 1
