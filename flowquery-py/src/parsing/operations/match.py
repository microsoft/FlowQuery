"""Represents a MATCH operation for graph pattern matching."""

from typing import Dict, List, Optional, Tuple

from ...graph.node import Node
from ...graph.pattern import Pattern
from ...graph.patterns import Patterns
from ..ast_node import ASTNode
from ..data_structures.lookup import Lookup
from ..expressions.expression import Expression
from ..expressions.identifier import Identifier
from ..expressions.operator import And, Equals
from ..expressions.reference import Reference
from .operation import Operation
from .where import Where


class Match(Operation):
    """Represents a MATCH operation for graph pattern matching."""

    def __init__(self, patterns: Optional[List[Pattern]] = None, optional: bool = False) -> None:
        super().__init__()
        self._patterns = Patterns(patterns or [])
        self._optional = optional

    @property
    def patterns(self) -> List[Pattern]:
        return self._patterns.patterns if self._patterns else []

    @property
    def optional(self) -> bool:
        return self._optional

    def __str__(self) -> str:
        return "OptionalMatch" if self._optional else "Match"

    async def run(self) -> None:
        """Executes the match operation by chaining the patterns together.
        If optional and no match is found, continues with null values."""
        self._extract_where_predicates()
        await self._patterns.initialize()
        matched = False

        async def to_do_next() -> None:
            nonlocal matched
            matched = True
            if self.next:
                await self.next.run()

        self._patterns.to_do_next = to_do_next
        await self._patterns.traverse()

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
