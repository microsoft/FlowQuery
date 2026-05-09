"""Crawler that extracts structural information from parsed FlowQuery statements."""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional, Set, Tuple, Union

from ..graph.database import Database
from ..graph.node import Node
from ..graph.relationship import Relationship
from .ast_node import ASTNode
from .data_structures.lookup import Lookup
from .expressions.identifier import Identifier
from .expressions.reference import Reference
from .expressions.subquery_expression import SubqueryExpression
from .operations.create_node import CreateNode
from .operations.create_relationship import CreateRelationship
from .operations.delete_node import DeleteNode
from .operations.delete_relationship import DeleteRelationship
from .operations.load import Load
from .operations.match import Match
from .operations.operation import Operation


@dataclass
class NodeInfo:
    """Per-entity lineage for a node label.

    Captures which properties the query accesses on a label and which
    sources (URLs / file URIs / async-function names) back the virtual
    definition for that label.
    """

    properties: List[str] = field(default_factory=list)
    sources: List[str] = field(default_factory=list)


@dataclass
class RelationshipInfo:
    """Per-entity lineage for a relationship type.

    A single type may have multiple sources when it spans several
    ``(:From)-[:Type]-(:To)`` definitions.
    """

    properties: List[str] = field(default_factory=list)
    sources: List[str] = field(default_factory=list)


@dataclass
class StatementInfo:
    """Structural information extracted from a parsed FlowQuery statement.

    Captures the node labels, relationship types, data sources, and properties
    the query references — independent of whether/when it has been executed.
    The properties listed are those accessed by the *query itself* (e.g.
    ``n.name`` in a MATCH/RETURN/WHERE), not the columns produced by the
    underlying virtual node/relationship definitions.

    To trace the full lineage from a property to its source, use the
    :attr:`nodes` / :attr:`relationships` maps. Each entry there links a
    label/type to its accessed properties and the sources that back it.
    """

    #: Unique node labels referenced by MATCH/CREATE/DELETE in the statement(s).
    node_labels: List[str] = field(default_factory=list)
    #: Unique relationship types referenced by MATCH/CREATE/DELETE.
    relationship_types: List[str] = field(default_factory=list)
    #: Unique source URLs / file URIs / async-function names used by the
    #: virtual definitions the statement touches. Includes both the inline
    #: definitions in CREATE VIRTUAL clauses and the definitions of any
    #: already-registered virtuals the statement MATCHes or DELETEs.
    sources: List[str] = field(default_factory=list)
    #: Node properties accessed by the statement, grouped by label.
    node_properties: Dict[str, List[str]] = field(default_factory=dict)
    #: Relationship properties accessed by the statement, grouped by type.
    relationship_properties: Dict[str, List[str]] = field(default_factory=dict)
    #: Per-label lineage: each accessed node label mapped to the properties
    #: accessed on it and the sources that back it.
    nodes: Dict[str, NodeInfo] = field(default_factory=dict)
    #: Per-type lineage: each accessed relationship type mapped to the
    #: properties accessed on it and the sources that back it.
    relationships: Dict[str, RelationshipInfo] = field(default_factory=dict)


class StatementInfoCrawler:
    """Walks parsed FlowQuery statement ASTs and extracts a :class:`StatementInfo`.

    The crawler does not execute the statement. It only inspects the AST
    structure plus the live :class:`~..graph.database.Database` registry
    (to resolve sources for virtuals that are referenced but not (re-)declared
    in the AST).

    Example:
        crawler = StatementInfoCrawler()
        info = crawler.crawl(ast)
        print(info.node_labels)
    """

    def __init__(self) -> None:
        self._node_labels: Set[str] = set()
        self._rel_types: Set[str] = set()
        self._node_props: Dict[str, Set[str]] = {}
        self._rel_props: Dict[str, Set[str]] = {}
        self._node_sources: Dict[str, Set[str]] = {}
        self._rel_sources: Dict[str, Set[str]] = {}
        self._own_created_node_labels: Set[str] = set()
        self._own_created_rel_types: Set[str] = set()
        # (label, statement) for inline CREATE VIRTUAL node clauses.
        self._own_node_creates: List[Tuple[str, ASTNode]] = []
        # (type, statement) for inline CREATE VIRTUAL relationship clauses.
        self._own_rel_creates: List[Tuple[str, ASTNode]] = []

    def crawl(self, statements: Union[ASTNode, Iterable[ASTNode]]) -> StatementInfo:
        """Walks one or more statement ASTs and returns the merged structural info.

        Args:
            statements: A single statement root, or an iterable of roots
                (for multi-statement queries).
        """
        self._reset()
        roots: Iterable[ASTNode]
        if isinstance(statements, ASTNode):
            roots = [statements]
        else:
            roots = statements
        for root in roots:
            self._crawl_statement(root)
        self._resolve_registered_sources()
        return self._snapshot()

    def _reset(self) -> None:
        self._node_labels = set()
        self._rel_types = set()
        self._node_props = {}
        self._rel_props = {}
        self._node_sources = {}
        self._rel_sources = {}
        self._own_created_node_labels = set()
        self._own_created_rel_types = set()
        self._own_node_creates = []
        self._own_rel_creates = []

    def _crawl_statement(self, root: ASTNode) -> None:
        try:
            op = root.first_child()
        except Exception:
            return
        if not isinstance(op, Operation):
            return
        current: Optional[Operation] = op
        while current is not None:
            self._visit_operation(current)
            current = current.next

    def _visit_operation(self, op: Operation) -> None:
        if isinstance(op, CreateNode):
            node = op.node
            if node is not None and node.label:
                self._node_labels.add(node.label)
                self._own_created_node_labels.add(node.label)
                if op.statement is not None:
                    self._own_node_creates.append((node.label, op.statement))
        elif isinstance(op, CreateRelationship):
            rel = op.relationship
            if rel is not None and rel.type:
                self._rel_types.add(rel.type)
                self._own_created_rel_types.add(rel.type)
                if op.statement is not None:
                    self._own_rel_creates.append((rel.type, op.statement))
            if rel is not None and rel.source is not None and rel.source.label:
                self._node_labels.add(rel.source.label)
            if rel is not None and rel.target is not None and rel.target.label:
                self._node_labels.add(rel.target.label)
        elif isinstance(op, DeleteNode):
            if op.node is not None and op.node.label:
                self._node_labels.add(op.node.label)
        elif isinstance(op, DeleteRelationship):
            rel = op.relationship
            if rel is not None and rel.type:
                self._rel_types.add(rel.type)
            if rel is not None and rel.source is not None and rel.source.label:
                self._node_labels.add(rel.source.label)
            if rel is not None and rel.target is not None and rel.target.label:
                self._node_labels.add(rel.target.label)
        elif isinstance(op, Match):
            for pattern in op.patterns:
                for element in pattern.chain:
                    if isinstance(element, Node):
                        for lbl in element.labels:
                            self._node_labels.add(lbl)
                        for prop_key in element.properties.keys():
                            self._add_node_prop(element.labels, prop_key)
                    elif isinstance(element, Relationship):
                        for t in element.types:
                            self._rel_types.add(t)
                        for prop_key in element.properties.keys():
                            self._add_rel_prop(element.types, prop_key)

        # CREATE/DELETE VIRTUAL operations describe registry mutations rather
        # than query-side property accesses; their inner ASTs are crawled
        # separately for sources, but we don't surface their property usage.
        if not isinstance(
            op, (CreateNode, CreateRelationship, DeleteNode, DeleteRelationship)
        ):
            self._collect_property_accesses(op)

    def _resolve_registered_sources(self) -> None:
        # Sources from inline CREATE VIRTUAL clauses in the crawled statements.
        for label, stmt in self._own_node_creates:
            self._collect_sources(stmt, self._node_sources.setdefault(label, set()))
        for type_, stmt in self._own_rel_creates:
            self._collect_sources(stmt, self._rel_sources.setdefault(type_, set()))

        # Sources from already-registered virtuals that the crawled statements
        # reference (e.g. MATCH/DELETE against a virtual registered earlier).
        db = Database.get_instance()
        for label in self._node_labels:
            if label in self._own_created_node_labels:
                continue
            physical = db.nodes.get(label)
            if physical is not None and physical.statement is not None:
                self._collect_sources(
                    physical.statement, self._node_sources.setdefault(label, set())
                )
        for type_ in self._rel_types:
            if type_ in self._own_created_rel_types:
                continue
            type_map = db.relationships.get(type_)
            if type_map is None:
                continue
            for physical_rel in type_map.values():
                if physical_rel.statement is not None:
                    self._collect_sources(
                        physical_rel.statement,
                        self._rel_sources.setdefault(type_, set()),
                    )

    def _collect_property_accesses(self, root: ASTNode) -> None:
        visited: Set[int] = set()
        stack: List[ASTNode] = [root]
        while stack:
            node = stack.pop()
            node_id = id(node)
            if node_id in visited:
                continue
            visited.add(node_id)

            if isinstance(node, Lookup):
                variable = node.variable
                index = node.index
                if isinstance(variable, Reference) and isinstance(index, Identifier):
                    referred = variable.referred
                    prop_name = index.value()
                    if isinstance(prop_name, str) and prop_name:
                        if isinstance(referred, Node):
                            self._add_node_prop(referred.labels, prop_name)
                        elif isinstance(referred, Relationship):
                            self._add_rel_prop(referred.types, prop_name)

            for child in node.get_children():
                stack.append(child)
            # Subquery expressions hold their inner AST in a private field
            # rather than as a child; descend into it explicitly.
            if isinstance(node, SubqueryExpression):
                inner = getattr(node, "_subquery_ast", None)
                if isinstance(inner, ASTNode):
                    stack.append(inner)

    def _collect_sources(self, statement: ASTNode, target: Set[str]) -> None:
        try:
            op = statement.first_child()
        except Exception:
            return
        if not isinstance(op, Operation):
            return
        current: Optional[Operation] = op
        while current is not None:
            if isinstance(current, Load):
                if current.is_async_function:
                    fn = current.async_function
                    name = getattr(fn, "name", None) if fn is not None else None
                    if isinstance(name, str) and name:
                        target.add(name)
                else:
                    try:
                        from_ = current.from_
                    except Exception:
                        from_ = None
                    if isinstance(from_, str) and from_:
                        target.add(from_)
            current = current.next

    def _add_node_prop(self, labels: Iterable[str], prop: str) -> None:
        for label in labels:
            if not label:
                continue
            self._node_props.setdefault(label, set()).add(prop)

    def _add_rel_prop(self, types: Iterable[str], prop: str) -> None:
        for type_ in types:
            if not type_:
                continue
            self._rel_props.setdefault(type_, set()).add(prop)

    def _snapshot(self) -> StatementInfo:
        all_sources: Set[str] = set()
        nodes: Dict[str, NodeInfo] = {}
        for label in self._node_labels:
            props = self._node_props.get(label, set())
            sources = self._node_sources.get(label, set())
            all_sources.update(sources)
            nodes[label] = NodeInfo(
                properties=sorted(props),
                sources=sorted(sources),
            )
        relationships: Dict[str, RelationshipInfo] = {}
        for type_ in self._rel_types:
            props = self._rel_props.get(type_, set())
            sources = self._rel_sources.get(type_, set())
            all_sources.update(sources)
            relationships[type_] = RelationshipInfo(
                properties=sorted(props),
                sources=sorted(sources),
            )
        info = StatementInfo(
            node_labels=sorted(self._node_labels),
            relationship_types=sorted(self._rel_types),
            sources=sorted(all_sources),
            node_properties={
                label: sorted(props) for label, props in self._node_props.items()
            },
            relationship_properties={
                type_: sorted(props) for type_, props in self._rel_props.items()
            },
            nodes=nodes,
            relationships=relationships,
        )
        return info

    @staticmethod
    def clone(info: StatementInfo) -> StatementInfo:
        """Returns a deep copy of a StatementInfo so callers can mutate it freely."""
        return StatementInfo(
            node_labels=list(info.node_labels),
            relationship_types=list(info.relationship_types),
            sources=list(info.sources),
            node_properties=deepcopy(info.node_properties),
            relationship_properties=deepcopy(info.relationship_properties),
            nodes={
                label: NodeInfo(
                    properties=list(entry.properties),
                    sources=list(entry.sources),
                )
                for label, entry in info.nodes.items()
            },
            relationships={
                type_: RelationshipInfo(
                    properties=list(entry.properties),
                    sources=list(entry.sources),
                )
                for type_, entry in info.relationships.items()
            },
        )
