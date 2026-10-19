"""Graphs of the FlowQuery registry (``USE GRAPH [name =] fn($request)``)."""

from __future__ import annotations

from typing import Any, AsyncGenerator, Dict, List, Optional

from ..parsing.functions.function_factory import FunctionFactory
from .database import Database
from .graph_records import DEFAULT_GRAPH, graph_node_record, graph_relationship_record
from .source_context import context_of
from .source_provider import (
    SourceResponseError,
    SourceRow,
    normalize_capabilities,
    validate_node_provider,
    validate_relationship_provider,
)
from .write_set import WriteBackend


class _GraphNodeProvider:
    def __init__(self, graph: "DefaultGraph", capabilities: Dict[str, Any]) -> None:
        self._graph = graph
        self.capabilities = capabilities

    def scan(self, request: Dict[str, Any], context: Any) -> Any:
        return self._graph._read(request, context, "node")

    def lookup(self, request: Dict[str, Any], context: Any) -> Any:
        return self._graph._read(request, context, "node")


class _GraphRelationshipProvider:
    def __init__(self, graph: "DefaultGraph", capabilities: Dict[str, Any]) -> None:
        self._graph = graph
        self.capabilities = capabilities

    def scan(self, request: Dict[str, Any], context: Any) -> Any:
        return self._graph._read(request, context, "relationship")

    def expand(self, request: Dict[str, Any], context: Any) -> Any:
        return self._graph._read(request, context, "relationship")


class DefaultGraph:
    """A graph of the FlowQuery registry, bound with ``USE GRAPH fn($request)``
    (the default graph) or ``USE GRAPH name = fn($request)`` (a named graph).

    Labels and relationship types without a ``CREATE VIRTUAL`` definition
    are read from, and written to, the default graph; labels qualified
    with a graph name (``(:hr.Person)``) address that graph.  Every request
    is the usual versioned source/write request with ``graph: true`` added
    (and ``graphName`` for named graphs); read requests may carry
    ``label: None`` (any node) or ``type: None`` (any relationship), and the
    function answers with graph rows that keep metadata and user
    properties apart:

    - nodes: ``{id, labels: [...], properties: {...}}``
    - relationships: ``{id, type, left_id, right_id, properties: {...}}``,
      plus ``left_graph`` / ``right_graph`` when an endpoint belongs to
      another graph (or ``"virtual"``: a definition node)

    Capabilities are those the function declares (``capabilities``, or a
    ``capabilities(request)`` static method called once with
    ``{version: 1, operation: "capabilities", graph: True}``).
    """

    def __init__(
        self,
        name: str,
        function_class: Any,
        request_index: int,
        args: List[Any],
        declared: Optional[Dict[str, Any]],
        graph_name: str = DEFAULT_GRAPH,
    ) -> None:
        self.name = name
        #: Name the graph is bound under (``"default"`` for the default graph).
        self.graph_name = graph_name
        self.function_class = function_class
        self.request_index = request_index
        self.args = args
        node_caps: Dict[str, Any] = normalize_capabilities(dict(declared or {}), "node")
        rel_caps: Dict[str, Any] = normalize_capabilities(dict(declared or {}), "relationship")
        self.capabilities: Dict[str, Any] = dict(node_caps)
        if rel_caps.get("expand") is not None:
            self.capabilities["expand"] = rel_caps["expand"]
        self.node_provider = _GraphNodeProvider(self, node_caps)
        self.relationship_provider = _GraphRelationshipProvider(self, rel_caps)
        validate_node_provider(self.node_provider, self.description)
        validate_relationship_provider(self.relationship_provider, self.description)

    @property
    def is_default(self) -> bool:
        return self.graph_name == DEFAULT_GRAPH

    @property
    def description(self) -> str:
        return (
            f"default graph {self.name}"
            if self.is_default
            else f"graph {self.graph_name} ({self.name})"
        )

    @property
    def writable(self) -> bool:
        return self.node_provider.capabilities.get("writes") is True

    @property
    def transactional(self) -> bool:
        return self.node_provider.capabilities.get("transactions") is True

    @property
    def write_backend(self) -> WriteBackend:
        return WriteBackend(
            name=self.name,
            function_class=self.function_class,
            request_index=self.request_index,
            args=self.args,
            graph=True,
            graph_name=self.graph_name,
        )

    def tag(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """The request envelope additions identifying this graph."""
        if self.is_default:
            return {**request, "graph": True}
        return {**request, "graph": True, "graphName": self.graph_name}

    async def _read(
        self, request: Dict[str, Any], context: Any, kind: str
    ) -> AsyncGenerator[List[SourceRow], None]:
        fn = FunctionFactory.create_async(self.name)
        fn.source_context = context_of(context)
        await fn.prepare_context()
        args = list(self.args)
        args[self.request_index] = self.tag(request)
        page_size = max(1, request.get("pageSize") or 256)
        page: List[SourceRow] = []
        generator = fn.generate(*args)
        try:
            async for item in generator:
                row = (
                    self._node_row(item, request)
                    if kind == "node"
                    else self._relationship_row(item, request)
                )
                if row is None:
                    continue
                page.append(row)
                if len(page) >= page_size:
                    yield page
                    page = []
        finally:
            aclose = getattr(generator, "aclose", None)
            if aclose is not None:
                await aclose()
        if len(page) > 0:
            yield page

    def _invalid(self, request: Dict[str, Any], what: str) -> SourceResponseError:
        operation = request.get("operation")
        return SourceResponseError(
            f"Source {self.description}: {operation}() returned {what}",
            self.description,
            operation or "",
        )

    def _properties(self, row: Dict[str, Any], request: Dict[str, Any]) -> Dict[str, Any]:
        properties = row.get("properties")
        if properties is None:
            properties = {}
        if not isinstance(properties, dict):
            raise self._invalid(request, "a row whose properties is not a map")
        return properties

    def _node_row(self, row: Any, request: Dict[str, Any]) -> Optional[SourceRow]:
        """Validate a node row and convert it, or None when it is not part of the answer."""
        if not isinstance(row, dict):
            raise self._invalid(request, "a row that is not an object")
        if row.get("id") is None:
            raise self._invalid(request, "a node row without id")
        labels = row.get("labels")
        if labels is None:
            labels = []
        if not isinstance(labels, list) or any(not isinstance(lbl, str) for lbl in labels):
            raise self._invalid(request, "a node row whose labels is not a list of strings")
        properties = self._properties(row, request)
        wanted = request.get("labels")
        if wanted is None:
            wanted = [request["label"]] if request.get("label") is not None else []
        if not all(label in labels for label in wanted):
            return None
        # Labels with a CREATE VIRTUAL definition are served by that
        # definition only, so the default graph never bypasses it.  Named
        # graphs are separate namespaces and are not shadowed.
        if self.is_default:
            defined = Database.get_instance().nodes
            if any(label in defined for label in labels):
                return None
        return graph_node_record(row["id"], labels, properties, self.graph_name)

    def _relationship_row(self, row: Any, request: Dict[str, Any]) -> Optional[SourceRow]:
        if not isinstance(row, dict):
            raise self._invalid(request, "a row that is not an object")
        if row.get("id") is None:
            raise self._invalid(request, "a relationship row without id")
        if not isinstance(row.get("type"), str):
            raise self._invalid(request, "a relationship row without type")
        if "left_id" not in row or "right_id" not in row:
            raise self._invalid(request, "a relationship row without left_id/right_id")
        properties = self._properties(row, request)
        left_graph = self._endpoint_graph(row.get("left_graph"), request)
        right_graph = self._endpoint_graph(row.get("right_graph"), request)
        if request.get("type") is not None and row["type"] != request["type"]:
            return None
        if self.is_default and row["type"] in Database.get_instance().relationships:
            return None
        return graph_relationship_record(
            row["id"],
            row["type"],
            row["left_id"],
            row["right_id"],
            properties,
            self.graph_name,
            left_graph,
            right_graph,
        )

    def _endpoint_graph(self, value: Any, request: Dict[str, Any]) -> str:
        """Namespace of a relationship endpoint (``left_graph`` / ``right_graph``, else this graph)."""
        if value is None:
            return self.graph_name
        if not isinstance(value, str):
            raise self._invalid(
                request, "a relationship row whose left_graph/right_graph is not a string"
            )
        return value
