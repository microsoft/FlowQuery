"""The backend function of a statement-backed virtual definition."""

from __future__ import annotations

import inspect
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from ..ast_node import ASTNode
from ..expressions.parameter_reference import ParameterReference
from ..functions.async_function import AsyncFunction
from .load import Load


@dataclass
class DefinitionBackend:
    """The single ``LOAD ... FROM fn($request)`` of a definition body."""

    #: The async function node in the definition body.
    func: AsyncFunction
    #: Its class; carries the declared ``capabilities`` and read-context hooks.
    function_class: Any
    #: The function name as written in the query.
    name: str
    #: Position of the argument that passes ``$request``.
    request_index: int


def _collect_loads(node: ASTNode, out: List[Load]) -> None:
    if isinstance(node, Load):
        out.append(node)
    for child in node.get_children():
        _collect_loads(child, out)


def _references_request(node: ASTNode) -> bool:
    if isinstance(node, ParameterReference) and node.name == "$request":
        return True
    return any(_references_request(child) for child in node.get_children())


def definition_backend(statement: Optional[ASTNode]) -> Optional[DefinitionBackend]:
    """Find the definition's backend function, or ``None`` unless the body
    has exactly one ``LOAD`` and it loads from an async function called
    with ``$request``."""
    if statement is None:
        return None
    loads: List[Load] = []
    _collect_loads(statement, loads)
    if len(loads) != 1:
        return None
    func = loads[0].async_function
    if func is None:
        return None
    request_index = next(
        (i for i, child in enumerate(func.get_children()) if _references_request(child)), -1
    )
    if request_index < 0:
        return None
    return DefinitionBackend(func, type(func), func.name, request_index)


async def declared_capabilities(
    backend: Optional[DefinitionBackend], request: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """Source capabilities declared by the backend function: its
    ``capabilities`` class attribute, or the result of calling a
    ``capabilities(request)`` static/class method with
    ``{"operation": "capabilities", "label": ...}`` (nodes) or
    ``{"operation": "capabilities", "type", "sourceLabel", "targetLabel"}``
    (relationships).  ``None`` when nothing is declared."""
    if backend is None:
        return None
    declared = getattr(backend.function_class, "capabilities", None)
    if declared is None:
        return None
    value: Any = declared
    if callable(declared):
        value = declared({"version": 1, **request})
        if inspect.isawaitable(value):
            value = await value
    if value is None:
        return None
    if not isinstance(value, dict):
        raise ValueError(f"Function {backend.name}: declared capabilities must be an object")
    return value
