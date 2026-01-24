"""Base class for all functions in FlowQuery."""

from typing import List, Optional, Any

from ..ast_node import ASTNode


class Function(ASTNode):
    """Base class for all functions in FlowQuery.
    
    Functions can have parameters and may support the DISTINCT modifier.
    Subclasses implement specific function logic.
    
    Example:
        func = FunctionFactory.create("sum")
        func.parameters = [expression1, expression2]
    """

    def __init__(self, name: Optional[str] = None):
        """Creates a new Function with the given name.
        
        Args:
            name: The function name
        """
        super().__init__()
        self._name = name or self.__class__.__name__
        self._expected_parameter_count: Optional[int] = None
        self._supports_distinct: bool = False

    @property
    def parameters(self) -> List[ASTNode]:
        """Gets the function parameters."""
        return self.children

    @parameters.setter
    def parameters(self, nodes: List[ASTNode]) -> None:
        """Sets the function parameters.
        
        Args:
            nodes: Array of AST nodes representing the function arguments
            
        Raises:
            ValueError: If the number of parameters doesn't match expected count
        """
        if self._expected_parameter_count is not None and self._expected_parameter_count != len(nodes):
            raise ValueError(
                f"Function {self._name} expected {self._expected_parameter_count} parameters, "
                f"but got {len(nodes)}"
            )
        self.children = nodes

    @property
    def name(self) -> str:
        return self._name

    def __str__(self) -> str:
        return f"Function ({self._name})"

    @property
    def distinct(self) -> bool:
        return self._supports_distinct

    @distinct.setter
    def distinct(self, value: bool) -> None:
        if self._supports_distinct:
            self._supports_distinct = value
        else:
            raise ValueError(f"Function {self._name} does not support distinct")
