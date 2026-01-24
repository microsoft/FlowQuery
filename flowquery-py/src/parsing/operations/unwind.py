"""Represents an UNWIND operation that iterates over arrays."""

from typing import Any

from ..expressions.expression import Expression
from .operation import Operation


class Unwind(Operation):
    """Represents an UNWIND operation that iterates over an array expression."""

    def __init__(self, expression: Expression):
        super().__init__()
        self._value: Any = None
        self.add_child(expression)

    @property
    def expression(self) -> Expression:
        return self.children[0]

    @property
    def as_(self) -> str:
        return self.children[1].value()

    async def run(self) -> None:
        expression_value = self.expression.value()
        if not isinstance(expression_value, list):
            raise ValueError("Expected array")
        for item in expression_value:
            self._value = item
            if self.next:
                await self.next.run()
        if self.next:
            self.next.reset()

    def value(self) -> Any:
        return self._value
