"""Functions introspection function."""

from typing import Any, Dict, List, Optional

from .function import Function
from .function_factory import FunctionFactory
from .function_metadata import FunctionDef


@FunctionDef({
    "description": "Lists all registered functions with their metadata. Useful for discovering available functions and their documentation.",
    "category": "scalar",
    "parameters": [
        {"name": "category", "description": "Optional category to filter by (e.g., 'aggregation', 'string', 'math')", "type": "string", "required": False}
    ],
    "output": {
        "description": "Array of function metadata objects",
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "name": {"description": "Function name", "type": "string"},
                "description": {"description": "What the function does", "type": "string"},
                "category": {"description": "Function category", "type": "string"},
                "parameters": {"description": "Array of parameter definitions", "type": "array"},
                "output": {"description": "Output schema", "type": "object"},
                "examples": {"description": "Usage examples", "type": "array"}
            }
        }
    },
    "examples": [
        "WITH functions() AS funcs RETURN funcs",
        "WITH functions('aggregation') AS funcs UNWIND funcs AS f RETURN f.name, f.description"
    ]
})
class Functions(Function):
    """Functions introspection function.
    
    Lists all registered functions with their metadata.
    """

    def __init__(self):
        super().__init__("functions")
        self._expected_parameter_count = None  # 0 or 1 parameter

    def value(self) -> Any:
        children = self.get_children()
        
        if len(children) == 0:
            # Return all functions
            return FunctionFactory.list_functions()
        elif len(children) == 1:
            # Filter by category
            category = children[0].value()
            if isinstance(category, str):
                return FunctionFactory.list_functions(category=category)
            raise ValueError("functions() category parameter must be a string")
        else:
            raise ValueError("functions() takes 0 or 1 parameters")
