"""Token type enumeration for FlowQuery tokenization."""

from enum import Enum


class TokenType(Enum):
    """Enumeration of all token types in FlowQuery."""
    
    KEYWORD = "KEYWORD"
    BOOLEAN = "BOOLEAN"
    OPERATOR = "OPERATOR"
    UNARY_OPERATOR = "UNARY_OPERATOR"
    IDENTIFIER = "IDENTIFIER"
    STRING = "STRING"
    F_STRING = "F-STRING"
    BACKTICK_STRING = "BACKTICK_STRING"
    NUMBER = "NUMBER"
    SYMBOL = "SYMBOL"
    WHITESPACE = "WHITESPACE"
    COMMENT = "COMMENT"
    EOF = "EOF"
