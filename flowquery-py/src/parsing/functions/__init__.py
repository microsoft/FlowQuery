"""Functions module for FlowQuery parsing."""

from .aggregate_function import AggregateFunction
from .async_function import AsyncFunction
from .avg import Avg
from .coalesce import Coalesce
from .collect import Collect
from .count import Count
from .date_ import DateFunction
from .datetime_ import Datetime
from .function import Function
from .function_factory import FunctionFactory
from .function_metadata import (
    FunctionCategory,
    FunctionDef,
    FunctionDefOptions,
    FunctionMetadata,
    OutputSchema,
    ParameterSchema,
    get_function_metadata,
    get_registered_function_factory,
    get_registered_function_metadata,
)
from .functions import Functions
from .join import Join
from .keys import Keys
from .localdatetime import LocalDatetime
from .localtime import LocalTime
from .max_ import Max
from .min_ import Min
from .predicate_function import PredicateFunction
from .predicate_sum import PredicateSum
from .rand import Rand
from .range_ import Range
from .reducer_element import ReducerElement
from .replace import Replace
from .round_ import Round
from .schema import Schema
from .size import Size
from .split import Split
from .string_distance import StringDistance
from .stringify import Stringify

# Built-in functions
from .sum import Sum
from .time_ import Time
from .timestamp import Timestamp
from .to_json import ToJson
from .to_lower import ToLower
from .to_string import ToString
from .trim import Trim
from .type_ import Type
from .value_holder import ValueHolder

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
    "DateFunction",
    "Datetime",
    "Coalesce",
    "Collect",
    "Count",
    "Join",
    "Keys",
    "Max",
    "Min",
    "Rand",
    "Range",
    "Replace",
    "Round",
    "Size",
    "Split",
    "StringDistance",
    "Stringify",
    "Time",
    "Timestamp",
    "ToJson",
    "ToLower",
    "ToString",
    "Trim",
    "Type",
    "LocalDatetime",
    "LocalTime",
    "Functions",
    "Schema",
    "PredicateSum",
]
