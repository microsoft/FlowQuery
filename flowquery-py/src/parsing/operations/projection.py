"""Base class for projection operations."""

from typing import Generator, List, Tuple, Optional

from ..expressions.expression import Expression
from .operation import Operation


class Projection(Operation):
    """Base class for operations that project expressions."""

    def __init__(self, expressions: List[Expression]):
        super().__init__()
        self.children = expressions

    def expressions(self) -> Generator[Tuple[Expression, str], None, None]:
        """Yields tuples of (expression, alias) for all child expressions."""
        for i, child in enumerate(self.children):
            expression: Expression = child
            alias = expression.alias or f"expr{i}"
            yield (expression, alias)
