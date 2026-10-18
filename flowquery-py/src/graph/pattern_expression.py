"""Pattern expression for FlowQuery."""

from typing import TYPE_CHECKING, Any, Optional, Union

from ..parsing.ast_node import ASTNode
from .data_resolver import DataResolver
from .node import Node
from .node_reference import NodeReference
from .pattern import Pattern
from .relationship import Relationship

if TYPE_CHECKING:
    from .source_context import SourceContext


class PatternExpression(Pattern):
    """Represents a pattern expression that can be evaluated.

    PatternExpression is used in WHERE clauses to test whether a graph pattern
    exists. It evaluates to True if the pattern is matched, False otherwise.
    """

    def __init__(self) -> None:
        super().__init__()
        self._fetched: bool = False
        self._evaluation: bool = False
        self._fetched_context: Optional['SourceContext'] = None

    def add_element(self, element: Union[Node, Relationship]) -> None:
        super().add_element(element)

    def verify(self) -> None:
        if(len(self._chain) == 0):
            raise ValueError("PatternExpression cannot be empty")
        if not(any(isinstance(el, NodeReference) for el in self._chain if isinstance(el, ASTNode))):
            raise ValueError("PatternExpression must contain at least one NodeReference")

    @property
    def identifier(self) -> None:
        return None

    @identifier.setter
    def identifier(self, value: str) -> None:
        raise ValueError("Cannot set identifier on PatternExpression")

    async def fetch_data(self, ctx: Optional['SourceContext'] = None) -> None:
        """Fetches data for the pattern expression with caching."""
        context = ctx if ctx is not None else DataResolver.get_instance().source_context
        # Source-backed access is bound to one query's context.
        if self._fetched and (not self.deferred or self._fetched_context is context):
            return
        await super().fetch_data(context)
        self._fetched = True
        self._fetched_context = context

    async def evaluate(self) -> None:
        """Evaluates the pattern expression by traversing the graph.

        Sets _evaluation to True if the pattern is matched, False otherwise.
        """
        self._evaluation = False
        async for _ in self.start_node.next():
            self._evaluation = True

    def value(self) -> Any:
        """Returns the result of the pattern evaluation."""
        return self._evaluation

    def is_operand(self) -> bool:
        """PatternExpression is an operand in expressions."""
        return True
