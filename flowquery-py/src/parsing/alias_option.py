"""Alias option enumeration for FlowQuery parsing."""

from enum import Enum


class AliasOption(Enum):
    """Enumeration of alias options for parsing."""
    
    NOT_ALLOWED = 0
    OPTIONAL = 1
    REQUIRED = 2
