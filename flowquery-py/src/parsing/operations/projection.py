"""Base class for projection operations."""

from typing import Any, Generator, List, Tuple

from ..ast_node import ASTNode
from .operation import Operation


class Projection(Operation):
    """Base class for operations that project expressions."""

    def __init__(self, expressions: List[ASTNode]):
        super().__init__()
        self.children = expressions

    def expressions(self) -> Generator[Tuple[Any, str], None, None]:
        """Yields tuples of (expression, alias) for all child expressions."""
        for i, child in enumerate(self.children):
            expression = child
            alias = getattr(expression, 'alias', None) or f"expr{i}"
            yield (expression, alias)
