"""Schema introspection function."""

from typing import Any, AsyncGenerator

from .async_function import AsyncFunction
from .function_metadata import FunctionDef


@FunctionDef({
    "description": (
        "Returns the graph schema listing all nodes and relationships "
        "with a sample of their data."
    ),
    "category": "async",
    "parameters": [],
    "output": {
        "description": "Schema entry with kind, label/type, and optional sample data",
        "type": "object",
    },
    "examples": [
        "CALL schema() YIELD kind, label, type, sample RETURN kind, label, type, sample",
    ],
})
class Schema(AsyncFunction):
    """Returns the graph schema of the database.

    Lists all nodes and relationships with their labels/types and a sample
    of their data (excluding id from nodes, left_id and right_id from relationships).
    """

    async def generate(self) -> AsyncGenerator[Any, None]:
        # Import at runtime to avoid circular dependency
        from ...graph.database import Database
        entries = await Database.get_instance().schema()
        for entry in entries:
            yield entry
