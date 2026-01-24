"""Null component node."""

from ..ast_node import ASTNode


class Null(ASTNode):
    """Represents a NULL value in the AST."""
    
    def value(self):
        return None
