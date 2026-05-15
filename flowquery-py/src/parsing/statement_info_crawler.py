"""Crawler that extracts structural information from parsed FlowQuery statements."""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, field
from typing import Any, Dict, Generator, Iterable, List, Optional, Set, Tuple, Union

from ..graph.database import Database
from ..graph.node import Node
from ..graph.node_reference import NodeReference
from ..graph.relationship import Relationship
from .ast_node import ASTNode
from .data_structures.lookup import Lookup
from .expressions.binding_reference import BindingReference
from .expressions.expression import Expression
from .expressions.f_string import FString
from .expressions.identifier import Identifier
from .expressions.operator import Equals, In
from .expressions.parameter_reference import ParameterReference
from .expressions.reference import Reference
from .expressions.subquery_expression import SubqueryExpression
from .functions.aggregate_function import AggregateFunction
from .operations.aggregated_return import AggregatedReturn
from .operations.aggregated_with import AggregatedWith
from .operations.create_node import CreateNode
from .operations.create_relationship import CreateRelationship
from .operations.delete_node import DeleteNode
from .operations.delete_relationship import DeleteRelationship
from .operations.let import Let
from .operations.load import Load
from .operations.match import Match
from .operations.operation import Operation
from .operations.order_by import OrderBy
from .operations.projection import Projection
from .operations.return_op import Return
from .operations.with_op import With


@dataclass
class NodeInfo:
    """Per-entity lineage for a node label.

    Captures which properties the query accesses on a label, the sources
    backing the virtual definition, and any literal values supplied for
    those properties at the call site.
    """

    properties: List[str] = field(default_factory=list)
    sources: List[str] = field(default_factory=list)
    #: Literal values supplied for this label's properties at the call
    #: site. Collected from inline node-property assignments
    #: (``(u:User {id: 'rick.o'})``) and from equality / ``IN`` predicates
    #: (``WHERE u.id = 'rick.o'``, ``WHERE u.id IN ['a', 'b']``).
    #:
    #: Only purely literal AST subtrees (no references, parameters,
    #: f-strings, or subqueries) are captured. Empty when no qualifying
    #: literals exist.
    literal_values: Dict[str, List[Any]] = field(default_factory=dict)


@dataclass
class RelationshipInfo:
    """Per-entity lineage for a relationship type.

    A single type may have multiple sources when it spans several
    ``(:From)-[:Type]-(:To)`` definitions.
    """

    properties: List[str] = field(default_factory=list)
    sources: List[str] = field(default_factory=list)
    #: Literal values supplied for this type's properties at the call site.
    literal_values: Dict[str, List[Any]] = field(default_factory=dict)


@dataclass
class DeclaredEntityInfo:
    """Schema-level lineage: the full set of properties projected by a virtual
    definition (independent of whether the crawled statement consumes them)
    plus the sources that back the definition.
    """

    properties: List[str] = field(default_factory=list)
    sources: List[str] = field(default_factory=list)


@dataclass
class DeclaredInfo:
    """Schema-declared lineage for both nodes and relationships."""

    nodes: Dict[str, DeclaredEntityInfo] = field(default_factory=dict)
    relationships: Dict[str, DeclaredEntityInfo] = field(default_factory=dict)


@dataclass
class ColumnReference:
    """A single ``alias.property`` access that contributes to an output
    column.
    """

    #: The binding name as written in the query (e.g. ``'c'`` in ``c.name``).
    alias: str
    #: Whether the binding is a node or a relationship.
    kind: str  # "node" | "relationship"
    #: Node labels (when ``kind == 'node'``) or relationship types (when
    #: ``kind == 'relationship'``).  Multi-label intersection matches
    #: surface every label.
    labels: List[str] = field(default_factory=list)
    #: The property name read off the binding (e.g. ``'name'`` in
    #: ``c.name``).
    property: str = ""


@dataclass
class ColumnLineage:
    """Per-output-column lineage.

    Bridges the AST-level access list with the runtime row provenance:
    for each column the runner emits, this tells you which
    ``alias.property`` reads went into it and how they were combined.

    ``kind`` summarises the column expression:

    * ``'literal'`` - the column is a literal expression with no bindings.
    * ``'property'`` - a single direct ``alias.property`` access (or a
      pass-through projection of one).
    * ``'expression'`` - a computed expression over one or more
      ``alias.property`` accesses.
    * ``'aggregate'`` - contains an aggregate function (``count``,
      ``sum``, ``collect``, ...).
    """

    references: List[ColumnReference] = field(default_factory=list)
    kind: str = "literal"  # "literal" | "property" | "expression" | "aggregate"
    aggregate: Optional[str] = None


@dataclass
class StatementInfo:
    """Structural information extracted from a parsed FlowQuery statement.

    Captures the node labels, relationship types, data sources, and properties
    the query references — independent of whether/when it has been executed.
    The properties listed are those accessed by the *query itself* (e.g.
    ``n.name`` in a MATCH/RETURN/WHERE/ORDER BY), not the columns produced
    by the underlying virtual node/relationship definitions.

    To trace the full lineage from a property to its source, use the
    :attr:`nodes` / :attr:`relationships` maps. Each entry there links a
    label/type to its accessed properties, the sources that back it, and
    any literal values supplied at the call site.

    To validate a query against the registered schema, use
    :attr:`declared`, which lists the *full* set of properties projected
    by each virtual's RETURN clause (or final WITH if no RETURN exists)
    regardless of whether the query consumes them.
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
    #: accessed on it, the sources that back it, and any literal values
    #: supplied at the call site.
    nodes: Dict[str, NodeInfo] = field(default_factory=dict)
    #: Per-type lineage: each accessed relationship type mapped to the
    #: properties accessed on it, the sources that back it, and any
    #: literal values supplied at the call site.
    relationships: Dict[str, RelationshipInfo] = field(default_factory=dict)
    #: Schema-declared lineage. Lists, per label / relationship type, the
    #: full set of properties projected by the virtual's RETURN clause
    #: (or final WITH if no RETURN is present) — independent of whether
    #: the crawled statement actually consumes them.
    declared: DeclaredInfo = field(default_factory=DeclaredInfo)
    #: Per-output-column lineage for the final ``RETURN`` clause.  Maps
    #: each result column name to the ``alias.property`` accesses that
    #: compose it.  Empty (``{}``) when the statement has no ``RETURN``
    #: (e.g. pure CREATE / DELETE statements).
    #:
    #: Combine with :attr:`Runner.provenance` to trace a result-row cell
    #: back to its source node / relationship id, the matched property
    #: value, and the originating virtual sub-query (all available when
    #: the runner is constructed with ``RunnerOptions(provenance=True)``).
    returns: Dict[str, ColumnLineage] = field(default_factory=dict)


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
        self._node_literals: Dict[str, Dict[str, List[Any]]] = {}
        self._rel_literals: Dict[str, Dict[str, List[Any]]] = {}
        self._node_declared_props: Dict[str, Set[str]] = {}
        self._rel_declared_props: Dict[str, Set[str]] = {}
        self._node_declared_sources: Dict[str, Set[str]] = {}
        self._rel_declared_sources: Dict[str, Set[str]] = {}
        self._own_created_node_labels: Set[str] = set()
        self._own_created_rel_types: Set[str] = set()
        # (label, statement) for inline CREATE VIRTUAL node clauses.
        self._own_node_creates: List[Tuple[str, ASTNode]] = []
        # (type, statement) for inline CREATE VIRTUAL relationship clauses.
        self._own_rel_creates: List[Tuple[str, ASTNode]] = []
        # Per-output-column lineage of the most recently visited
        # ``RETURN`` clause.  Overwritten each time a ``Return`` op is
        # visited so the last RETURN wins (matching the user-visible
        # result shape).
        self._returns: Dict[str, ColumnLineage] = {}
        # Map of ``LET name = { ... }`` binding name to the data sources
        # its sub-query right-hand side touches.  Used to follow a
        # downstream ``LOAD JSON FROM name`` reference back to the
        # original URL / file / async-function name.
        self._let_sources: Dict[str, Set[str]] = {}

    def crawl(self, statements: Union[ASTNode, Iterable[ASTNode]]) -> StatementInfo:
        """Walks one or more statement ASTs and returns the merged structural info.

        Args:
            statements: A single statement root, or an iterable of roots
                (for multi-statement queries).
        """
        self._reset()
        roots: List[ASTNode]
        if isinstance(statements, ASTNode):
            roots = [statements]
        else:
            roots = list(statements)
        # Pre-pass: collect the sources each LET-bound sub-query touches
        # so we can follow downstream ``LOAD FROM <letName>`` references
        # back to the underlying URL / file / function.
        for root in roots:
            self._collect_let_sources(root)
        for root in roots:
            self._crawl_statement(root)
        self._resolve_registered_definitions()
        return self._snapshot()

    def _reset(self) -> None:
        self._node_labels = set()
        self._rel_types = set()
        self._node_props = {}
        self._rel_props = {}
        self._node_sources = {}
        self._rel_sources = {}
        self._node_literals = {}
        self._rel_literals = {}
        self._node_declared_props = {}
        self._rel_declared_props = {}
        self._node_declared_sources = {}
        self._rel_declared_sources = {}
        self._own_created_node_labels = set()
        self._own_created_rel_types = set()
        self._own_node_creates = []
        self._own_rel_creates = []
        self._returns = {}
        self._let_sources = {}

    def _collect_let_sources(self, root: ASTNode) -> None:
        """Pre-pass over a statement to record, for each ``LET name =
        { ... }`` with a sub-query right-hand side, the data sources
        its sub-query touches.
        """
        try:
            op = root.first_child()
        except Exception:
            return
        if not isinstance(op, Operation):
            return
        current: Optional[Operation] = op
        while current is not None:
            if isinstance(current, Let) and current.sub_query is not None:
                sources: Set[str] = set()
                self._collect_sources(current.sub_query, sources)
                existing = self._let_sources.setdefault(current.name, set())
                existing.update(sources)
            current = current.next

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
                        # For a WITH-rebound ``MATCH (u)``, the chain
                        # element's own labels are empty; chase the
                        # underlying binding so labels/properties land
                        # on the original :User node.
                        effective_labels = (
                            list(element.labels)
                            if element.labels
                            else self._effective_labels_for(element)
                        )
                        for lbl in effective_labels:
                            self._node_labels.add(lbl)
                        for prop_key, expr in element.properties.items():
                            self._add_node_prop(effective_labels, prop_key)
                            self._try_add_node_literal(
                                effective_labels, prop_key, expr
                            )
                    elif isinstance(element, Relationship):
                        for t in element.types:
                            self._rel_types.add(t)
                        for prop_key, expr in element.properties.items():
                            self._add_rel_prop(element.types, prop_key)
                            self._try_add_rel_literal(element.types, prop_key, expr)

        # CREATE/DELETE VIRTUAL operations describe registry mutations rather
        # than query-side property accesses; their inner ASTs are crawled
        # separately for sources, but we don't surface their property usage.
        if not isinstance(
            op, (CreateNode, CreateRelationship, DeleteNode, DeleteRelationship)
        ):
            self._collect_property_accesses(op)

        # Capture per-output-column lineage from the final RETURN.  Each
        # Return op we visit overwrites the previous result so chained
        # statements end up with the lineage of the last RETURN, which is
        # what the caller actually sees in ``runner.results``.
        if isinstance(op, Return):
            self._returns = self._collect_return_columns(op)

    def _resolve_registered_definitions(self) -> None:
        # Sources and declared properties from inline CREATE VIRTUAL clauses
        # in the crawled statements.
        for label, stmt in self._own_node_creates:
            self._collect_sources(stmt, self._node_sources.setdefault(label, set()))
            self._collect_sources(
                stmt, self._node_declared_sources.setdefault(label, set())
            )
            self._collect_declared_props(
                stmt, self._node_declared_props.setdefault(label, set())
            )
        for type_, stmt in self._own_rel_creates:
            self._collect_sources(stmt, self._rel_sources.setdefault(type_, set()))
            self._collect_sources(
                stmt, self._rel_declared_sources.setdefault(type_, set())
            )
            self._collect_declared_props(
                stmt, self._rel_declared_props.setdefault(type_, set())
            )

        # Sources / declared properties from already-registered virtuals.
        db = Database.get_instance()
        for label in self._node_labels:
            if label in self._own_created_node_labels:
                continue
            physical = db.nodes.get(label)
            if physical is not None and physical.statement is not None:
                self._collect_sources(
                    physical.statement,
                    self._node_sources.setdefault(label, set()),
                )
                self._collect_sources(
                    physical.statement,
                    self._node_declared_sources.setdefault(label, set()),
                )
                self._collect_declared_props(
                    physical.statement,
                    self._node_declared_props.setdefault(label, set()),
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
                    self._collect_sources(
                        physical_rel.statement,
                        self._rel_declared_sources.setdefault(type_, set()),
                    )
                    self._collect_declared_props(
                        physical_rel.statement,
                        self._rel_declared_props.setdefault(type_, set()),
                    )

    def _collect_property_accesses(self, root: ASTNode) -> None:
        """Walk the AST rooted at ``root`` recording property accesses,
        literal values from equality / IN predicates, and descending into
        subqueries plus the privately-held WHERE / ORDER BY ASTs of
        RETURN-style operations.
        """
        visited: Set[int] = set()
        stack: List[ASTNode] = [root]
        while stack:
            node = stack.pop()
            node_id = id(node)
            if node_id in visited:
                continue
            visited.add(node_id)

            if isinstance(node, Lookup):
                self._handle_lookup_access(node)

            if isinstance(node, Equals):
                self._handle_equality_literal(node)
            elif isinstance(node, In):
                self._handle_in_literal(node)

            for child in node.get_children():
                stack.append(child)
            # Subquery expressions hold their inner AST in a private field
            # rather than as a child; descend into it explicitly.
            if isinstance(node, SubqueryExpression):
                inner = getattr(node, "_subquery_ast", None)
                if isinstance(inner, ASTNode):
                    stack.append(inner)
            # RETURN / AggregatedReturn hold WHERE and ORDER BY clauses in
            # private fields; descend into the ones with expression trees.
            if isinstance(node, Return):
                w = getattr(node, "_where", None)
                o = getattr(node, "_order_by", None)
                if isinstance(w, ASTNode):
                    stack.append(w)
                if isinstance(o, ASTNode):
                    stack.append(o)
            # OrderBy stores its sort expressions in a private array of
            # SortField objects rather than as AST children; descend
            # explicitly.
            if isinstance(node, OrderBy):
                for sort_field in node.fields:
                    if isinstance(sort_field.expression, ASTNode):
                        stack.append(sort_field.expression)

    def _handle_lookup_access(self, node: Lookup) -> None:
        target = self._resolve_lookup_target(node)
        if target is None:
            return
        kind, names, prop = target
        if kind == "node":
            self._add_node_prop(names, prop)
        else:
            self._add_rel_prop(names, prop)

    def _resolve_lookup_target(
        self, lookup: Lookup
    ) -> Optional[Tuple[str, List[str], str]]:
        """Resolve a ``Lookup`` of the shape ``alias.prop`` to (kind,
        labels-or-types, prop). Returns ``None`` if the lookup isn't of
        that shape or doesn't bind to a Node/Relationship.
        """
        variable = lookup.variable
        index = lookup.index
        if not isinstance(variable, Reference) or not isinstance(index, Identifier):
            return None
        prop_name = index.value()
        if not isinstance(prop_name, str) or not prop_name:
            return None
        referred = self._resolve_bound_entity(variable.referred)
        if isinstance(referred, Node):
            return ("node", list(referred.labels), prop_name)
        if isinstance(referred, Relationship):
            return ("rel", list(referred.types), prop_name)
        return None

    def _resolve_bound_entity(
        self, node: Optional[ASTNode]
    ) -> Optional[Union[Node, Relationship]]:
        """Unwrap a binding chain to the underlying graph entity that
        carries the labels / types relevant for lineage. Handles the
        common WITH-rebind pattern::

            MATCH (u:User) ... WITH u MATCH (u) RETURN u.name

        After ``WITH u``, the variable ``u`` is bound to the WITH's
        ``Expression`` (a passthrough Reference to the original Node).
        The second ``MATCH (u)`` then creates a ``NodeReference`` whose
        own ``labels`` are empty. Without unwrapping, ``u.name`` in
        ``RETURN`` resolves to that empty-labels rebind and the property
        is silently dropped from lineage. Chasing through
        ``Reference.referred``, single-child ``Expression`` nodes, and
        ``NodeReference.reference`` (when the immediate labels are
        empty) recovers the original ``Node(:User)`` binding.
        """
        seen: Set[int] = set()
        current: Optional[ASTNode] = node
        while current is not None and id(current) not in seen:
            seen.add(id(current))
            # NodeReference subclasses Node and copies its base's labels
            # at construction. When those copied labels are empty
            # (``MATCH (u)`` after a WITH-rebind), chase the underlying
            # binding to recover the original labels.
            if isinstance(current, NodeReference):
                if current.labels:
                    return current
                nxt = current.reference
                current = nxt if isinstance(nxt, ASTNode) else None
                continue
            if isinstance(current, Node):
                return current
            if isinstance(current, Relationship):
                return current
            if isinstance(current, Reference):
                current = current.referred
                continue
            if isinstance(current, Expression):
                # Pass-through projections (``WITH u``, ``RETURN u AS u``)
                # wrap a single Reference; arbitrary computed expressions
                # have no useful binding to attribute properties to.
                children = current.get_children()
                if len(children) == 1:
                    current = children[0]
                    continue
                return None
            return None
        return None

    def _effective_labels_for(self, element: Node) -> List[str]:
        """Return the effective labels for a MATCH chain ``Node``
        element. If the element itself is unlabeled (typical for a
        WITH-rebound ``MATCH (u)``), unwrap its binding to inherit the
        original labels.
        """
        if isinstance(element, NodeReference):
            resolved = self._resolve_bound_entity(element)
            if isinstance(resolved, Node):
                return list(resolved.labels)
        return list(element.labels)

    def _handle_equality_literal(self, op: Equals) -> None:
        lhs = op.lhs
        rhs = op.rhs
        # Try both orientations: ``alias.prop = literal`` and ``literal = alias.prop``.
        self._try_record_prop_equality(lhs, rhs)
        self._try_record_prop_equality(rhs, lhs)

    def _try_record_prop_equality(self, side: ASTNode, other: ASTNode) -> None:
        if not isinstance(side, Lookup):
            return
        if not self._is_literal_ast(other):
            return
        target = self._resolve_lookup_target(side)
        if target is None:
            return
        value = self._safe_evaluate(other)
        if value is _UNDEFINED:
            return
        kind, names, prop = target
        if kind == "node":
            self._add_node_literal_value(names, prop, value)
        else:
            self._add_rel_literal_value(names, prop, value)

    def _handle_in_literal(self, op: In) -> None:
        lhs = op.lhs
        rhs = op.rhs
        if not isinstance(lhs, Lookup):
            return
        if not self._is_literal_ast(rhs):
            return
        target = self._resolve_lookup_target(lhs)
        if target is None:
            return
        value = self._safe_evaluate(rhs)
        if value is _UNDEFINED or not isinstance(value, list):
            return
        kind, names, prop = target
        for item in value:
            if kind == "node":
                self._add_node_literal_value(names, prop, item)
            else:
                self._add_rel_literal_value(names, prop, item)

    def _is_literal_ast(self, node: ASTNode) -> bool:
        """Return True iff the AST subtree contains only literal nodes
        (no References, ParameterReferences, Lookups, FStrings, or
        SubqueryExpressions). Used to guard literal-value extraction
        against runtime-dependent expressions.
        """
        if isinstance(
            node,
            (Reference, ParameterReference, Lookup, FString, SubqueryExpression),
        ):
            return False
        for child in node.get_children():
            if not self._is_literal_ast(child):
                return False
        return True

    def _safe_evaluate(self, node: ASTNode) -> Any:
        try:
            return node.value()
        except Exception:
            return _UNDEFINED

    def _try_add_node_literal(
        self, labels: Iterable[str], prop: str, expr: Expression
    ) -> None:
        if not self._is_literal_ast(expr):
            return
        value = self._safe_evaluate(expr)
        if value is _UNDEFINED:
            return
        self._add_node_literal_value(labels, prop, value)

    def _try_add_rel_literal(
        self, types: Iterable[str], prop: str, expr: Expression
    ) -> None:
        if not self._is_literal_ast(expr):
            return
        value = self._safe_evaluate(expr)
        if value is _UNDEFINED:
            return
        self._add_rel_literal_value(types, prop, value)

    def _collect_declared_props(self, statement: ASTNode, target: Set[str]) -> None:
        """Walk a virtual definition's inner statement to find the final
        RETURN-style projection and record its aliases as the declared
        property set. Falls back to the last WITH if no RETURN exists.
        """
        try:
            op = statement.first_child()
        except Exception:
            return
        if not isinstance(op, Operation):
            return
        last_return: Optional[Projection] = None
        last_with: Optional[Projection] = None
        current: Optional[Operation] = op
        while current is not None:
            if isinstance(current, (Return, AggregatedReturn)):
                last_return = current
            elif isinstance(current, (With, AggregatedWith)):
                last_with = current
            current = current.next
        projection = last_return if last_return is not None else last_with
        if projection is None:
            return
        for alias in self._projection_aliases(projection):
            target.add(alias)

    def _projection_aliases(self, projection: Projection) -> Generator[str, None, None]:
        """Yield the alias of every projected expression in a Projection."""
        for i, child in enumerate(projection.get_children()):
            alias = getattr(child, "alias", None) or f"expr{i}"
            if isinstance(alias, str) and alias:
                yield alias

    def _collect_return_columns(self, op: Return) -> Dict[str, ColumnLineage]:
        """Build the per-column lineage map of a single ``RETURN`` clause.

        Mirrors :meth:`Projection.expressions`'s default-aliasing rule
        so unnamed columns are keyed ``expr0``, ``expr1``, ...
        """
        out: Dict[str, ColumnLineage] = {}
        children = op.get_children()
        for i, expr in enumerate(children):
            if not isinstance(expr, Expression):
                continue
            alias = getattr(expr, "alias", None) or f"expr{i}"
            out[alias] = self._lineage_of_expression(expr)
        return out

    def _lineage_of_expression(self, expr: Expression) -> ColumnLineage:
        """Walk an output-column expression and return the contributing
        ``alias.property`` accesses plus a ``kind`` summarising how
        they were combined.
        """
        refs: List[ColumnReference] = []
        seen_keys: Set[str] = set()
        has_aggregate = False
        aggregate_name: Optional[str] = None
        has_lookup = False

        stack: List[ASTNode] = [expr]
        seen: Set[int] = set()
        while stack:
            node = stack.pop()
            if id(node) in seen:
                continue
            seen.add(id(node))

            if isinstance(node, AggregateFunction):
                has_aggregate = True
                if aggregate_name is None:
                    aggregate_name = getattr(node, "name", None)
            if isinstance(node, Lookup):
                has_lookup = True
                target = self._resolve_lookup_target(node)
                alias_name = self._alias_of_lookup(node)
                if target is not None and alias_name is not None:
                    kind, names, prop = target
                    key = f"{alias_name}\x00{prop}"
                    if key not in seen_keys:
                        seen_keys.add(key)
                        refs.append(
                            ColumnReference(
                                alias=alias_name,
                                kind="node" if kind == "node" else "relationship",
                                labels=list(names),
                                property=prop,
                            )
                        )

            for child in node.get_children():
                stack.append(child)
            if isinstance(node, SubqueryExpression):
                inner = getattr(node, "_subquery_ast", None)
                if isinstance(inner, ASTNode):
                    stack.append(inner)

        if has_aggregate:
            kind_str = "aggregate"
        elif not has_lookup:
            kind_str = "literal"
        elif len(refs) == 1 and self._is_simple_property_projection(expr):
            kind_str = "property"
        else:
            kind_str = "expression"

        return ColumnLineage(
            references=refs,
            kind=kind_str,
            aggregate=aggregate_name if has_aggregate else None,
        )

    def _alias_of_lookup(self, lookup: Lookup) -> Optional[str]:
        """Return the user-written identifier of a ``Lookup``'s
        variable side (e.g. ``'c'`` in ``c.name``), or ``None`` if the
        variable isn't a plain :class:`Reference` to a named binding.
        """
        variable = lookup.variable
        if isinstance(variable, Reference):
            return variable.identifier
        return None

    def _is_simple_property_projection(self, expr: Expression) -> bool:
        """True iff the expression is a direct ``alias.property``
        projection (possibly wrapped in a single-child pass-through
        :class:`Expression`), with no operators, functions, or
        additional references.
        """
        current: ASTNode = expr
        while isinstance(current, Expression):
            children = current.get_children()
            if len(children) != 1:
                return False
            current = children[0]
        return isinstance(current, Lookup)

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
                    # Inspect the AST directly so a ``LOAD FROM
                    # <letName>`` produces a stable ``let://<name>``
                    # source label without invoking the
                    # ``BindingReference``'s runtime lookup (which would
                    # either throw or return a non-string value).  The
                    # parser wraps the reference in an ``Expression``
                    # so we unwrap one level to find the
                    # ``BindingReference`` itself.
                    source_child: Optional[ASTNode] = (
                        current.from_component.first_child()
                        if current.from_component is not None
                        else None
                    )
                    if source_child is not None and not isinstance(
                        source_child, BindingReference
                    ):
                        inner = (
                            source_child.first_child()
                            if hasattr(source_child, "first_child")
                            else None
                        )
                        if isinstance(inner, BindingReference):
                            source_child = inner
                    if isinstance(source_child, BindingReference):
                        binding_name = source_child.name
                        target.add(f"let://{binding_name}")
                        # Chase through to the LET's own sources when
                        # we've seen the binding's definition in the
                        # same crawl.
                        let_sources = self._let_sources.get(binding_name)
                        if let_sources is not None:
                            target.update(let_sources)
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

    def _add_node_literal_value(
        self, labels: Iterable[str], prop: str, value: Any
    ) -> None:
        for label in labels:
            if not label:
                continue
            prop_map = self._node_literals.setdefault(label, {})
            self._append_unique_literal(prop_map, prop, value)

    def _add_rel_literal_value(
        self, types: Iterable[str], prop: str, value: Any
    ) -> None:
        for type_ in types:
            if not type_:
                continue
            prop_map = self._rel_literals.setdefault(type_, {})
            self._append_unique_literal(prop_map, prop, value)

    def _append_unique_literal(
        self, prop_map: Dict[str, List[Any]], prop: str, value: Any
    ) -> None:
        arr = prop_map.setdefault(prop, [])
        for existing in arr:
            if self._literals_equal(existing, value):
                return
        arr.append(value)

    def _literals_equal(self, a: Any, b: Any) -> bool:
        # Mirrors deepEquals for JSON-comparable values; falls back to ==
        # for primitives. Python's == handles most cases natively, but we
        # special-case bool/int because True == 1 in Python.
        if type(a) is not type(b):
            return False
        return bool(a == b)

    def _literals_snapshot(
        self, lit_map: Dict[str, Dict[str, List[Any]]], key: str
    ) -> Dict[str, List[Any]]:
        prop_map = lit_map.get(key)
        if not prop_map:
            return {}
        out: Dict[str, List[Any]] = {}
        for prop_key in sorted(prop_map.keys()):
            out[prop_key] = list(prop_map[prop_key])
        return out

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
                literal_values=self._literals_snapshot(self._node_literals, label),
            )
        relationships: Dict[str, RelationshipInfo] = {}
        for type_ in self._rel_types:
            props = self._rel_props.get(type_, set())
            sources = self._rel_sources.get(type_, set())
            all_sources.update(sources)
            relationships[type_] = RelationshipInfo(
                properties=sorted(props),
                sources=sorted(sources),
                literal_values=self._literals_snapshot(self._rel_literals, type_),
            )
        declared_nodes: Dict[str, DeclaredEntityInfo] = {}
        for label in self._node_labels:
            props = self._node_declared_props.get(label, set())
            sources = self._node_declared_sources.get(label, set())
            if props or sources:
                declared_nodes[label] = DeclaredEntityInfo(
                    properties=sorted(props),
                    sources=sorted(sources),
                )
        declared_relationships: Dict[str, DeclaredEntityInfo] = {}
        for type_ in self._rel_types:
            props = self._rel_declared_props.get(type_, set())
            sources = self._rel_declared_sources.get(type_, set())
            if props or sources:
                declared_relationships[type_] = DeclaredEntityInfo(
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
            declared=DeclaredInfo(
                nodes=declared_nodes,
                relationships=declared_relationships,
            ),
            returns=StatementInfoCrawler._clone_returns_static(self._returns),
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
                    literal_values=deepcopy(entry.literal_values),
                )
                for label, entry in info.nodes.items()
            },
            relationships={
                type_: RelationshipInfo(
                    properties=list(entry.properties),
                    sources=list(entry.sources),
                    literal_values=deepcopy(entry.literal_values),
                )
                for type_, entry in info.relationships.items()
            },
            declared=DeclaredInfo(
                nodes={
                    label: DeclaredEntityInfo(
                        properties=list(entry.properties),
                        sources=list(entry.sources),
                    )
                    for label, entry in info.declared.nodes.items()
                },
                relationships={
                    type_: DeclaredEntityInfo(
                        properties=list(entry.properties),
                        sources=list(entry.sources),
                    )
                    for type_, entry in info.declared.relationships.items()
                },
            ),
            returns=StatementInfoCrawler._clone_returns_static(info.returns),
        )

    @staticmethod
    def _clone_returns_static(
        returns: Dict[str, ColumnLineage],
    ) -> Dict[str, ColumnLineage]:
        out: Dict[str, ColumnLineage] = {}
        for col, lineage in returns.items():
            out[col] = ColumnLineage(
                references=[
                    ColumnReference(
                        alias=r.alias,
                        kind=r.kind,
                        labels=list(r.labels),
                        property=r.property,
                    )
                    for r in lineage.references
                ],
                kind=lineage.kind,
                aggregate=lineage.aggregate,
            )
        return out


# Sentinel used internally to distinguish "evaluation succeeded with value
# None" from "evaluation could not be performed".
_UNDEFINED = object()
