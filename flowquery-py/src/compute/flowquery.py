"""FlowQuery public API surface.

Extends Runner with extensibility features such as function listing
and plugin registration, keeping the Runner focused on execution.
"""

import warnings
from typing import Any, Dict, List, Optional, Set, Type

from ..parsing.functions.function import Function
from ..parsing.functions.function_factory import FunctionFactory
from ..parsing.functions.function_metadata import (
    FunctionMetadata,
    get_function_metadata,
)
from .runner import Runner

_warned: Set[str] = set()


def _deprecated(api: str) -> None:
    """Emit a deprecation warning once per process for `api`."""
    if api in _warned:
        return
    _warned.add(api)
    warnings.warn(
        f"FlowQuery: {api} is deprecated and will be removed in the next major release; "
        "define backend-aware sources with CREATE VIRTUAL ... WITH CAPABILITIES { ... } AS { ... } instead.",
        DeprecationWarning,
        stacklevel=3,
    )


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

    @staticmethod
    def register_node_source(label: str, provider: Any) -> None:
        """Register a backend-aware node source for ``label``.

        Replaces any existing virtual definition for the label.  The provider
        exposes ``capabilities`` and ``scan`` (and optionally ``lookup``).

        .. deprecated::
            Use ``CREATE VIRTUAL (:Label) WITH CAPABILITIES { ... } AS { ... }``
            over an async function instead.  Removed in the next major release.
        """
        from ..graph.database import Database

        _deprecated("FlowQuery.register_node_source")
        Database.get_instance().register_node_source(label, provider)

    @staticmethod
    def register_relationship_source(
        rel_type: str,
        source_label: Optional[str],
        target_label: Optional[str],
        provider: Any,
    ) -> None:
        """Register a backend-aware relationship source for
        ``(:source_label)-[:rel_type]->(:target_label)``.

        .. deprecated::
            Use ``CREATE VIRTUAL (:A)-[:TYPE]-(:B) WITH CAPABILITIES { ... } AS { ... }``
            instead.  Removed in the next major release.
        """
        from ..graph.database import Database

        _deprecated("FlowQuery.register_relationship_source")
        Database.get_instance().register_relationship_source(
            rel_type, source_label, target_label, provider
        )

    @staticmethod
    def set_node_source_capabilities(
        label: str, capabilities: Optional[Dict[str, Any]]
    ) -> None:
        """Opt a ``CREATE VIRTUAL (:label) AS { ... }`` definition into the
        source contract with explicit capabilities, or pass ``None`` to opt out.

        .. deprecated::
            Declare capabilities with ``WITH CAPABILITIES { ... }`` (or on the
            async function) instead.  Removed in the next major release.
        """
        from ..graph.database import Database

        _deprecated("FlowQuery.set_node_source_capabilities")
        Database.get_instance().set_node_source_capabilities(label, capabilities)

    @staticmethod
    def set_relationship_source_capabilities(
        rel_type: str,
        source_label: Optional[str],
        target_label: Optional[str],
        capabilities: Optional[Dict[str, Any]],
    ) -> None:
        """Relationship counterpart of :meth:`set_node_source_capabilities`.

        .. deprecated::
            Declare capabilities with ``WITH CAPABILITIES { ... }`` (or on the
            async function) instead.  Removed in the next major release.
        """
        from ..graph.database import Database

        _deprecated("FlowQuery.set_relationship_source_capabilities")
        Database.get_instance().set_relationship_source_capabilities(
            rel_type, source_label, target_label, capabilities
        )
