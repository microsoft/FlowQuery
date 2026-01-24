"""Value holder node for FlowQuery AST."""

from typing import Any

from ..ast_node import ASTNode


class ValueHolder(ASTNode):
    """Holds a value that can be set and retrieved."""

    def __init__(self):
        super().__init__()
        self._holder: Any = None

    @property
    def holder(self) -> Any:
        return self._holder

    @holder.setter
    def holder(self, value: Any) -> None:
        self._holder = value

    def value(self) -> Any:
        return self._holder
