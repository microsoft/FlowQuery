"""
FlowQuery - A declarative query language for data processing pipelines.

This is the Python implementation of FlowQuery.

This module provides the core components for defining, parsing, and executing FlowQuery queries.
"""

from .compute.runner import Runner
from .io.command_line import CommandLine
from .parsing.parser import Parser
from .parsing.functions.function import Function
from .parsing.functions.aggregate_function import AggregateFunction
from .parsing.functions.async_function import AsyncFunction
from .parsing.functions.predicate_function import PredicateFunction
from .parsing.functions.reducer_element import ReducerElement
from .parsing.functions.function_metadata import (
    FunctionDef,
    FunctionMetadata,
    FunctionCategory,
)

__all__ = [
    "Runner",
    "CommandLine",
    "Parser",
    "Function",
    "AggregateFunction",
    "AsyncFunction",
    "PredicateFunction",
    "ReducerElement",
    "FunctionDef",
    "FunctionMetadata",
    "FunctionCategory",
]

