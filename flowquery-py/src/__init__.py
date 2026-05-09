"""
FlowQuery - A declarative query language for data processing pipelines.

This is the Python implementation of FlowQuery.

This module provides the core components for defining, parsing, and executing FlowQuery queries.
"""

from .compute.flowquery import FlowQuery
from .compute.runner import Runner, RunnerMetadata
from .io.command_line import CommandLine
from .parsing.functions.aggregate_function import AggregateFunction
from .parsing.functions.async_function import AsyncFunction
from .parsing.functions.function import Function
from .parsing.functions.function_metadata import (
    FunctionCategory,
    FunctionDef,
    FunctionMetadata,
)
from .parsing.functions.predicate_function import PredicateFunction
from .parsing.functions.reducer_element import ReducerElement
from .parsing.parser import Parser
from .parsing.statement_info_crawler import (
    DeclaredEntityInfo,
    DeclaredInfo,
    NodeInfo,
    RelationshipInfo,
    StatementInfo,
    StatementInfoCrawler,
)

__all__ = [
    "FlowQuery",
    "Runner",
    "RunnerMetadata",
    "StatementInfo",
    "StatementInfoCrawler",
    "NodeInfo",
    "RelationshipInfo",
    "DeclaredEntityInfo",
    "DeclaredInfo",
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

