"""Base class for aggregate functions that reduce multiple values to a single value."""

from typing import Any, Optional

from .function import Function
from .reducer_element import ReducerElement


class AggregateFunction(Function):
    """Base class for aggregate functions that reduce multiple values to a single value.
    
    Aggregate functions like SUM, AVG, and COLLECT process multiple input values
    and produce a single output. They cannot be nested within other aggregate functions.
    
    Example:
        sum_func = Sum()
        # Used in: RETURN SUM(values)
    """

    def __init__(self, name: Optional[str] = None):
        """Creates a new AggregateFunction with the given name.
        
        Args:
            name: The function name
        """
        super().__init__(name)
        self._overridden: Any = None

    def reduce(self, value: ReducerElement) -> None:
        """Processes a value during the aggregation phase.
        
        Args:
            value: The element to aggregate
            
        Raises:
            NotImplementedError: If not implemented by subclass
        """
        raise NotImplementedError("Method not implemented.")

    def element(self) -> ReducerElement:
        """Creates a reducer element for this aggregate function.
        
        Returns:
            A ReducerElement instance
            
        Raises:
            NotImplementedError: If not implemented by subclass
        """
        raise NotImplementedError("Method not implemented.")

    @property
    def overridden(self) -> Any:
        return self._overridden

    @overridden.setter
    def overridden(self, value: Any) -> None:
        self._overridden = value

    def value(self) -> Any:
        return self._overridden
