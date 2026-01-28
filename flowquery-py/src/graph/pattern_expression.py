"""Pattern expression for FlowQuery."""

from typing import Any

from ..parsing.ast_node import ASTNode
from .node_reference import NodeReference
from .pattern import Pattern


class PatternExpression(Pattern):
    """Represents a pattern expression that can be evaluated.
    
    PatternExpression is used in WHERE clauses to test whether a graph pattern
    exists. It evaluates to True if the pattern is matched, False otherwise.
    """

    def __init__(self):
        super().__init__()
        self._fetched: bool = False
        self._evaluation: bool = False

    def add_element(self, element) -> None:
        super().add_element(element)

    def verify(self) -> None:
        if(len(self._chain) == 0):
            raise ValueError("PatternExpression cannot be empty")
        if not(any(isinstance(el, NodeReference) for el in self._chain if isinstance(el, ASTNode))):
            raise ValueError("PatternExpression must contain at least one NodeReference")

    @property
    def identifier(self):
        return None

    @identifier.setter
    def identifier(self, value):
        raise ValueError("Cannot set identifier on PatternExpression")

    async def fetch_data(self) -> None:
        """Fetches data for the pattern expression with caching."""
        if self._fetched:
            return
        await super().fetch_data()
        self._fetched = True

    async def evaluate(self) -> None:
        """Evaluates the pattern expression by traversing the graph.
        
        Sets _evaluation to True if the pattern is matched, False otherwise.
        """
        self._evaluation = False
        
        async def set_evaluation_true():
            self._evaluation = True
        
        self.end_node.todo_next = set_evaluation_true
        await self.start_node.next()

    def value(self) -> bool:
        """Returns the result of the pattern evaluation."""
        return self._evaluation

    def is_operand(self) -> bool:
        """PatternExpression is an operand in expressions."""
        return True
