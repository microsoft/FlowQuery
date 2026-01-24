"""Factory for creating function instances by name."""

from typing import Any, Callable, Dict, List, Optional

from .function import Function
from .async_function import AsyncFunction
from .predicate_function import PredicateFunction
from .function_metadata import (
    FunctionMetadata,
    get_function_metadata,
    get_registered_function_factory,
    get_registered_function_metadata,
)


class FunctionFactory:
    """Factory for creating function instances by name.
    
    All functions are registered via the @FunctionDef decorator.
    Maps function names (case-insensitive) to their corresponding implementation classes.
    Supports built-in functions like sum, avg, collect, range, split, join, etc.
    
    Example:
        sum_func = FunctionFactory.create("sum")
        avg_func = FunctionFactory.create("AVG")
    """

    @staticmethod
    def get_async_provider(name: str) -> Optional[Callable]:
        """Gets an async data provider by name.
        
        Args:
            name: The function name (case-insensitive)
            
        Returns:
            The async data provider, or None if not found
        """
        return get_registered_function_factory(name.lower())

    @staticmethod
    def is_async_provider(name: str) -> bool:
        """Checks if a function name is registered as an async data provider.
        
        Args:
            name: The function name (case-insensitive)
            
        Returns:
            True if the function is an async data provider
        """
        return get_registered_function_factory(name.lower(), "async") is not None

    @staticmethod
    def get_metadata(name: str) -> Optional[FunctionMetadata]:
        """Gets metadata for a specific function.
        
        Args:
            name: The function name (case-insensitive)
            
        Returns:
            The function metadata, or None if not found
        """
        return get_function_metadata(name.lower())

    @staticmethod
    def list_functions(
        category: Optional[str] = None,
        async_only: bool = False,
        sync_only: bool = False
    ) -> List[FunctionMetadata]:
        """Lists all registered functions with their metadata.
        
        Args:
            category: Optional category filter
            async_only: If True, only return async functions
            sync_only: If True, only return sync functions
            
        Returns:
            Array of function metadata
        """
        result: List[FunctionMetadata] = []
        
        for meta in get_registered_function_metadata():
            if category and meta.category != category:
                continue
            if async_only and meta.category != "async":
                continue
            if sync_only and meta.category == "async":
                continue
            result.append(meta)
        
        return result

    @staticmethod
    def list_function_names() -> List[str]:
        """Lists all registered function names.
        
        Returns:
            Array of function names
        """
        return [m.name for m in get_registered_function_metadata()]

    @staticmethod
    def to_json() -> Dict[str, Any]:
        """Gets all function metadata as a JSON-serializable object for LLM consumption.
        
        Returns:
            Object with functions grouped by category
        """
        functions = FunctionFactory.list_functions()
        categories = list(set(f.category for f in functions if f.category))
        return {"functions": functions, "categories": categories}

    @staticmethod
    def create(name: str) -> Function:
        """Creates a function instance by name.
        
        Args:
            name: The function name (case-insensitive)
            
        Returns:
            A Function instance of the appropriate type
            
        Raises:
            ValueError: If the function name is not registered
        """
        lower_name = name.lower()
        
        # Check decorator-registered functions
        decorator_factory = get_registered_function_factory(lower_name)
        if decorator_factory:
            return decorator_factory()
        
        raise ValueError(f"Unknown function: {name}")

    @staticmethod
    def create_predicate(name: str) -> PredicateFunction:
        """Creates a predicate function instance by name.
        
        Args:
            name: The function name (case-insensitive)
            
        Returns:
            A PredicateFunction instance of the appropriate type
            
        Raises:
            ValueError: If the predicate function name is not registered
        """
        lower_name = name.lower()
        
        decorator_factory = get_registered_function_factory(lower_name, "predicate")
        if decorator_factory:
            return decorator_factory()
        
        raise ValueError(f"Unknown predicate function: {name}")

    @staticmethod
    def create_async(name: str) -> AsyncFunction:
        """Creates an async function instance by name.
        
        Args:
            name: The function name (case-insensitive)
            
        Returns:
            An AsyncFunction instance of the appropriate type
            
        Raises:
            ValueError: If the async function name is not registered
        """
        lower_name = name.lower()
        decorator_factory = get_registered_function_factory(lower_name, "async")
        if decorator_factory:
            return decorator_factory()
        raise ValueError(f"Unknown async function: {name}")
