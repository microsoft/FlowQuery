"""FlowQuery Extensibility API

This module provides all the exports needed to create custom FlowQuery functions.

Example:
    from flowquery.extensibility import Function, FunctionDef
    
    @FunctionDef({
        'description': "Converts a string to uppercase",
        'category': "string",
        'parameters': [{'name': "text", 'description': "String to convert", 'type': "string"}],
        'output': {'description': "Uppercase string", 'type': "string"}
    })
    class UpperCase(Function):
        def __init__(self):
            super().__init__("uppercase")
            self._expected_parameter_count = 1
        
        def value(self) -> str:
            return str(self.get_children()[0].value()).upper()
"""

# Base function classes for creating custom functions
from .parsing.functions.function import Function
from .parsing.functions.aggregate_function import AggregateFunction
from .parsing.functions.async_function import AsyncFunction
from .parsing.functions.predicate_function import PredicateFunction
from .parsing.functions.reducer_element import ReducerElement

# Decorator and metadata types for function registration
from .parsing.functions.function_metadata import (
    FunctionDef,
    FunctionMetadata,
    FunctionDefOptions,
    ParameterSchema,
    OutputSchema,
    FunctionCategory,
)

__all__ = [
    "Function",
    "AggregateFunction",
    "AsyncFunction",
    "PredicateFunction",
    "ReducerElement",
    "FunctionDef",
    "FunctionMetadata",
    "FunctionDefOptions",
    "ParameterSchema",
    "OutputSchema",
    "FunctionCategory",
]
