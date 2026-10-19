"""Declarative write clauses (``CREATE`` / ``MERGE`` / ``SET`` / ``REMOVE`` /
``[DETACH] DELETE``) against statement-backed definitions.

Each clause records changes in the query's
:class:`~flowquery.graph.write_set.WriteSet`; the runner sends the whole
change set to the definitions' backend function when the query succeeds.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Tuple, Union

from ...graph.database import Database
from ...graph.node import Node
from ...graph.node_reference import NodeReference
from ...graph.pattern import Pattern
from ...graph.relationship import Relationship
from ...graph.source_provider import QueryCancelledError, SourceError
from ...graph.write_set import (
    WRITE_CONTRACT_VERSION,
    WriteBackend,
    WriteChange,
    WriteResult,
    WriteSet,
)
from ..ast_node import ASTNode
from ..expressions.expression import Expression
from ..functions.function_factory import FunctionFactory
from .definition_backend import definition_backend
from .operation import Operation

if TYPE_CHECKING:
    from ...graph.source_context import SourceContext


@dataclass
class WriteTarget:
    """A label (``kind == "node"``) or relationship type a write clause changes."""

    kind: str
    label: Optional[str] = None
    type: Optional[str] = None
    source_label: Optional[str] = None
    target_label: Optional[str] = None


@dataclass
class SetItem:
    """One item of ``SET``, ``REMOVE`` or ``ON CREATE`` / ``ON MATCH SET``.

    ``kind`` is ``"property"`` (``n.p = v``), ``"merge"`` (``n += map``),
    ``"addLabels"`` (``n:Label``), ``"removeProperty"`` (``REMOVE n.p``) or
    ``"removeLabels"`` (``REMOVE n:Label``).
    """

    kind: str
    element: Union[Node, Relationship]
    property: Optional[str] = None
    expression: Optional[Expression] = None
    labels: List[str] = field(default_factory=list)


def _item_expressions(items: List[SetItem]) -> List[ASTNode]:
    return [
        item.expression
        for item in items
        if item.kind in ("property", "merge") and item.expression is not None
    ]


def label_of(node: Optional[Node]) -> Optional[str]:
    """Static label of a node pattern element (following references)."""
    if node is None:
        return None
    if node.label is not None:
        return node.label
    if isinstance(node, NodeReference) and isinstance(node.reference, Node):
        return label_of(node.reference)
    return None


def _endpoints(rel: Relationship) -> Tuple[Optional[Node], Optional[Node]]:
    """Stored (left, right) endpoints of a pattern relationship."""
    if rel.direction == "left":
        return rel.target, rel.source
    return rel.source, rel.target


def _node_target_of(node: Node) -> WriteTarget:
    return WriteTarget(kind="node", label=label_of(node))


def _relationship_target_of(rel: Relationship) -> WriteTarget:
    start, end = _endpoints(rel)
    return WriteTarget(
        kind="relationship",
        type=rel.type,
        source_label=label_of(start),
        target_label=label_of(end),
    )


def _evaluate(properties: Dict[str, Any]) -> Dict[str, Any]:
    return {key: expression.value() for key, expression in properties.items()}


def _node_value(node: Node) -> Optional[Dict[str, Any]]:
    """Current value of a node variable: the bound record, following references."""
    if isinstance(node, NodeReference):
        reference = node.reference
        value = reference.value() if reference is not None else None
    else:
        value = node.value()
    return value if isinstance(value, dict) else None


def _relationship_target(rel: Relationship) -> Any:
    """Identity of the relationship bound to ``rel`` in the current row."""
    if rel.created_record is not None:
        return rel.created_record.get("id")
    record = rel.current_record(0)
    if record is None:
        return None
    if record.get("id") is not None:
        return record["id"]
    return {"left_id": record.get("left_id"), "right_id": record.get("right_id")}


def _update_node_value(node: Node, properties: Dict[str, Any]) -> None:
    """Rebind a node variable to a copy of its value with ``properties`` applied."""
    value = _node_value(node)
    if value is None:
        return
    updated = dict(value)
    for key, item in properties.items():
        if item is None:
            updated.pop(key, None)
        else:
            updated[key] = item
    node.set_value(updated)


def _update_relationship_value(rel: Relationship, properties: Dict[str, Any]) -> None:
    value = rel.value()
    if value is None or isinstance(value, list):
        return
    updated: Dict[str, Any] = {**value, "properties": dict(value.get("properties") or {})}
    for key, item in properties.items():
        if item is None:
            updated.pop(key, None)
            updated["properties"].pop(key, None)
        else:
            updated[key] = item
            updated["properties"][key] = item
    rel.override_value(updated)


def _map_value(expression: Optional[Expression]) -> Dict[str, Any]:
    value = expression.value() if expression is not None else None
    return dict(value) if isinstance(value, dict) else {}


def _bind_relationship(
    rel: Relationship,
    ref: str,
    start: Dict[str, Any],
    end: Dict[str, Any],
    properties: Dict[str, Any],
) -> None:
    rel.created_record = {
        "id": ref,
        "left_id": start.get("id"),
        "right_id": end.get("id"),
        **properties,
    }
    rel.override_value({
        **properties,
        "id": ref,
        "type": rel.type,
        "startNode": start,
        "endNode": end,
        "properties": dict(properties),
    })


class WriteOperation(Operation):
    """Base class of the declarative write clauses.  Each run records
    changes in the query's :class:`WriteSet` and continues with the same row."""

    def __init__(self) -> None:
        super().__init__()
        self._context: Optional["SourceContext"] = None

    @property
    def source_context(self) -> Optional["SourceContext"]:
        """Query context assigned by the runner (internal)."""
        return self._context

    @source_context.setter
    def source_context(self, ctx: Optional["SourceContext"]) -> None:
        self._context = ctx

    @property
    def targets(self) -> List[WriteTarget]:
        """Labels and relationship types this clause writes to."""
        raise NotImplementedError("targets must be overridden in subclasses")

    @property
    def evaluated(self) -> List[ASTNode]:
        """Patterns and expressions evaluated by this clause (held off-tree; internal)."""
        return []

    def _apply(self, writes: WriteSet) -> None:
        raise NotImplementedError("_apply must be overridden in subclasses")

    @property
    def _writes(self) -> WriteSet:
        if self._context is None:
            raise ValueError("Write clauses are only allowed in top-level queries")
        if self._context.writes is None:
            self._context.writes = WriteSet()
        return self._context.writes

    async def run(self) -> None:
        if self._context is not None:
            self._context.throw_if_cancelled()
        self._apply(self._writes)
        if self.next:
            await self.next.run()

    @property
    def results(self) -> List[Dict[str, Any]]:
        return []

    @staticmethod
    def collect(first: Optional[Operation]) -> List["WriteOperation"]:
        """Write clauses of a statement's operation chain."""
        out: List[WriteOperation] = []
        op = first
        while op is not None:
            if isinstance(op, WriteOperation):
                out.append(op)
            op = op.next
        return out

    def _apply_items(self, items: List[SetItem], writes: WriteSet) -> None:
        for item in items:
            element = item.element
            properties: Dict[str, Any]
            if isinstance(element, Relationship):
                target = _relationship_target(element)
                if target is None:
                    continue
                if item.kind == "property":
                    assert item.property is not None and item.expression is not None
                    properties = {item.property: item.expression.value()}
                elif item.kind == "merge":
                    properties = _map_value(item.expression)
                elif item.kind == "removeProperty":
                    assert item.property is not None
                    properties = {item.property: None}
                else:
                    raise ValueError("Relationships have no labels")
                writes.add({
                    "op": "setProperties",
                    "target": target,
                    "type": element.type,
                    "properties": properties,
                })
                _update_relationship_value(element, properties)
                continue
            value = _node_value(element)
            if value is None:
                continue
            label = label_of(element)
            if item.kind in ("property", "merge", "removeProperty"):
                if item.kind == "property":
                    assert item.property is not None and item.expression is not None
                    properties = {item.property: item.expression.value()}
                elif item.kind == "merge":
                    properties = _map_value(item.expression)
                else:
                    assert item.property is not None
                    properties = {item.property: None}
                writes.add({
                    "op": "setProperties",
                    "target": value.get("id"),
                    "label": label,
                    "properties": properties,
                })
                _update_node_value(element, properties)
            elif item.kind in ("addLabels", "removeLabels"):
                writes.add({
                    "op": item.kind,
                    "target": value.get("id"),
                    "label": label,
                    "labels": list(item.labels),
                })


class CreateWrite(WriteOperation):
    """``CREATE (n:Label {...})``, ``CREATE (a)-[:TYPE {...}]->(b)``, comma-separated."""

    def __init__(self, patterns: List[Pattern]) -> None:
        super().__init__()
        self._patterns = patterns

    @property
    def patterns(self) -> List[Pattern]:
        return self._patterns

    @property
    def evaluated(self) -> List[ASTNode]:
        return list(self._patterns)

    @property
    def targets(self) -> List[WriteTarget]:
        out: List[WriteTarget] = []
        for pattern in self._patterns:
            for element in pattern.chain:
                if isinstance(element, Relationship):
                    out.append(_relationship_target_of(element))
                elif not isinstance(element, NodeReference):
                    out.append(_node_target_of(element))
        return out

    def _apply(self, writes: WriteSet) -> None:
        for pattern in self._patterns:
            for element in pattern.chain:
                if isinstance(element, Node) and not isinstance(element, NodeReference):
                    ref = writes.ref()
                    properties = _evaluate(element.properties)
                    writes.add({
                        "op": "createNode",
                        "ref": ref,
                        "labels": list(element.labels),
                        "properties": properties,
                    })
                    element.set_value({"id": ref, **properties})
            for element in pattern.chain:
                if isinstance(element, Relationship):
                    left, right = _endpoints(element)
                    start = _node_value(left) if left is not None else None
                    end = _node_value(right) if right is not None else None
                    if start is None or end is None:
                        raise ValueError(f"Cannot create [:{element.type}]: an endpoint is null")
                    ref = writes.ref()
                    properties = _evaluate(element.properties)
                    writes.add({
                        "op": "createRelationship",
                        "ref": ref,
                        "type": element.type,
                        "start": start.get("id"),
                        "end": end.get("id"),
                        "properties": properties,
                    })
                    _bind_relationship(element, ref, start, end, properties)


class MergeWrite(WriteOperation):
    """``MERGE (n:Label {key...})`` or ``MERGE (a)-[r:TYPE {key...}]->(b)`` with
    optional ``ON CREATE SET`` / ``ON MATCH SET``.  The backend matches on
    the key, creates when missing and applies ``onCreate`` / ``onMatch``
    inside its own transaction."""

    def __init__(self, pattern: Pattern, on_create: List[SetItem], on_match: List[SetItem]) -> None:
        super().__init__()
        self._pattern = pattern
        self._on_create = on_create
        self._on_match = on_match

    @property
    def pattern(self) -> Pattern:
        return self._pattern

    @property
    def evaluated(self) -> List[ASTNode]:
        return [
            self._pattern,
            *_item_expressions(self._on_create),
            *_item_expressions(self._on_match),
        ]

    @property
    def _relationship(self) -> Optional[Relationship]:
        for element in self._pattern.chain:
            if isinstance(element, Relationship):
                return element
        return None

    def _node(self) -> Node:
        node = self._pattern.chain[0]
        assert isinstance(node, Node)
        return node

    @property
    def targets(self) -> List[WriteTarget]:
        rel = self._relationship
        if rel is not None:
            return [_relationship_target_of(rel)]
        return [_node_target_of(self._node())]

    @staticmethod
    def _collect_items(items: List[SetItem]) -> Dict[str, Any]:
        out: Dict[str, Any] = {}
        for item in items:
            if item.kind == "property":
                assert item.property is not None and item.expression is not None
                out[item.property] = item.expression.value()
            elif item.kind == "merge":
                out.update(_map_value(item.expression))
        return out

    def _apply(self, writes: WriteSet) -> None:
        on_create = MergeWrite._collect_items(self._on_create)
        on_match = MergeWrite._collect_items(self._on_match)
        rel = self._relationship
        ref = writes.ref()
        if rel is None:
            node = self._node()
            key = _evaluate(node.properties)
            writes.add({
                "op": "mergeNode",
                "ref": ref,
                "label": label_of(node),
                "key": key,
                "onCreate": on_create,
                "onMatch": on_match,
            })
            node.set_value({"id": ref, **key})
            return
        left, right = _endpoints(rel)
        start = _node_value(left) if left is not None else None
        end = _node_value(right) if right is not None else None
        if start is None or end is None:
            raise ValueError(f"Cannot merge [:{rel.type}]: an endpoint is null")
        key = _evaluate(rel.properties)
        writes.add({
            "op": "mergeRelationship",
            "ref": ref,
            "type": rel.type,
            "start": start.get("id"),
            "end": end.get("id"),
            "key": key,
            "onCreate": on_create,
            "onMatch": on_match,
        })
        _bind_relationship(rel, ref, start, end, key)


class SetWrite(WriteOperation):
    """``SET n.prop = v``, ``SET n += {...}``, ``SET n:Label``."""

    def __init__(self, items: List[SetItem]) -> None:
        super().__init__()
        self._items = items

    @property
    def items(self) -> List[SetItem]:
        return self._items

    @property
    def evaluated(self) -> List[ASTNode]:
        return _item_expressions(self._items)

    @property
    def targets(self) -> List[WriteTarget]:
        return [
            _relationship_target_of(item.element)
            if isinstance(item.element, Relationship)
            else _node_target_of(item.element)
            for item in self._items
        ]

    def _apply(self, writes: WriteSet) -> None:
        self._apply_items(self._items, writes)


class RemoveWrite(SetWrite):
    """``REMOVE n.prop``, ``REMOVE n:Label``."""


class DeleteWrite(WriteOperation):
    """``DELETE x, y`` / ``DETACH DELETE n``."""

    def __init__(self, elements: List[Union[Node, Relationship]], detach: bool) -> None:
        super().__init__()
        self._elements = elements
        self._detach = detach

    @property
    def detach(self) -> bool:
        return self._detach

    @property
    def targets(self) -> List[WriteTarget]:
        return [
            _relationship_target_of(e) if isinstance(e, Relationship) else _node_target_of(e)
            for e in self._elements
        ]

    def _apply(self, writes: WriteSet) -> None:
        for element in self._elements:
            if isinstance(element, Relationship):
                target = _relationship_target(element)
                if target is None:
                    continue
                writes.add({"op": "deleteRelationship", "target": target, "type": element.type})
            else:
                value = _node_value(element)
                if value is None:
                    continue
                writes.add({
                    "op": "deleteNode",
                    "target": value.get("id"),
                    "label": label_of(element),
                    "detach": self._detach,
                })


def _describe(target: WriteTarget) -> str:
    if target.kind == "node":
        return f"(:{target.label or ''})"
    return (
        f"(:{target.source_label or ''})-[:{target.type or ''}]->"
        f"(:{target.target_label or ''})"
    )


def resolve_write_backend(target: WriteTarget) -> WriteBackend:
    """Resolve the backend function a write target is applied through.  The
    target must have a statement-backed ``CREATE VIRTUAL`` definition whose
    effective capabilities declare ``writes: true`` and whose body loads
    from ``fn($request)``."""
    db = Database.get_instance()
    name = _describe(target)
    physical: Any = None
    if target.kind == "node":
        if target.label is None:
            raise ValueError("Cannot write to a node without a label")
        physical = db.nodes.get(target.label)
    else:
        if target.type is None:
            raise ValueError("Cannot write to a relationship without a type")
        by_endpoints = db.relationships.get(target.type)
        if by_endpoints is not None:
            physical = by_endpoints.get(f"{target.source_label or ''}:{target.target_label or ''}")
            if physical is None and len(by_endpoints) == 1:
                physical = next(iter(by_endpoints.values()))
    if physical is None:
        raise ValueError(f"Cannot write to {name}: it has no CREATE VIRTUAL definition")
    provider = physical.provider
    capabilities = getattr(provider, "capabilities", None) if provider is not None else None
    if (
        physical.statement is None
        or provider is None
        or not isinstance(capabilities, dict)
        or capabilities.get("writes") is not True
    ):
        raise ValueError(
            f"Cannot write to {name}: its definition does not declare the writes capability"
        )
    backend = definition_backend(physical.statement)
    if backend is None:
        raise ValueError(
            f"Cannot write to {name}: its definition does not load from a backend function "
            "called with $request"
        )
    args = [
        None if i == backend.request_index else child.value()
        for i, child in enumerate(backend.func.get_children())
    ]
    return WriteBackend(
        name=backend.name,
        function_class=backend.function_class,
        request_index=backend.request_index,
        args=args,
    )


def prepare_writes(operations: List[WriteOperation], ctx: "SourceContext") -> None:
    """Check every target of a statement's write clauses before it runs and
    pin the query to a single backend function."""
    if len(operations) == 0:
        return
    if ctx.writes is None:
        ctx.writes = WriteSet()
    for op in operations:
        for target in op.targets:
            backend = resolve_write_backend(target)
            current = ctx.writes.backend
            if current is None:
                ctx.writes.backend = backend
            elif current.function_class is not backend.function_class:
                raise ValueError(
                    "A query can only write through one backend function "
                    f"({current.name} and {backend.name})"
                )


async def commit_writes(ctx: "SourceContext", writes: WriteSet) -> WriteResult:
    """Send the collected change set to the backend in one call."""
    backend = writes.backend
    assert backend is not None
    changes: List[WriteChange] = writes.changes
    fn = FunctionFactory.create_async(backend.name)
    fn.source_context = ctx
    await fn.prepare_context()
    args = list(backend.args)
    args[backend.request_index] = {
        "version": WRITE_CONTRACT_VERSION,
        "operation": "write",
        "changes": changes,
    }
    response: Any = _NO_RESPONSE
    generator = fn.generate(*args)
    try:
        async for item in generator:
            response = item
            break
    except QueryCancelledError:
        raise
    except Exception as e:
        raise SourceError(
            f"Write through {backend.name} failed: {e}", backend.name, "write", e
        ) from e
    finally:
        aclose = getattr(generator, "aclose", None)
        if aclose is not None:
            await aclose()
    if response is not _NO_RESPONSE and not isinstance(response, dict):
        raise SourceError(
            f"Write through {backend.name} returned an invalid response", backend.name, "write"
        )
    ids: Dict[str, Any] = {}
    stats: Dict[str, Any] = {}
    if isinstance(response, dict):
        ids = response.get("ids") or {}
        stats = response.get("stats") or {}
    return WriteResult(ids=ids, stats=stats, changes=changes)


_NO_RESPONSE: Any = object()


def has_writes(root: ASTNode) -> bool:
    """True when ``root`` contains a write clause anywhere in its operation chain."""
    first = root.first_child()
    return len(WriteOperation.collect(first if isinstance(first, Operation) else None)) > 0
