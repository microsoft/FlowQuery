"""Represents an async data provider function call for use in LOAD operations."""

from typing import Any, AsyncGenerator, List

from ..ast_node import ASTNode
from .function import Function


class AsyncFunction(Function):
    """Represents an async data provider function call for use in LOAD operations.
    
    This class holds the function name and arguments, and provides async iteration
    over the results from a registered async data provider.
    
    Example:
        # Used in: LOAD JSON FROM myDataSource('arg1', 'arg2') AS data
        async_func = AsyncFunction("myDataSource")
        async_func.parameters = [arg1_node, arg2_node]
        async for item in async_func.execute():
            print(item)
    """

    @property
    def parameters(self) -> List[ASTNode]:
        return self.children

    @parameters.setter
    def parameters(self, nodes: List[ASTNode]) -> None:
        """Sets the function parameters.
        
        Args:
            nodes: Array of AST nodes representing the function arguments
        """
        self.children = nodes

    def get_arguments(self) -> List[Any]:
        """Evaluates all parameters and returns their values.
        Used by the framework to pass arguments to generate().
        
        Returns:
            Array of parameter values
        """
        return [child.value() for child in self.children]

    async def generate(self, *args: Any) -> AsyncGenerator[Any, None]:
        """Generates the async data provider function results.
        
        Subclasses override this method with their own typed parameters.
        The framework automatically evaluates the AST children and spreads
        them as arguments when calling this method.
        
        Args:
            args: Arguments passed from the query (e.g., myFunc(arg1, arg2))
            
        Yields:
            Data items from the async provider
            
        Raises:
            NotImplementedError: If the function is not registered as an async provider
        """
        raise NotImplementedError("generate method must be overridden in subclasses.")
        yield  # Make this a generator
