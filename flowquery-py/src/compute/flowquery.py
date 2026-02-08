"""FlowQuery public API surface.

Extends Runner with extensibility features such as function listing
and plugin registration, keeping the Runner focused on execution.
"""

from typing import List, Optional, Type

from ..parsing.functions.function import Function
from ..parsing.functions.function_factory import FunctionFactory
from ..parsing.functions.function_metadata import (
    FunctionMetadata,
    get_function_metadata,
)
from .runner import Runner


class FlowQuery(Runner):
    """FlowQuery is the public API surface for the FlowQuery library.

    It extends Runner with convenience class methods for function
    introspection and plugin registration.

    Example:
        fq = FlowQuery("WITH 1 as x RETURN x")
        await fq.run()
        print(fq.results)  # [{'x': 1}]

        # List all registered functions
        functions = FlowQuery.list_functions()
    """

    #: Base Function class for creating custom plugin functions.
    Function: Type[Function] = Function

    @staticmethod
    def list_functions(
        category: Optional[str] = None,
        async_only: bool = False,
        sync_only: bool = False,
    ) -> List[FunctionMetadata]:
        """List all registered functions with their metadata.

        Args:
            category: Optional category filter
            async_only: If True, return only async functions
            sync_only: If True, return only sync functions

        Returns:
            List of function metadata
        """
        return FunctionFactory.list_functions(
            category=category,
            async_only=async_only,
            sync_only=sync_only,
        )

    @staticmethod
    def get_function_metadata(name: str) -> Optional[FunctionMetadata]:
        """Get metadata for a specific function.

        Args:
            name: The function name

        Returns:
            Function metadata or None
        """
        return get_function_metadata(name.lower())
