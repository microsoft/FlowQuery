"""Functions module for FlowQuery parsing."""

from .function import Function
from .aggregate_function import AggregateFunction
from .async_function import AsyncFunction
from .predicate_function import PredicateFunction
from .reducer_element import ReducerElement
from .value_holder import ValueHolder
from .function_metadata import (
    FunctionCategory,
    ParameterSchema,
    OutputSchema,
    FunctionMetadata,
    FunctionDef,
    FunctionDefOptions,
    get_registered_function_metadata,
    get_registered_function_factory,
    get_function_metadata,
)
from .function_factory import FunctionFactory

# Built-in functions
from .sum import Sum
from .avg import Avg
from .collect import Collect
from .join import Join
from .keys import Keys
from .rand import Rand
from .range_ import Range
from .replace import Replace
from .round_ import Round
from .size import Size
from .split import Split
from .stringify import Stringify
from .to_json import ToJson
from .type_ import Type
from .functions import Functions
from .predicate_sum import PredicateSum

__all__ = [
    # Base classes
    "Function",
    "AggregateFunction",
    "AsyncFunction",
    "PredicateFunction",
    "ReducerElement",
    "ValueHolder",
    "FunctionCategory",
    "ParameterSchema",
    "OutputSchema",
    "FunctionMetadata",
    "FunctionDef",
    "FunctionDefOptions",
    "get_registered_function_metadata",
    "get_registered_function_factory",
    "get_function_metadata",
    "FunctionFactory",
    # Built-in functions
    "Sum",
    "Avg",
    "Collect",
    "Join",
    "Keys",
    "Rand",
    "Range",
    "Replace",
    "Round",
    "Size",
    "Split",
    "Stringify",
    "ToJson",
    "Type",
    "Functions",
    "PredicateSum",
]
