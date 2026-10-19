"""Declarative write clauses (``CREATE`` / ``MERGE`` / ``SET`` / ``REMOVE`` /
``[DETACH] DELETE``) against statement-backed definitions.

Each clause records changes in the query's
:class:`~flowquery.graph.write_set.WriteSet`; the runner sends the whole
change set to the definitions' backend function when the query succeeds.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from typing import TYPE_CHECKING, Any, Callable, Dict, List, Mapping, Optional, Tuple, Union

from ...graph.database import Database
from ...graph.graph_records import (
    DEFAULT_GRAPH,
    GRAPH_KEY,
    LABELS_KEY,
    PROPERTIES_KEY,
    VIRTUAL_NAMESPACE,
    graph_node_record,
    graph_relationship_record,
    is_graph_record,
    labels_of,
    namespace_of,
    user_properties,
    with_endpoint_namespaces,
)
from ...graph.namespaces import bound_graph, definition_endpoint_namespace
from ...graph.node import Node
from ...graph.node_reference import NodeReference
from ...graph.pattern import Pattern
from ...graph.pattern_expression import PatternExpression
from ...graph.relationship import Relationship
from ...graph.source_access import RelationshipSourceAccess
from ...graph.source_provider import QueryCancelledError, SourceError
from ...graph.write_set import (
    WRITE_CONTRACT_VERSION,
    WriteBackend,
    WriteResult,
    WriteRoute,
    WriteSet,
    same_backend,
)
from ..ast_node import ASTNode
from ..expressions.expression import Expression
from ..expressions.subquery_expression import SubqueryExpression
from ..functions.function_factory import FunctionFactory
from .call import Call
from .definition_backend import definition_backend
from .load import Load
from .match import Match
from .operation import Operation
from .use_graph import DropGraph, UseGraph

if TYPE_CHECKING:
    from ...graph.default_graph import DefaultGraph
    from ...graph.source_context import SourceContext


@dataclass
class WriteTarget:
    """A label (``kind == "node"``) or relationship type a write clause changes.

    New nodes (``CREATE`` / ``MERGE``) carry every label and their clause
    (``"create"`` or ``"merge"``).
    """

    kind: str
    label: Optional[str] = None
    type: Optional[str] = None
    source_label: Optional[str] = None
    target_label: Optional[str] = None
    labels: Optional[List[str]] = None
    clause: Optional[str] = None
    #: Graph of a qualified label (``hr.Person``) or type (``hr.KNOWS``).
    graph: Optional[str] = None


@dataclass
class SetItem:
    """One item of ``SET``, ``REMOVE`` or ``ON CREATE`` / ``ON MATCH SET``.

    ``kind`` is ``"property"`` (``n.p = v``), ``"merge"`` (``n += map``),
    ``"replace"`` (``n = map``), ``"addLabels"`` (``n:Label``),
    ``"removeProperty"`` (``REMOVE n.p``) or ``"removeLabels"``
    (``REMOVE n:Label``).
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
        if item.kind in ("property", "merge", "replace") and item.expression is not None
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


def _graph_of(node: Optional[Node]) -> Optional[str]:
    """Graph qualifier of a node pattern element (following references)."""
    if node is None:
        return None
    if node.graph is not None:
        return node.graph
    if isinstance(node, NodeReference) and isinstance(node.reference, Node):
        return _graph_of(node.reference)
    return None


def _qualified_label_of(node: Optional[Node]) -> Optional[str]:
    """``hr.Person`` for a graph-qualified node pattern element, else its label."""
    label = label_of(node)
    graph = _graph_of(node)
    return f"{graph}.{label}" if label is not None and graph is not None else label


def _node_target_of(node: Node) -> WriteTarget:
    return WriteTarget(kind="node", label=label_of(node), graph=_graph_of(node))


def _new_node_target_of(node: Node, clause: str) -> WriteTarget:
    return WriteTarget(
        kind="node", label=node.label, labels=list(node.labels), clause=clause, graph=node.graph
    )


def _relationship_target_of(rel: Relationship) -> WriteTarget:
    start, end = _endpoints(rel)
    return WriteTarget(
        kind="relationship",
        type=rel.type,
        source_label=_qualified_label_of(start),
        target_label=_qualified_label_of(end),
        graph=rel.graph,
    )


def _graph_tag(graph_name: Optional[str]) -> Dict[str, Any]:
    """``graphName`` of a change to an entity of a named graph."""
    if graph_name is not None and graph_name != DEFAULT_GRAPH:
        return {"graphName": graph_name}
    return {}


def _tag_of(record: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """``graphName`` of a change to an existing entity (none for definitions and the default graph)."""
    if record is not None and is_graph_record(record):
        return _graph_tag(record[GRAPH_KEY])
    return {}


def _endpoint_tags(owner: str, start: Dict[str, Any], end: Dict[str, Any]) -> Dict[str, Any]:
    """Endpoint namespaces of a new relationship stored in ``owner``'s
    namespace: ``startGraph`` / ``endGraph`` (and the label of a definition
    endpoint) when an endpoint lives elsewhere."""
    out: Dict[str, Any] = {}
    for key, value in (("start", start), ("end", end)):
        ns = namespace_of(value)
        if ns == owner:
            continue
        out[f"{key}Graph"] = ns
        if ns == VIRTUAL_NAMESPACE and "_label" in value:
            out[f"{key}Label"] = value["_label"]
    return out


def _describe_namespace(ns: str) -> str:
    return "a definition node" if ns == VIRTUAL_NAMESPACE else f"a node of graph {ns}"


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
    stored = dict(user_properties(value) or {}) if is_graph_record(value) else None
    for key, item in properties.items():
        if item is None:
            updated.pop(key, None)
            if stored is not None:
                stored.pop(key, None)
        else:
            updated[key] = item
            if stored is not None:
                stored[key] = item
    if stored is not None:
        # ``id`` stays the entity id; the stored ``id`` property lives in the
        # user properties, which property access reads.
        updated["id"] = value.get("id")
        updated[PROPERTIES_KEY] = stored
    node.set_value(updated)


def _update_node_labels(node: Node, labels: List[str], add: bool) -> None:
    """Rebind a default-graph node variable with labels added or removed."""
    value = _node_value(node)
    if value is None or not is_graph_record(value):
        return
    current = labels_of(value)
    if add:
        updated = current + [label for label in labels if label not in current]
    else:
        updated = [label for label in current if label not in labels]
    node.set_value({**value, LABELS_KEY: updated})


def _without_nulls(value: Any) -> Dict[str, Any]:
    if not isinstance(value, dict):
        return {}
    return {k: v for k, v in value.items() if v is not None}


def _replace_node_value(node: Node, properties: Dict[str, Any]) -> None:
    value = _node_value(node)
    if value is None:
        return
    if is_graph_record(value):
        updated = graph_node_record(
            value.get("id"), labels_of(value), _without_nulls(properties), value[GRAPH_KEY]
        )
        if "_label" in value:
            updated["_label"] = value["_label"]
        node.set_value(updated)
        return
    node.set_value({"id": value.get("id"), **_without_nulls(properties)})


def _replace_relationship_value(rel: Relationship, properties: Dict[str, Any]) -> None:
    value = rel.value()
    if value is None or isinstance(value, list):
        return
    props = _without_nulls(properties)
    if is_graph_record(value):
        rel.override_value({
            "id": value.get("id"),
            "type": value.get("type"),
            "startNode": value.get("startNode"),
            "endNode": value.get("endNode"),
            "properties": dict(props),
            GRAPH_KEY: value.get(GRAPH_KEY),
            PROPERTIES_KEY: dict(props),
        })
        return
    updated: Dict[str, Any] = {
        **props,
        "type": value.get("type"),
        "startNode": value.get("startNode"),
        "endNode": value.get("endNode"),
        "properties": dict(props),
    }
    if "id" in value:
        updated["id"] = value["id"]
    rel.override_value(updated)


def _update_relationship_value(rel: Relationship, properties: Dict[str, Any]) -> None:
    value = rel.value()
    if value is None or isinstance(value, list):
        return
    updated: Dict[str, Any] = {**value, "properties": dict(value.get("properties") or {})}
    if is_graph_record(value):
        # Graph relationships: property access reads the stored properties.
        stored = dict(user_properties(value) or {})
        for key, item in properties.items():
            if item is None:
                stored.pop(key, None)
                updated["properties"].pop(key, None)
            else:
                stored[key] = item
                updated["properties"][key] = item
        updated[PROPERTIES_KEY] = stored
        rel.override_value(updated)
        return
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


def _bind_node(writes: WriteSet, node: Node, ref: str) -> None:
    """Swap a node variable's temporary id for the final one once known."""

    def rebind(id_: Any) -> None:
        value = node.value()
        if isinstance(value, dict) and value.get("id") == ref:
            node.set_value({**value, "id": id_})

    writes.bind(ref, rebind)


def _bind_relationship(
    writes: WriteSet,
    rel: Relationship,
    ref: str,
    start: Dict[str, Any],
    end: Dict[str, Any],
    properties: Dict[str, Any],
    route: WriteRoute,
) -> None:
    if route.graph_name is not None:
        rel.created_record = graph_relationship_record(
            ref,
            rel.type or "",
            start.get("id"),
            end.get("id"),
            properties,
            route.graph_name,
            namespace_of(start),
            namespace_of(end),
        )
    else:
        rel.created_record = with_endpoint_namespaces(
            {
                "id": ref,
                "left_id": start.get("id"),
                "right_id": end.get("id"),
                **properties,
            },
            namespace_of(start),
            namespace_of(end),
        )
    rel.override_value({
        **properties,
        "id": ref,
        "type": rel.type,
        "startNode": start,
        "endNode": end,
        "properties": dict(properties),
        **(
            {GRAPH_KEY: route.graph_name, PROPERTIES_KEY: dict(properties)}
            if route.graph_name is not None
            else {}
        ),
    })

    def rebind(id_: Any) -> None:
        if rel.created_record is not None and rel.created_record.get("id") == ref:
            rel.created_record = {**rel.created_record, "id": id_}
        value = rel.value()
        if isinstance(value, dict) and value.get("id") == ref:
            rel.override_value({**value, "id": id_})

    writes.bind(ref, rebind)


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

    @property
    def _graphs(self) -> Mapping[str, "DefaultGraph"]:
        """The graphs pinned by the query."""
        return self._context.graphs if self._context is not None else {}

    @staticmethod
    def _route_by(writes: WriteSet, key: str, resolve: Callable[[], WriteRoute]) -> WriteRoute:
        route = writes.routes.get(key)
        if route is None:
            route = resolve()
            writes.routes[key] = route
        writes.route(route)
        return route

    def _route_target(self, writes: WriteSet, target: WriteTarget) -> WriteRoute:
        """Route a new node or relationship (by its static labels or type)."""

        def resolve() -> WriteRoute:
            route = resolve_target(target, self._graphs)
            if route is None:
                raise ValueError(f"Cannot write to {_describe(target)}")
            return route

        key = "target:" + json.dumps(asdict(target), sort_keys=True)
        return WriteOperation._route_by(writes, key, resolve)

    def _route_node(self, writes: WriteSet, node: Node, value: Dict[str, Any]) -> WriteRoute:
        """Route a change to a bound node by where it came from: graph nodes go
        to their graph, other nodes to their definition."""
        if is_graph_record(value):
            graph_name: str = value[GRAPH_KEY]
            name = f"(:{':'.join(labels_of(value))})"
            return WriteOperation._route_by(
                writes,
                f"graph:{graph_name}",
                lambda: _graph_route(self._graphs, graph_name, name),
            )
        label = value["_label"] if value.get("_label") is not None else label_of(node)
        return WriteOperation._route_by(
            writes,
            f"node:{label}",
            lambda: resolve_write_backend(WriteTarget(kind="node", label=label), self._graphs),
        )

    def _route_relationship(
        self, writes: WriteSet, rel: Relationship, record: Optional[Dict[str, Any]]
    ) -> WriteRoute:
        """Relationship counterpart of :meth:`_route_node`."""
        if record is not None and is_graph_record(record):
            graph_name: str = record[GRAPH_KEY]
            name = f"[:{record.get('_type') or ''}]"
            return WriteOperation._route_by(
                writes,
                f"graph:{graph_name}",
                lambda: _graph_route(self._graphs, graph_name, name),
            )
        start, end = _endpoints(rel)
        target = WriteTarget(
            kind="relationship",
            type=rel.type if rel.type is not None else (record or {}).get("_type"),
            source_label=label_of(start),
            target_label=label_of(end),
        )
        return WriteOperation._route_by(
            writes,
            f"rel:{target.type}:{target.source_label}:{target.target_label}",
            lambda: resolve_write_backend(target, self._graphs),
        )

    async def _check(self, writes: WriteSet) -> None:
        """Asynchronous checks before a row is applied (internal)."""
        return None

    async def run(self) -> None:
        if self._context is not None:
            self._context.throw_if_cancelled()
        writes = self._writes
        await self._check(writes)
        self._apply(writes)
        if writes.transactional and writes.per_row:
            assert self._context is not None
            await flush_writes(self._context, writes)
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
                record = (
                    element.created_record
                    if element.created_record is not None
                    else element.current_record(0)
                )
                self._route_relationship(writes, element, record)
                rel_type = element.type if element.type is not None else (record or {}).get("_type")
                if item.kind == "replace":
                    properties = _map_value(item.expression)
                    writes.add({
                        "op": "replaceProperties",
                        "target": target,
                        "type": rel_type,
                        "properties": properties,
                        **_tag_of(record),
                    })
                    _replace_relationship_value(element, properties)
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
                    "type": rel_type,
                    "properties": properties,
                    **_tag_of(record),
                })
                _update_relationship_value(element, properties)
                continue
            value = _node_value(element)
            if value is None:
                continue
            self._route_node(writes, element, value)
            label = label_of(element)
            if item.kind == "replace":
                properties = _map_value(item.expression)
                writes.add({
                    "op": "replaceProperties",
                    "target": value.get("id"),
                    "label": label,
                    "properties": properties,
                    **_tag_of(value),
                })
                _replace_node_value(element, properties)
            elif item.kind in ("property", "merge", "removeProperty"):
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
                    **_tag_of(value),
                })
                _update_node_value(element, properties)
            elif item.kind in ("addLabels", "removeLabels"):
                if item.kind == "addLabels" and namespace_of(value) == DEFAULT_GRAPH:
                    defined = [
                        lbl for lbl in item.labels if lbl in Database.get_instance().nodes
                    ]
                    if len(defined) > 0:
                        raise ValueError(
                            f"Cannot add label :{defined[0]} to a default-graph node: "
                            f"(:{defined[0]}) has a CREATE VIRTUAL definition"
                        )
                writes.add({
                    "op": item.kind,
                    "target": value.get("id"),
                    "label": label,
                    "labels": list(item.labels),
                    **_tag_of(value),
                })
                _update_node_labels(element, item.labels, item.kind == "addLabels")


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
                    out.append(_new_node_target_of(element, "create"))
        return out

    def _apply(self, writes: WriteSet) -> None:
        for pattern in self._patterns:
            for element in pattern.chain:
                if isinstance(element, Node) and not isinstance(element, NodeReference):
                    route = self._route_target(writes, _new_node_target_of(element, "create"))
                    ref = writes.ref()
                    properties = _evaluate(element.properties)
                    writes.add({
                        "op": "createNode",
                        "ref": ref,
                        "labels": list(element.labels),
                        "properties": properties,
                        **_graph_tag(route.graph_name),
                    })
                    element.set_value(
                        graph_node_record(ref, element.labels, properties, route.graph_name)
                        if route.graph_name is not None
                        else {"id": ref, **properties}
                    )
                    _bind_node(writes, element, ref)
            for element in pattern.chain:
                if isinstance(element, Relationship):
                    rel_route = self._route_target(writes, _relationship_target_of(element))
                    left, right = _endpoints(element)
                    start = _node_value(left) if left is not None else None
                    end = _node_value(right) if right is not None else None
                    if start is None or end is None:
                        raise ValueError(f"Cannot create [:{element.type}]: an endpoint is null")
                    _check_endpoints("create", element, rel_route, start, end)
                    ref = writes.ref()
                    properties = _evaluate(element.properties)
                    writes.add({
                        "op": "createRelationship",
                        "ref": ref,
                        "type": element.type,
                        "start": start.get("id"),
                        "end": end.get("id"),
                        "properties": properties,
                        **_graph_tag(rel_route.graph_name),
                        **_endpoint_tags(
                            rel_route.graph_name
                            if rel_route.graph_name is not None
                            else VIRTUAL_NAMESPACE,
                            start,
                            end,
                        ),
                    })
                    _bind_relationship(writes, element, ref, start, end, properties, rel_route)


def _check_endpoints(
    verb: str,
    rel: Relationship,
    route: WriteRoute,
    start: Dict[str, Any],
    end: Dict[str, Any],
) -> None:
    """A relationship stored in a graph may connect nodes of any namespace:
    its change records where each endpoint lives.  A relationship
    definition connects the namespaces its endpoint labels declare, since
    ids are only meaningful within their own namespace."""
    if route.graph_name is not None:
        return
    left, right = (
        route.endpoints
        if route.endpoints is not None
        else (VIRTUAL_NAMESPACE, VIRTUAL_NAMESPACE)
    )
    for expected, value in ((left, start), (right, end)):
        actual = namespace_of(value)
        if actual != expected:
            raise ValueError(
                f"Cannot {verb} [:{rel.type}]: its CREATE VIRTUAL definition connects "
                f"{_describe_namespace(left)} to {_describe_namespace(right)}, "
                f"but an endpoint is {_describe_namespace(actual)}"
            )


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
        return [_new_node_target_of(self._node(), "merge")]

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
            node_route = self._route_target(writes, _new_node_target_of(node, "merge"))
            key = _evaluate(node.properties)
            if node_route.graph_name is not None:
                writes.add({
                    "op": "mergeNode",
                    "ref": ref,
                    "label": node.label,
                    "labels": list(node.labels),
                    "key": key,
                    "onCreate": on_create,
                    "onMatch": on_match,
                    **_graph_tag(node_route.graph_name),
                })
                node.set_value(graph_node_record(ref, node.labels, key, node_route.graph_name))
            else:
                writes.add({
                    "op": "mergeNode",
                    "ref": ref,
                    "label": label_of(node),
                    "key": key,
                    "onCreate": on_create,
                    "onMatch": on_match,
                })
                node.set_value({"id": ref, **key})
            _bind_node(writes, node, ref)
            return
        route = self._route_target(writes, _relationship_target_of(rel))
        left, right = _endpoints(rel)
        start = _node_value(left) if left is not None else None
        end = _node_value(right) if right is not None else None
        if start is None or end is None:
            raise ValueError(f"Cannot merge [:{rel.type}]: an endpoint is null")
        _check_endpoints("merge", rel, route, start, end)
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
            **_graph_tag(route.graph_name),
            **_endpoint_tags(
                route.graph_name if route.graph_name is not None else VIRTUAL_NAMESPACE,
                start,
                end,
            ),
        })
        _bind_relationship(writes, rel, ref, start, end, key, route)


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

    async def _check(self, writes: WriteSet) -> None:
        """A node may be referenced by relationships that another backend
        stores (a graph's relationship to a definition node, or to a node of
        a graph on another backend).  That backend cannot be changed by this
        query, so deleting the node would leave them dangling: reject it.
        Relationships stored by the node's own backend are checked by the
        backend itself, atomically."""
        ctx = self._context
        if ctx is None:
            return
        for element in self._elements:
            if isinstance(element, Relationship):
                continue
            value = _node_value(element)
            if value is None or value.get("id") in writes.refs:
                continue
            route = self._route_node(writes, element, value)
            await _check_foreign_references(ctx, route, value)

    def _apply(self, writes: WriteSet) -> None:
        for element in self._elements:
            if isinstance(element, Relationship):
                target = _relationship_target(element)
                if target is None:
                    continue
                record = (
                    element.created_record
                    if element.created_record is not None
                    else element.current_record(0)
                )
                self._route_relationship(writes, element, record)
                scope = (
                    f"graph:{record[GRAPH_KEY]}"
                    if record is not None and is_graph_record(record)
                    else f"type:{element.type if element.type is not None else (record or {}).get('_type')}"
                )
                if not writes.mark_deleted(f"relationship:{scope}", target):
                    continue
                writes.add({
                    "op": "deleteRelationship",
                    "target": target,
                    "type": element.type if element.type is not None else (record or {}).get("_type"),
                    **_tag_of(record),
                })
            else:
                value = _node_value(element)
                if value is None:
                    continue
                self._route_node(writes, element, value)
                node_scope = (
                    f"graph:{value[GRAPH_KEY]}"
                    if is_graph_record(value)
                    else f"label:{value['_label'] if value.get('_label') is not None else label_of(element)}"
                )
                if not writes.mark_deleted(f"node:{node_scope}", value.get("id")):
                    continue
                writes.add({
                    "op": "deleteNode",
                    "target": value.get("id"),
                    "label": label_of(element),
                    "detach": self._detach,
                    **_tag_of(value),
                })


async def _check_foreign_references(
    ctx: "SourceContext", route: WriteRoute, value: Dict[str, Any]
) -> None:
    """Reject the deletion of node ``value`` when relationships stored by
    another backend than ``route``'s still reference it."""
    ns = namespace_of(value)
    sources: List[Dict[str, Any]] = []
    names: List[str] = []
    for graph in list(ctx.graphs.values()):
        if same_backend(graph.write_backend, route.backend):
            continue
        sources.append({
            "type": None,
            "sourceLabel": None,
            "targetLabel": None,
            "provider": graph.relationship_provider,
            "graph": graph.graph_name,
        })
        names.append(graph.description)
    if ns != VIRTUAL_NAMESPACE:
        for rel_type, by_endpoints in list(Database.get_instance().relationships.items()):
            for physical in list(by_endpoints.values()):
                if physical.provider is None:
                    continue
                left = definition_endpoint_namespace(physical.source, ctx.graphs)
                right = definition_endpoint_namespace(physical.target, ctx.graphs)
                if left != ns and right != ns:
                    continue
                sources.append({
                    "type": rel_type,
                    "sourceLabel": physical.source.label if physical.source is not None else None,
                    "targetLabel": physical.target.label if physical.target is not None else None,
                    "provider": physical.provider,
                    "leftNamespace": left,
                    "rightNamespace": right,
                })
                names.append(f"the definition of [:{rel_type}]")
    if len(sources) == 0:
        return
    for source, name in zip(sources, names):
        access = RelationshipSourceAccess(ctx, [source])
        for side in ("left", "right"):
            pages = access.expand(value.get("id"), side, [], None, ns)
            try:
                async for page in pages:
                    if len(page) > 0:
                        raise ValueError(
                            f"Cannot delete node {json.dumps(value.get('id'))}: relationships "
                            f"stored in {name} still reference it; delete them first in a "
                            "separate query"
                        )
            finally:
                await pages.aclose()


def _describe(target: WriteTarget) -> str:
    prefix = f"{target.graph}." if target.graph is not None else ""
    if target.kind == "node":
        labels = (
            target.labels
            if target.labels is not None
            else ([target.label] if target.label is not None else [])
        )
        return f"(:{prefix}{':'.join(labels)})"
    return (
        f"(:{target.source_label or ''})-[:{prefix}{target.type or ''}]->"
        f"(:{target.target_label or ''})"
    )


def _graph_route(graphs: Mapping[str, "DefaultGraph"], graph_name: str, name: str) -> WriteRoute:
    """Route of a write through the graph ``graph_name``; it must declare ``writes: true``."""
    if graph_name == DEFAULT_GRAPH and DEFAULT_GRAPH not in graphs:
        raise ValueError(f"Cannot write to {name}: it has no CREATE VIRTUAL definition")
    graph = bound_graph(graphs, graph_name)
    if not graph.writable:
        if graph.is_default:
            raise ValueError(
                f"Cannot write to {name}: the default graph backend {graph.name} "
                "does not declare the writes capability"
            )
        raise ValueError(
            f"Cannot write to {name}: the backend {graph.name} of graph {graph_name} "
            "does not declare the writes capability"
        )
    return WriteRoute(
        backend=graph.write_backend,
        transactions=graph.transactional,
        graph_name=graph.graph_name,
    )


def resolve_target(
    target: WriteTarget, graphs: Mapping[str, "DefaultGraph"]
) -> Optional[WriteRoute]:
    """Resolve where a write target goes before the query runs.

    Graph-qualified labels and types go to their graph; other labels and
    types with a ``CREATE VIRTUAL`` definition go to that definition, the
    rest to the default graph when one is bound.  Returns None when the
    route depends on the entity a row binds (unlabelled nodes and untyped
    relationships while graphs are bound).
    """
    db = Database.get_instance()
    graph = graphs.get(DEFAULT_GRAPH)
    qualifier = target.graph
    if qualifier is not None:
        if target.kind == "node" and qualifier == DEFAULT_GRAPH:
            qualified_labels = (
                target.labels
                if target.labels is not None
                else ([target.label] if target.label is not None else [])
            )
            defined = next((label for label in qualified_labels if label in db.nodes), None)
            if target.clause is not None and defined is not None:
                raise ValueError(
                    f"Cannot write to {_describe(target)}: (:{defined}) has a CREATE VIRTUAL "
                    "definition, which takes precedence over the default graph"
                )
        if (
            target.kind == "relationship"
            and qualifier == DEFAULT_GRAPH
            and target.type is not None
            and target.type in db.relationships
        ):
            raise ValueError(
                f"Cannot write to {_describe(target)}: [:{target.type}] has a CREATE VIRTUAL "
                "definition, which takes precedence over the default graph"
            )
        return _graph_route(graphs, qualifier, _describe(target))
    if target.kind == "node":
        if target.clause is not None:
            labels = (
                target.labels
                if target.labels is not None
                else ([target.label] if target.label is not None else [])
            )
            if graph is None or any(label in db.nodes for label in labels):
                if len(labels) != 1:
                    if graph is not None:
                        message = (
                            f"Cannot write to {_describe(target)}: a label with a CREATE "
                            "VIRTUAL definition cannot be combined with other labels"
                        )
                    elif target.clause == "create":
                        message = "CREATE requires exactly one label for each new node"
                    else:
                        message = "MERGE of a node requires a new variable with exactly one label"
                    raise ValueError(message)
                return resolve_write_backend(WriteTarget(kind="node", label=labels[0]), graphs)
            if target.clause == "merge" and len(labels) == 0:
                raise ValueError("MERGE of a node requires at least one label")
            return _graph_route(graphs, DEFAULT_GRAPH, _describe(target))
        if target.label is None:
            return resolve_write_backend(target, graphs) if len(graphs) == 0 else None
        if graph is None or target.label in db.nodes:
            return resolve_write_backend(target, graphs)
        return _graph_route(graphs, DEFAULT_GRAPH, _describe(target))
    if target.type is None:
        return resolve_write_backend(target, graphs) if len(graphs) == 0 else None
    if graph is None or target.type in db.relationships:
        return resolve_write_backend(target, graphs)
    return _graph_route(graphs, DEFAULT_GRAPH, _describe(target))


def resolve_write_backend(
    target: WriteTarget, graphs: Optional[Mapping[str, "DefaultGraph"]] = None
) -> WriteRoute:
    """Resolve the backend function a write target is applied through, and
    whether its definition declares ``transactions: true``.  The
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
    return WriteRoute(
        backend=WriteBackend(
            name=backend.name,
            function_class=backend.function_class,
            request_index=backend.request_index,
            args=args,
        ),
        transactions=capabilities.get("transactions") is True,
        endpoints=(
            (
                definition_endpoint_namespace(physical.source, graphs or {}),
                definition_endpoint_namespace(physical.target, graphs or {}),
            )
            if target.kind == "relationship"
            else None
        ),
    )


def reads_after_writes(first: Optional[Operation]) -> bool:
    """True when a clause after the statement's first write clause reads data."""
    written = False
    op = first
    while op is not None:
        if isinstance(op, WriteOperation):
            written = True
        elif written and (isinstance(op, (Match, Load, Call)) or _contains_read(op)):
            return True
        op = op.next
    return False


def _contains_read(node: ASTNode) -> bool:
    if isinstance(node, (SubqueryExpression, PatternExpression)):
        return True
    return any(_contains_read(child) for child in node.get_children())


def prepare_writes(first: Operation, ctx: "SourceContext") -> None:
    """Check every target of a statement's write clauses before it runs, pin
    the query to a single backend function and decide when changes are
    sent (see :class:`WriteSet`).  Targets whose backend depends on the
    matched entity are checked as each row is written."""
    operations = WriteOperation.collect(first)
    if len(operations) == 0:
        return
    op: Optional[Operation] = first
    while op is not None:
        if isinstance(op, (UseGraph, DropGraph)):
            raise ValueError(
                "USE GRAPH and DROP GRAPH cannot be combined with write clauses in one "
                "statement; separate the statements with ';'"
            )
        op = op.next
    if ctx.writes is None:
        ctx.writes = WriteSet()
    writes = ctx.writes
    for op in operations:
        for target in op.targets:
            route = resolve_target(target, ctx.graphs)
            if route is not None:
                writes.route(route)
    writes.per_row = writes.transactional and reads_after_writes(first)


async def _call_backend(
    ctx: "SourceContext",
    backend: WriteBackend,
    request: Dict[str, Any],
    after_cancel: bool = False,
) -> Dict[str, Any]:
    """Call the backend function once with ``request`` and return its first item."""
    operation = request["operation"]
    fn = FunctionFactory.create_async(backend.name)
    fn.source_context = ctx
    await fn.prepare_context(after_cancel)
    args = list(backend.args)
    args[backend.request_index] = {
        "version": WRITE_CONTRACT_VERSION,
        **({"graph": True} if backend.graph else {}),
        **request,
    }
    response: Any = _NO_RESPONSE
    what = operation[:1].upper() + operation[1:]
    generator = fn.generate(*args)
    try:
        async for item in generator:
            response = item
            break
    except QueryCancelledError:
        raise
    except Exception as e:
        raise SourceError(
            f"{what} through {backend.name} failed: {e}", backend.name, operation, e
        ) from e
    finally:
        aclose = getattr(generator, "aclose", None)
        if aclose is not None:
            await aclose()
    if response is not _NO_RESPONSE and not isinstance(response, dict):
        raise SourceError(
            f"{what} through {backend.name} returned an invalid response", backend.name, operation
        )
    return response if isinstance(response, dict) else {}


_NO_RESPONSE: Any = object()


async def flush_writes(ctx: "SourceContext", writes: WriteSet) -> None:
    """Send the changes not sent yet.  In a transactional query they are
    applied inside the backend's open transaction, so the query's later
    reads see them; the query-scoped read cache is dropped."""
    if writes.pending == 0 or writes.backend is None:
        return
    ctx.throw_if_cancelled()
    changes = writes.take_pending()
    writes.absorb(
        await _call_backend(ctx, writes.backend, {"operation": "write", "changes": changes})
    )
    writes.sent = True
    ctx.clear_cache()


async def commit_writes(ctx: "SourceContext", writes: WriteSet) -> WriteResult:
    """Finish the query's writes: send the remaining changes (all of them, in
    one call, for non-transactional backends) and commit a transactional
    query."""
    ctx.throw_if_cancelled()
    await flush_writes(ctx, writes)
    if writes.transactional and writes.sent and writes.backend is not None:
        ctx.throw_if_cancelled()
        await _call_backend(ctx, writes.backend, {"operation": "commit"})
        writes.committed = True
    return WriteResult(ids=dict(writes.ids), stats=dict(writes.stats), changes=writes.changes)


async def rollback_writes(ctx: "SourceContext", writes: WriteSet) -> None:
    """Roll back a transactional query whose changes were already sent.
    Failures are ignored so the query's own error is reported."""
    if not writes.transactional or not writes.sent or writes.committed or writes.backend is None:
        return
    try:
        await _call_backend(ctx, writes.backend, {"operation": "rollback"}, True)
    except Exception:
        pass
