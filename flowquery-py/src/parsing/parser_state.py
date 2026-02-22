from typing import Dict

from .ast_node import ASTNode
from .context import Context


class ParserState:
    def __init__(self) -> None:
        self._variables: Dict[str, ASTNode] = {}
        self._context = Context()
        self._returns = 0
        self._in_virtual_definition = False

    @property
    def in_virtual_definition(self) -> bool:
        return self._in_virtual_definition

    @in_virtual_definition.setter
    def in_virtual_definition(self, value: bool) -> None:
        self._in_virtual_definition = value

    @property
    def variables(self) -> Dict[str, ASTNode]:
        return self._variables

    @property
    def context(self) -> Context:
        return self._context

    @property
    def returns(self) -> int:
        return self._returns

    def increment_returns(self) -> None:
        self._returns += 1
