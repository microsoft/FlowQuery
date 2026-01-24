"""Represents a WHERE operation that filters data based on a condition."""

from typing import Any

from ..expressions.expression import Expression
from .operation import Operation


class Where(Operation):
    """Represents a WHERE operation that filters data based on a condition.
    
    The WHERE operation evaluates a boolean expression and only continues
    execution to the next operation if the condition is true.
    
    Example:
        # RETURN x WHERE x > 0
    """

    def __init__(self, expression: Expression):
        """Creates a new WHERE operation with the given condition.
        
        Args:
            expression: The boolean expression to evaluate
        """
        super().__init__()
        self.add_child(expression)

    @property
    def expression(self) -> Expression:
        return self.children[0]

    async def run(self) -> None:
        for pattern in self.expression.patterns():
            await pattern.fetch_data()
            await pattern.evaluate()
        if self.expression.value():
            if self.next:
                await self.next.run()

    def value(self) -> Any:
        return self.expression.value()
