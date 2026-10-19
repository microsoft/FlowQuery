"""Built-in ``memorygraph``: an in-memory graph store for ``USE GRAPH``."""

from dataclasses import dataclass, field
from typing import Any, AsyncGenerator, Dict, Optional

from ...graph.memory_graph_store import MemoryGraphStore
from ...graph.source_provider import PREDICATE_OPERATORS
from .async_function import AsyncFunction
from .function_metadata import FunctionDef


@dataclass
class _Transaction:
    """One query's view of a named store: a snapshot, plus a private copy once it writes."""

    base: MemoryGraphStore
    copy: Optional[MemoryGraphStore] = None


@dataclass
class _QuerySnapshot:
    transactions: Dict[str, _Transaction] = field(default_factory=dict)


@FunctionDef({
    "description": (
        "Built-in in-memory graph store. Bind it as the default graph with "
        "USE GRAPH memorygraph($request); memorygraph($request, 'name') uses a separate named store."
    ),
    "category": "async",
    "parameters": [
        {"name": "request", "description": "The backend request ($request)", "type": "object"},
        {
            "name": "store",
            "description": "Name of the store (default 'default')",
            "type": "string",
            "required": False,
        },
    ],
    "output": {"description": "Graph rows or write results", "type": "object"},
    "examples": ["USE GRAPH memorygraph($request)", "USE GRAPH memorygraph($request, 'scratch')"],
})
class MemoryGraph(AsyncFunction):
    """Built-in in-memory graph store and adapter.

    Bind it as the default graph to create, merge, match, update and delete
    arbitrary nodes and relationships without any other setup::

        USE GRAPH memorygraph($request)

    ``memorygraph($request, 'name')`` selects a separate named store (the
    default store is ``'default'``).  Stores live in the process for as
    long as it runs; they are not persisted.

    Each query reads one consistent snapshot and writes to a private copy
    (``transactions: true``), so it reads its own writes and its changes
    become visible to other queries when it commits.  A commit fails when
    another query committed to the same store in the meantime.
    """

    capabilities: Any = {
        "lookup": True,
        "expand": True,
        "streaming": True,
        "cacheable": True,
        "predicates": {"operators": list(PREDICATE_OPERATORS), "stringOrdering": "binary"},
        "writes": True,
        "transactions": True,
    }
    _stores: Dict[str, MemoryGraphStore] = {}

    @staticmethod
    def store(name: str = "default") -> MemoryGraphStore:
        """The committed state of a named store (created empty on first use)."""
        found = MemoryGraph._stores.get(name)
        if found is None:
            found = MemoryGraphStore()
            MemoryGraph._stores[name] = found
        return found

    @staticmethod
    def clear(name: Optional[str] = None) -> None:
        """Discard a named store, or every store when no name is given."""
        if name is None:
            MemoryGraph._stores.clear()
        else:
            MemoryGraph._stores.pop(name, None)

    @staticmethod
    def open_read_context() -> _QuerySnapshot:
        return _QuerySnapshot()

    def __init__(self, name: str = "memorygraph") -> None:
        super().__init__(name)

    def _transaction(self, name: str) -> Optional[_Transaction]:
        context = self.context
        snapshot = context.snapshot if context is not None else None
        if not isinstance(snapshot, _QuerySnapshot):
            return None
        tx = snapshot.transactions.get(name)
        if tx is None:
            tx = _Transaction(base=MemoryGraph.store(name))
            snapshot.transactions[name] = tx
        return tx

    async def generate(self, request: Any = None, name: Any = "default") -> AsyncGenerator[Any, None]:
        if not isinstance(request, dict) or request.get("graph") is not True:
            raise ValueError(
                "memorygraph serves the default graph: bind it with USE GRAPH memorygraph($request)"
            )
        store_name = str(name if name is not None else "default")
        tx = self._transaction(store_name)
        operation = request.get("operation")
        if operation == "write":
            if tx is None:
                next_store = MemoryGraph.store(store_name).clone()
                outcome = next_store.apply(request.get("changes") or [])
                MemoryGraph._stores[store_name] = next_store
                yield outcome
                return
            if tx.copy is None:
                tx.copy = tx.base.clone()
            yield tx.copy.apply(request.get("changes") or [])
            return
        if operation == "commit":
            if tx is not None and tx.copy is not None:
                if MemoryGraph._stores.get(store_name) is not tx.base:
                    raise ValueError(
                        f"memorygraph store '{store_name}' was changed by another query; "
                        "retry the query"
                    )
                MemoryGraph._stores[store_name] = tx.copy
                tx.base = tx.copy
                tx.copy = None
            yield {}
            return
        if operation == "rollback":
            if tx is not None:
                tx.copy = None
            yield {}
            return
        if tx is not None:
            store = tx.copy if tx.copy is not None else tx.base
        else:
            store = MemoryGraph.store(store_name)
        for row in store.read(request):
            yield row
