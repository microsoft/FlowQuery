"""Symbol enumeration for FlowQuery tokenization."""

from enum import Enum


class Symbol(Enum):
    """Enumeration of all symbols in FlowQuery."""
    
    LEFT_PARENTHESIS = "("
    RIGHT_PARENTHESIS = ")"
    COMMA = ","
    DOT = "."
    COLON = ":"
    WHITESPACE = ""
    OPENING_BRACE = "{"
    CLOSING_BRACE = "}"
    OPENING_BRACKET = "["
    CLOSING_BRACKET = "]"
    BACKTICK = "`"
