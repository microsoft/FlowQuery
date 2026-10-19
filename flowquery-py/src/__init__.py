"""
FlowQuery - A declarative query language for data processing pipelines.

This is the Python implementation of FlowQuery.

This module provides the core components for defining, parsing, and executing FlowQuery queries.
"""

from .compute.flowquery import FlowQuery
from .compute.provenance import (
    DataSourceBinding,
    NodeBinding,
    ProvenanceSource,
    RelationshipBinding,
    RelationshipHop,
    RowProvenance,
    RowSegment,
)
from .compute.runner import (
    CellBindingTrace,
    CellTrace,
    LineageReport,
    Runner,
    RunnerMetadata,
    RunnerOptions,
)
from .graph.source_context import SourceOptions
from .graph.source_provider import (
    PREDICATE_OPERATORS,
    SOURCE_CONTRACT_VERSION,
    STRING_ORDERINGS,
    NodeSource,
    QueryCancelledError,
    RelationshipSource,
    SourceCapabilityError,
    SourceError,
    SourceProvider,
    SourceReadContext,
    SourceRequest,
    SourceResponseError,
    SourceResult,
    SourceSignal,
    SourceUnsupportedError,
    cursor_pages,
    matches_predicate,
    normalize_capabilities,
)
from .graph.write_set import WRITE_CONTRACT_VERSION, WriteResult
from .io.command_line import CommandLine
from .parsing.functions.aggregate_function import AggregateFunction
from .parsing.functions.async_function import AsyncFunction, FunctionContext
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
    ColumnLineage,
    ColumnReference,
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
    "RunnerOptions",
    "CellBindingTrace",
    "CellTrace",
    "LineageReport",
    "RowProvenance",
    "RowSegment",
    "NodeBinding",
    "RelationshipBinding",
    "RelationshipHop",
    "DataSourceBinding",
    "ProvenanceSource",
    "StatementInfo",
    "StatementInfoCrawler",
    "ColumnLineage",
    "ColumnReference",
    "NodeInfo",
    "RelationshipInfo",
    "DeclaredEntityInfo",
    "DeclaredInfo",
    "CommandLine",
    "Parser",
    "Function",
    "AggregateFunction",
    "AsyncFunction",
    "FunctionContext",
    "PredicateFunction",
    "ReducerElement",
    "FunctionDef",
    "FunctionMetadata",
    "FunctionCategory",
    "SOURCE_CONTRACT_VERSION",
    "STRING_ORDERINGS",
    "WRITE_CONTRACT_VERSION",
    "WriteResult",
    "PREDICATE_OPERATORS",
    "SourceOptions",
    "SourceSignal",
    "SourceReadContext",
    "SourceError",
    "SourceCapabilityError",
    "SourceResponseError",
    "SourceUnsupportedError",
    "QueryCancelledError",
    "SourceProvider",
    "SourceRequest",
    "SourceResult",
    "NodeSource",
    "RelationshipSource",
    "cursor_pages",
    "matches_predicate",
    "normalize_capabilities",
]

