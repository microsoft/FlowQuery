"""Alias node for FlowQuery AST."""

from .ast_node import ASTNode


class Alias(ASTNode):
    """Represents an alias in the FlowQuery AST."""

    def __init__(self, alias: str):
        super().__init__()
        self._alias = alias

    def __str__(self) -> str:
        return f"Alias ({self._alias})"

    def get_alias(self) -> str:
        return self._alias

    def value(self) -> str:
        return self._alias
