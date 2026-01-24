"""Operator enumeration for FlowQuery tokenization."""

from enum import Enum


class Operator(Enum):
    """Enumeration of all operators in FlowQuery."""
    
    # Arithmetic
    ADD = "+"
    SUBTRACT = "-"
    MULTIPLY = "*"
    DIVIDE = "/"
    MODULO = "%"
    EXPONENT = "^"
    # Comparison
    EQUALS = "="
    NOT_EQUALS = "<>"
    LESS_THAN = "<"
    LESS_THAN_OR_EQUAL = "<="
    GREATER_THAN = ">"
    GREATER_THAN_OR_EQUAL = ">="
    IS = "IS"
    # Logical
    AND = "AND"
    OR = "OR"
    NOT = "NOT"
    IN = "IN"
    PIPE = "|"
