"""Represents a MATCH operation for graph pattern matching."""

from contextlib import aclosing
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Tuple

from ...graph.node import Node
from ...graph.pattern import Pattern
from ...graph.patterns import Patterns
from ...graph.relationship import RelationshipScope
from ...graph.source_access import is_static_expression
from ..ast_node import ASTNode
from ..data_structures.lookup import Lookup
from ..expressions.expression import Expression
from ..expressions.identifier import Identifier
from ..expressions.operator import (
    And,
    Equals,
    GreaterThan,
    GreaterThanOrEqual,
    In,
    LessThan,
    LessThanOrEqual,
)
from ..expressions.reference import Reference
from .operation import Operation
from .where import Where

if TYPE_CHECKING:
    from ...graph.source_context import SourceContext


class Match(Operation):
    """Represents a MATCH operation for graph pattern matching."""

    def __init__(self, patterns: Optional[List[Pattern]] = None, optional: bool = False) -> None:
        super().__init__()
        self._patterns = Patterns(patterns or [])
        self._optional = optional
        self._source_context: Optional["SourceContext"] = None
        # openCypher: a relationship is bound at most once per MATCH clause,
        # across all of its comma-separated patterns.
        scope = RelationshipScope()
        for pattern in patterns or []:
            pattern.relationship_scope = scope
        self._scope = scope

    @property
    def patterns(self) -> List[Pattern]:
        return self._patterns.patterns if self._patterns else []

    @property
    def optional(self) -> bool:
        return self._optional

    @property
    def source_context(self) -> Optional["SourceContext"]:
        """Query-scoped source context assigned by the runner (internal)."""
        return self._source_context

    @source_context.setter
    def source_context(self, ctx: Optional["SourceContext"]) -> None:
        self._source_context = ctx

    @property
    def saturated(self) -> bool:
        return self.next.saturated if self.next else False

    def __str__(self) -> str:
        return "OptionalMatch" if self._optional else "Match"

    async def run(self) -> None:
        """Executes the match operation by chaining the patterns together.
        If optional and no match is found, continues with null values."""
        self._extract_where_predicates()
        self._extract_pushdown_predicates()
        # Drop claims an abandoned traversal (early termination) may not
        # have released yet; no binding of this MATCH is live here.
        self._scope.reset()
        await self._patterns.initialize(self._source_context)
        matched = False

        async with aclosing(self._patterns.traverse()) as traversal:
            async for _ in traversal:
                if self._source_context is not None:
                    self._source_context.throw_if_cancelled()
                matched = True
                if self.next:
                    await self.next.run()
                    # Nothing downstream can change any more (e.g. LIMIT
                    # reached): stop reading so source reads close early.
                    if self.next.saturated:
                        break

        # For OPTIONAL MATCH: if nothing matched, continue with None values
        if not matched and self._optional:
            for pattern in self._patterns.patterns:
                for element in pattern.chain:
                    if isinstance(element, Node):
                        element.set_value(None)
            if self.next:
                await self.next.run()

    def _extract_where_predicates(self) -> None:
        """Extracts simple equality predicates from the immediately following WHERE clause
        and merges them into the matching nodes' properties so they can be passed as
        $-parameters to virtual node/relationship definitions."""
        if not isinstance(self.next, Where):
            return
        where = self.next
        predicates = self._collect_equality_predicates(where.expression.first_child())
        if not predicates:
            return
        # Build a map of node identifiers to their Node objects
        node_map: Dict[str, Node] = {}
        for pattern in self._patterns.patterns:
            for element in pattern.chain:
                if isinstance(element, Node) and element.identifier is not None:
                    node_map[element.identifier] = element
        # Add extracted predicates as properties on the matching nodes
        for node_id, prop, value_expr in predicates:
            node = node_map.get(node_id)
            if node is not None and prop not in node.properties:
                node.set_property(prop, value_expr)

    def _extract_pushdown_predicates(self) -> None:
        """Attaches range and IN comparisons from the immediately following
        WHERE clause to the pattern nodes so that source providers may
        evaluate them. The WHERE clause stays in place and re-checks every
        row, so sources only need to return a superset. Not applied to
        OPTIONAL MATCH, whose null-row semantics depend on the full
        candidate set."""
        node_map: Dict[str, Node] = {}
        for pattern in self._patterns.patterns:
            for element in pattern.chain:
                if type(element) is Node:
                    element.pushed_predicates = []
                    if element.identifier is not None:
                        node_map[element.identifier] = element
        if self._optional or not isinstance(self.next, Where):
            return
        where = self.next
        for identifier, predicate in self._collect_pushdown_predicates(
            where.expression.first_child()
        ):
            target = node_map.get(identifier)
            if target is not None:
                target.pushed_predicates = [*target.pushed_predicates, predicate]

    _PUSHDOWN_OPS: List[Tuple[type, str, Optional[str]]] = [
        (GreaterThan, "gt", "lt"),
        (GreaterThanOrEqual, "gte", "lte"),
        (LessThan, "lt", "gt"),
        (LessThanOrEqual, "lte", "gte"),
        (In, "in", None),
    ]

    def _collect_pushdown_predicates(
        self, node: ASTNode
    ) -> List[Tuple[str, Dict[str, Any]]]:
        if isinstance(node, And):
            return (
                self._collect_pushdown_predicates(node.lhs)
                + self._collect_pushdown_predicates(node.rhs)
            )
        for op_type, op, flipped in self._PUSHDOWN_OPS:
            if not isinstance(node, op_type):
                continue
            operator: Any = node
            direct = self._pushdown_term(operator.lhs, operator.rhs, op)
            if direct is not None:
                return [direct]
            if flipped is not None:
                reversed_term = self._pushdown_term(operator.rhs, operator.lhs, flipped)
                if reversed_term is not None:
                    return [reversed_term]
            return []
        return []

    def _pushdown_term(
        self, lookup_side: ASTNode, value_side: ASTNode, op: str
    ) -> Optional[Tuple[str, Dict[str, Any]]]:
        if (
            not isinstance(lookup_side, Lookup)
            or not isinstance(lookup_side.variable, Reference)
            or not isinstance(lookup_side.index, Identifier)
            or not is_static_expression(value_side)
        ):
            return None
        return (
            lookup_side.variable.identifier,
            {
                "op": op,
                "property": lookup_side.index.value(),
                "expression": value_side,
            },
        )

    def _collect_equality_predicates(
        self, node: ASTNode
    ) -> List[Tuple[str, str, Expression]]:
        """Recursively collects equality predicates from the expression tree."""
        if isinstance(node, And):
            return (
                self._collect_equality_predicates(node.lhs)
                + self._collect_equality_predicates(node.rhs)
            )
        if isinstance(node, Equals):
            result = self._try_extract_equality(node.lhs, node.rhs)
            if result is not None:
                return [result]
            reversed_result = self._try_extract_equality(node.rhs, node.lhs)
            if reversed_result is not None:
                return [reversed_result]
        return []

    def _try_extract_equality(
        self, lookup_side: ASTNode, value_side: ASTNode
    ) -> Optional[Tuple[str, str, Expression]]:
        """Tries to extract a (nodeIdentifier, property, valueExpression) from a pair."""
        if not isinstance(lookup_side, Lookup):
            return None
        if not isinstance(lookup_side.variable, Reference):
            return None
        if not isinstance(lookup_side.index, Identifier):
            return None
        if not self._is_literal_value(value_side):
            return None
        node_identifier = lookup_side.variable.identifier
        prop = lookup_side.index.value()
        expr = Expression()
        expr.add_node(value_side)
        expr.finish()
        return (node_identifier, prop, expr)

    def _is_literal_value(self, node: ASTNode) -> bool:
        """Checks whether a node is a simple literal value."""
        return node.is_operand() and not isinstance(node, Reference) and not isinstance(node, Lookup)
