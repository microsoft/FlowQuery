"""PredicateSum function."""

from typing import Any, List, Optional

from .predicate_function import PredicateFunction
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Calculates the sum of values in an array with optional filtering. Uses list comprehension syntax: sum(variable IN array [WHERE condition] | expression)",
    "category": "predicate",
    "parameters": [
        {"name": "variable", "description": "Variable name to bind each element", "type": "string"},
        {"name": "array", "description": "Array to iterate over", "type": "array"},
        {"name": "expression", "description": "Expression to sum for each element", "type": "any"},
        {"name": "where", "description": "Optional filter condition", "type": "boolean", "required": False}
    ],
    "output": {"description": "Sum of the evaluated expressions", "type": "number", "example": 6},
    "examples": [
        "WITH [1, 2, 3] AS nums RETURN sum(n IN nums | n)",
        "WITH [1, 2, 3, 4] AS nums RETURN sum(n IN nums WHERE n > 1 | n * 2)"
    ]
})
class PredicateSum(PredicateFunction):
    """PredicateSum function.
    
    Calculates the sum of values in an array with optional filtering.
    """

    def __init__(self):
        super().__init__("sum")

    def value(self) -> Any:
        self.reference.referred = self._value_holder
        array = self.array.value()
        if array is None or not isinstance(array, list):
            raise ValueError("Invalid array for sum function")
        
        _sum: Optional[Any] = None
        for item in array:
            self._value_holder.holder = item
            if self.where is None or self.where.value():
                if _sum is None:
                    _sum = self._return.value()
                else:
                    _sum += self._return.value()
        return _sum
