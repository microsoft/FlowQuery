"""Main parser for FlowQuery statements."""

import sys
from typing import Any, Dict, Generator, Iterator, List, Optional, Tuple, cast

from ..graph.hops import Hops
from ..graph.node import Node
from ..graph.node_reference import NodeReference
from ..graph.pattern import Pattern
from ..graph.pattern_expression import PatternExpression
from ..graph.relationship import Relationship
from ..graph.relationship_reference import RelationshipReference
from ..tokenization.token import Token
from ..utils.object_utils import ObjectUtils
from .alias import Alias
from .alias_option import AliasOption
from .ast_node import ASTNode
from .base_parser import BaseParser
from .components.from_ import From
from .components.headers import Headers
from .components.null import Null
from .components.post import Post
from .data_structures.associative_array import AssociativeArray
from .data_structures.json_array import JSONArray
from .data_structures.key_value_pair import KeyValuePair
from .data_structures.list_comprehension import ListComprehension
from .data_structures.lookup import Lookup
from .data_structures.range_lookup import RangeLookup
from .expressions.expression import Expression
from .expressions.f_string import FString
from .expressions.identifier import Identifier
from .expressions.operator import (
    Contains,
    EndsWith,
    In,
    Is,
    IsNot,
    Not,
    NotContains,
    NotEndsWith,
    NotIn,
    NotStartsWith,
    StartsWith,
)
from .expressions.parameter_reference import ParameterReference
from .expressions.reference import Reference
from .expressions.string import String
from .expressions.subquery_expression import SubqueryExpression, SubqueryMode
from .functions.aggregate_function import AggregateFunction
from .functions.async_function import AsyncFunction
from .functions.function import Function
from .functions.function_factory import FunctionFactory
from .functions.predicate_function import PredicateFunction
from .logic.case import Case
from .logic.else_ import Else
from .logic.then import Then
from .logic.when import When
from .operations.aggregated_return import AggregatedReturn
from .operations.aggregated_with import AggregatedWith
from .operations.call import Call
from .operations.create_node import CreateNode
from .operations.create_relationship import CreateRelationship
from .operations.delete_node import DeleteNode
from .operations.delete_relationship import DeleteRelationship
from .operations.let import Let
from .operations.limit import Limit
from .operations.load import Load
from .operations.match import Match
from .operations.merge import (
    Merge,
    MergeMatchedAction,
    MergeMatchedDelete,
    MergeMatchedUpdate,
    MergeNotMatchedInsert,
    MergeOnClause,
    MergeOnKeys,
    MergeOnPredicate,
    MergeSetItem,
    MergeSourceAlias,
    MergeTargetAlias,
)
from .operations.operation import Operation
from .operations.order_by import OrderBy, SortField
from .operations.refresh_node import RefreshNode
from .operations.refresh_relationship import RefreshRelationship
from .operations.return_op import Return
from .operations.union import Union
from .operations.union_all import UnionAll
from .operations.unwind import Unwind
from .operations.update import Update
from .operations.update_delete import UpdateDelete
from .operations.where import Where
from .operations.with_op import With
from .parser_state import ParserState


class Parser(BaseParser):
    """Main parser for FlowQuery statements.

    Parses FlowQuery declarative query language statements into an Abstract Syntax Tree (AST).
    Supports operations like WITH, UNWIND, RETURN, LOAD, WHERE, and LIMIT, along with
    expressions, functions, data structures, and logical constructs.

    Example:
        parser = Parser()
        ast = parser.parse("unwind [1, 2, 3, 4, 5] as num return num")
    """

    def __init__(self, tokens: Optional[List[Token]] = None):
        super().__init__(tokens)
        self._state = ParserState()

    def parse(self, statement: str) -> ASTNode:
        """Parses a FlowQuery statement into an Abstract Syntax Tree.

        Args:
            statement: The FlowQuery statement to parse

        Returns:
            The root AST node containing the parsed structure

        Raises:
            ValueError: If the statement is malformed or contains syntax errors
        """
        combined: Optional[ASTNode] = None
        for root in self.parse_statements(statement):
            if combined is None:
                combined = root
            else:
                for child in root.get_children():
                    combined.add_child(child)
        if combined is None:
            raise ValueError("Expected at least one statement")
        return combined

    def parse_statements(self, statement: str) -> Generator[ASTNode, None, None]:
        """Parses a multi-statement FlowQuery input separated by semicolons.

        Only CREATE and DELETE statements may appear before the last statement.
        Yields one AST per statement, validating ordering as it goes.

        Args:
            statement: The FlowQuery input (may contain semicolon separators)

        Yields:
            AST roots, one per statement

        Raises:
            ValueError: If statement ordering rules are violated
        """
        self.tokenize(statement)
        previous: Optional[ASTNode] = None

        while True:
            self._skip_whitespace_and_comments()
            if self.token.is_eof():
                break

            self._state = ParserState()
            root = self._parse_tokenized()

            self._skip_whitespace_and_comments()
            has_more = self.token.is_semicolon()

            if previous is not None:
                self._validate_is_create_or_delete(previous)
                yield previous
            previous = root

            if has_more:
                self.set_next_token()
                continue
            break

        if previous is not None:
            yield previous

    def _validate_is_create_or_delete(self, root: ASTNode) -> None:
        """Validates that all operations in a statement are CREATE, DELETE, REFRESH, LET, or UPDATE."""
        op = root.first_child()
        while op is not None:
            if not isinstance(
                op,
                (
                    CreateNode,
                    CreateRelationship,
                    DeleteNode,
                    DeleteRelationship,
                    RefreshNode,
                    RefreshRelationship,
                    Let,
                    Update,
                    UpdateDelete,
                    Merge,
                ),
            ):
                raise ValueError(
                    "Only CREATE, DELETE, REFRESH, LET, UPDATE, and MERGE statements can appear "
                    "before the last statement in a multi-statement query"
                )
            op = op.next  # type: ignore[assignment]

    def _parse_tokenized(self, is_sub_query: bool = False) -> ASTNode:
        root = ASTNode()
        previous: Optional[Operation] = None
        operation: Optional[Operation] = None

        while not self.token.is_eof():
            if root.child_count() > 0:
                if self.token.is_semicolon():
                    break
                if is_sub_query and self.token.is_closing_brace():
                    return root
                self._expect_and_skip_whitespace_and_comments()
            else:
                self._skip_whitespace_and_comments()

            # UNION separates two query pipelines — break and handle after the loop
            if self.token.is_union():
                break

            if self.token.is_semicolon():
                break

            if self.token.is_eof():
                break

            operation = self._parse_operation()
            if operation is None and not is_sub_query:
                raise ValueError("Expected one of WITH, UNWIND, RETURN, LOAD, OR CALL")
            elif operation is None and is_sub_query:
                return root

            if self._state.returns > 1:
                raise ValueError("Only one RETURN statement is allowed")

            if isinstance(previous, Call) and not previous.has_yield:
                raise ValueError(
                    "CALL operations must have a YIELD clause unless they are the last operation"
                )

            if previous is not None:
                previous.add_sibling(operation)
            else:
                root.add_child(operation)

            where = self._parse_where()
            if where is not None:
                if isinstance(operation, Return):
                    operation.where = where
                else:
                    operation.add_sibling(where)
                    operation = where

            order_by = self._parse_order_by()
            if order_by is not None:
                if isinstance(operation, Return):
                    operation.order_by = order_by
                else:
                    operation.add_sibling(order_by)
                    operation = order_by

            limit = self._parse_limit()
            if limit is not None:
                if isinstance(operation, Return) and not isinstance(operation, AggregatedWith):
                    operation.limit = limit
                else:
                    operation.add_sibling(limit)
                    operation = limit

            # Trailing modifiers (WHERE/ORDER BY/LIMIT) for this clause
            # have been parsed; release the input-scope snapshot taken by
            # any preceding WITH/RETURN so that the next clause starts
            # from a clean lookup state.
            self._state.clear_input_scope()

            previous = operation

        # Handle UNION: wrap left and right pipelines into a Union node
        if not self.token.is_eof() and self.token.is_union():
            if not isinstance(operation, (Return, Call)):
                raise ValueError(
                    "Each side of UNION must end with a RETURN or CALL statement"
                )
            union = self._parse_union()
            assert union is not None
            union.left = root.first_child()  # type: ignore[assignment]
            # Save and reset parser state for right-side scope
            state: ParserState = self._state
            self._state = ParserState()
            right_root = self._parse_tokenized(is_sub_query)
            union.right = right_root.first_child()  # type: ignore[assignment]
            # Restore parser state
            self._state = state
            new_root = ASTNode()
            new_root.add_child(union)
            return new_root

        if not isinstance(
            operation,
            (
                Return,
                Call,
                CreateNode,
                CreateRelationship,
                DeleteNode,
                DeleteRelationship,
                RefreshNode,
                RefreshRelationship,
                Let,
                Update,
                UpdateDelete,
                Merge,
            ),
        ):
            raise ValueError(
                "Last statement must be a RETURN, WHERE, CALL, CREATE, DELETE, REFRESH, LET, UPDATE, or MERGE statement"
            )

        return root

    def _parse_operation(self) -> Optional[Operation]:
        return (
            self._parse_with() or
            self._parse_unwind() or
            self._parse_return() or
            self._parse_load() or
            self._parse_call() or
            self._parse_match() or
            self._parse_create() or
            self._parse_delete() or
            self._parse_refresh() or
            self._parse_let() or
            self._parse_update() or
            self._parse_merge()
        )

    def _parse_with(self) -> Optional[With]:
        if not self.token.is_with():
            return None
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        distinct = False
        if self.token.is_distinct():
            distinct = True
            self.set_next_token()
            self._expect_and_skip_whitespace_and_comments()
        # Snapshot the pre-projection scope so trailing modifiers
        # (ORDER BY / WHERE / LIMIT) can resolve identifiers against
        # the bindings that existed before this clause's aliases.
        self._state.take_input_scope_snapshot()
        expressions = self._parse_expressions(AliasOption.REQUIRED)
        if len(expressions) == 0:
            raise ValueError("Expected expression")
        if distinct or any(expr.has_reducers() for expr in expressions):
            return AggregatedWith(expressions)  # type: ignore[return-value]
        return With(expressions)

    def _parse_unwind(self) -> Optional[Unwind]:
        if not self.token.is_unwind():
            return None
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        expression = self._parse_expression()
        if expression is None:
            raise ValueError("Expected expression")
        if not ObjectUtils.is_instance_of_any(
            expression.first_child(),
            [JSONArray, Function, Reference, Lookup, RangeLookup]
        ):
            raise ValueError("Expected array, function, reference, or lookup.")
        self._expect_and_skip_whitespace_and_comments()
        alias = self._parse_alias()
        if alias is not None:
            expression.set_alias(alias.get_alias())
        else:
            raise ValueError("Expected alias")
        unwind = Unwind(expression)
        self._state.variables[alias.get_alias()] = unwind
        return unwind

    def _parse_return(self) -> Optional[Return]:
        if not self.token.is_return():
            return None
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        distinct = False
        if self.token.is_distinct():
            distinct = True
            self.set_next_token()
            self._expect_and_skip_whitespace_and_comments()
        # Snapshot the pre-projection scope (see _parse_with for details).
        self._state.take_input_scope_snapshot()
        expressions = self._parse_expressions(AliasOption.OPTIONAL)
        if len(expressions) == 0:
            raise ValueError("Expected expression")
        if distinct or any(expr.has_reducers() for expr in expressions):
            return AggregatedReturn(expressions)
        self._state.increment_returns()
        return Return(expressions)

    def _parse_where(self) -> Optional[Where]:
        self._skip_whitespace_and_comments()
        if not self.token.is_where():
            return None
        self._expect_previous_token_to_be_whitespace_or_comment()
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        expression = self._parse_expression()
        if expression is None:
            raise ValueError("Expected expression")
        if ObjectUtils.is_instance_of_any(
            expression.first_child(),
            [JSONArray, AssociativeArray]
        ):
            raise ValueError("Expected an expression which can be evaluated to a boolean")
        return Where(expression)

    def _parse_load(self) -> Optional[Load]:
        if not self.token.is_load():
            return None
        load = Load()
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        if not (self.token.is_json() or self.token.is_csv() or self.token.is_text()):
            raise ValueError("Expected JSON, CSV, or TEXT")
        load.add_child(self.token.node)
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        if not self.token.is_from():
            raise ValueError("Expected FROM")
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        from_node = From()
        load.add_child(from_node)

        # Check if source is async function
        async_func = self._parse_async_function()
        if async_func is not None:
            from_node.add_child(async_func)
        else:
            expression = self._parse_expression()
            if expression is None:
                raise ValueError("Expected expression or async function")
            # A bare unresolved identifier in `LOAD JSON FROM <name>` is
            # treated as a reference to a LET-bound value, resolved at
            # execution time against the global Bindings store.
            from .expressions.binding_reference import BindingReference
            inner = expression.first_child()
            if (
                isinstance(inner, Reference)
                and inner.referred is None
                and not inner.identifier.startswith("$")
            ):
                expression.replace_child(inner, BindingReference(inner.identifier))
            from_node.add_child(expression)

        self._expect_and_skip_whitespace_and_comments()
        if self.token.is_headers():
            headers = Headers()
            self.set_next_token()
            self._expect_and_skip_whitespace_and_comments()
            header = self._parse_expression()
            if header is None:
                raise ValueError("Expected expression")
            headers.add_child(header)
            load.add_child(headers)
            self._expect_and_skip_whitespace_and_comments()

        if self.token.is_post():
            post = Post()
            self.set_next_token()
            self._expect_and_skip_whitespace_and_comments()
            payload = self._parse_expression()
            if payload is None:
                raise ValueError("Expected expression")
            post.add_child(payload)
            load.add_child(post)
            self._expect_and_skip_whitespace_and_comments()

        alias = self._parse_alias()
        if alias is not None:
            load.add_child(alias)
            self._state.variables[alias.get_alias()] = load
        else:
            raise ValueError("Expected alias")
        return load

    def _parse_call(self) -> Optional[Call]:
        if not self.token.is_call():
            return None
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        async_function = self._parse_async_function()
        if async_function is None:
            raise ValueError("Expected async function")
        call = Call()
        call.function = async_function
        self._skip_whitespace_and_comments()
        if self.token.is_yield():
            self._expect_previous_token_to_be_whitespace_or_comment()
            self.set_next_token()
            self._expect_and_skip_whitespace_and_comments()
            expressions = self._parse_expressions(AliasOption.OPTIONAL)
            if len(expressions) == 0:
                raise ValueError("Expected at least one expression")
            call.yielded = expressions  # type: ignore[assignment]
        return call

    def _parse_match(self) -> Optional[Match]:
        optional = False
        if self.token.is_optional():
            optional = True
            self.set_next_token()
            self._expect_and_skip_whitespace_and_comments()
        if not self.token.is_match():
            if optional:
                raise ValueError("Expected MATCH after OPTIONAL")
            return None
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        patterns = list(self._parse_patterns())
        if len(patterns) == 0:
            raise ValueError("Expected graph pattern")
        return Match(patterns, optional)

    def _parse_create(self) -> Optional[Operation]:
        """Parse CREATE [STATIC] VIRTUAL statement with optional REFRESH EVERY clause."""
        if not self.token.is_create():
            return None
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        is_static = False
        if self.token.is_static():
            is_static = True
            self.set_next_token()
            self._expect_and_skip_whitespace_and_comments()
        if not self.token.is_virtual():
            raise ValueError("Expected VIRTUAL")
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()

        node = self._parse_node()
        if node is None:
            raise ValueError("Expected node definition")

        relationship: Optional[Relationship] = None
        if self.token.is_subtract() and self.peek() and self.peek().is_opening_bracket():
            self.set_next_token()  # skip -
            self.set_next_token()  # skip [
            if not self.token.is_colon():
                raise ValueError("Expected ':' for relationship type")
            self.set_next_token()
            if not self.token.is_identifier_or_keyword():
                raise ValueError("Expected relationship type identifier")
            rel_type = self.token.value or ""
            self.set_next_token()
            if not self.token.is_closing_bracket():
                raise ValueError("Expected closing bracket for relationship definition")
            self.set_next_token()
            if not self.token.is_subtract():
                raise ValueError("Expected '-' for relationship definition")
            self.set_next_token()
            # Skip optional direction indicator '>'
            if self.token.is_greater_than():
                self.set_next_token()
            target = self._parse_node()
            if target is None:
                raise ValueError("Expected target node definition")
            relationship = Relationship()
            relationship.type = rel_type
            relationship.source = node
            relationship.target = target

        self._expect_and_skip_whitespace_and_comments()
        if not self.token.is_as():
            raise ValueError("Expected AS")
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()

        self._state.in_virtual_definition = True
        query = self._parse_sub_query()
        self._state.in_virtual_definition = False
        if query is None:
            raise ValueError("Expected sub-query")

        # Optional trailing REFRESH EVERY <n> <unit> clause.  Only allowed
        # for STATIC virtual entities (caching must be enabled to refresh).
        # We deliberately peek past REFRESH to confirm EVERY follows: a bare
        # REFRESH VIRTUAL ... is a separate top-level statement.
        refresh_every_ms: Optional[int] = None
        saved_index = self._token_index
        self._skip_whitespace_and_comments()
        consumed_refresh_clause = False
        if self.token.is_refresh():
            after_refresh_index = self._token_index
            self.set_next_token()
            self._skip_whitespace_and_comments()
            if self.token.is_every():
                if not is_static:
                    raise ValueError(
                        "REFRESH EVERY requires STATIC (caching must be enabled)"
                    )
                self.set_next_token()
                self._expect_and_skip_whitespace_and_comments()
                if not self.token.is_number():
                    raise ValueError("Expected number after REFRESH EVERY")
                try:
                    amount = float(self.token.value or "0")
                except ValueError as e:
                    raise ValueError("Expected number after REFRESH EVERY") from e
                if amount <= 0:
                    raise ValueError("REFRESH EVERY interval must be a positive number")
                self.set_next_token()
                self._expect_and_skip_whitespace_and_comments()
                unit = (self.token.value or "").upper()
                unit_ms = {
                    "SECOND": 1000,
                    "SECONDS": 1000,
                    "MINUTE": 60_000,
                    "MINUTES": 60_000,
                    "HOUR": 3_600_000,
                    "HOURS": 3_600_000,
                    "DAY": 86_400_000,
                    "DAYS": 86_400_000,
                }
                if unit not in unit_ms:
                    raise ValueError(
                        "Expected time unit (SECOND[S], MINUTE[S], HOUR[S], DAY[S]) after REFRESH EVERY interval"
                    )
                refresh_every_ms = int(amount * unit_ms[unit])
                self.set_next_token()
                consumed_refresh_clause = True
            else:
                # Not REFRESH EVERY — must be the start of a separate
                # REFRESH VIRTUAL statement.  Rewind to before REFRESH.
                self._token_index = after_refresh_index
        if not consumed_refresh_clause:
            self._token_index = saved_index

        if relationship is not None:
            return CreateRelationship(relationship, query, is_static, refresh_every_ms)
        else:
            return CreateNode(node, query, is_static, refresh_every_ms)

    def _parse_delete(self) -> Optional[Operation]:
        """Parse DELETE/DROP VIRTUAL statement for nodes and relationships."""
        if not self.token.is_delete() and not self.token.is_drop():
            return None
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        if not self.token.is_virtual():
            raise ValueError("Expected VIRTUAL")
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()

        node = self._parse_node()
        if node is None:
            raise ValueError("Expected node definition")

        relationship: Optional[Relationship] = None
        if self.token.is_subtract() and self.peek() and self.peek().is_opening_bracket():
            self.set_next_token()  # skip -
            self.set_next_token()  # skip [
            if not self.token.is_colon():
                raise ValueError("Expected ':' for relationship type")
            self.set_next_token()
            if not self.token.is_identifier_or_keyword():
                raise ValueError("Expected relationship type identifier")
            rel_type = self.token.value or ""
            self.set_next_token()
            if not self.token.is_closing_bracket():
                raise ValueError("Expected closing bracket for relationship definition")
            self.set_next_token()
            if not self.token.is_subtract():
                raise ValueError("Expected '-' for relationship definition")
            self.set_next_token()
            # Skip optional direction indicator '>'
            if self.token.is_greater_than():
                self.set_next_token()
            target = self._parse_node()
            if target is None:
                raise ValueError("Expected target node definition")
            relationship = Relationship()
            relationship.type = rel_type
            relationship.source = node
            relationship.target = target

        if relationship is not None:
            return DeleteRelationship(relationship)
        else:
            return DeleteNode(node)

    def _parse_refresh(self) -> Optional[Operation]:
        """Parse REFRESH VIRTUAL statement for nodes and relationships."""
        if not self.token.is_refresh():
            return None
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        if not self.token.is_virtual():
            raise ValueError("Expected VIRTUAL")
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()

        node = self._parse_node()
        if node is None:
            raise ValueError("Expected node definition")

        relationship: Optional[Relationship] = None
        if self.token.is_subtract() and self.peek() and self.peek().is_opening_bracket():
            self.set_next_token()  # skip -
            self.set_next_token()  # skip [
            if not self.token.is_colon():
                raise ValueError("Expected ':' for relationship type")
            self.set_next_token()
            if not self.token.is_identifier_or_keyword():
                raise ValueError("Expected relationship type identifier")
            rel_type = self.token.value or ""
            self.set_next_token()
            if not self.token.is_closing_bracket():
                raise ValueError("Expected closing bracket for relationship definition")
            self.set_next_token()
            if not self.token.is_subtract():
                raise ValueError("Expected '-' for relationship definition")
            self.set_next_token()
            if self.token.is_greater_than():
                self.set_next_token()
            target = self._parse_node()
            if target is None:
                raise ValueError("Expected target node definition")
            relationship = Relationship()
            relationship.type = rel_type
            relationship.source = node
            relationship.target = target

        if relationship is not None:
            return RefreshRelationship(relationship)
        return RefreshNode(node)

    def _looks_like_pipeline_start(self) -> bool:
        """True if the current token opens a query pipeline (the right-
        hand side of `LET name =` / `UPDATE name =`)."""
        return (
            self.token.is_with()
            or self.token.is_unwind()
            or self.token.is_load()
            or self.token.is_call()
            or self.token.is_match()
            or self.token.is_optional()
            or self.token.is_return()
        )

    def _brace_opens_sub_query(self) -> bool:
        """Peek past `{` to disambiguate sub-query braces from map literals."""
        if not self.token.is_opening_brace():
            return False
        saved_index = self._token_index
        self.set_next_token()
        self._skip_whitespace_and_comments()
        result = (
            self.token.is_with()
            or self.token.is_unwind()
            or self.token.is_load()
            or self.token.is_call()
            or self.token.is_match()
            or self.token.is_optional()
            or self.token.is_return()
        )
        self._token_index = saved_index
        return result

    def _parse_let_update_rhs(self) -> Tuple[Optional[Expression], Optional[ASTNode]]:
        """Parses the right-hand side of a `LET` / `UPDATE`."""
        self._expect_and_skip_whitespace_and_comments()
        if self._brace_opens_sub_query():
            sub_query = self._parse_sub_query()
            if sub_query is None:
                raise ValueError("Expected sub-query")
            return None, sub_query
        if self._looks_like_pipeline_start():
            saved_state = self._state
            self._state = ParserState()
            sub_query = self._parse_tokenized(True)
            self._state = saved_state
            if sub_query.child_count() == 0:
                raise ValueError("Expected expression or sub-query")
            return None, sub_query
        expression = self._parse_expression()
        if expression is None:
            raise ValueError("Expected expression or sub-query")
        return expression, None

    def _parse_let(self) -> Optional[Let]:
        if not self.token.is_let():
            return None
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        if not self.token.is_identifier_or_keyword() or self.token.value is None:
            raise ValueError("Expected identifier after LET")
        name = self.token.value
        self.set_next_token()
        self._skip_whitespace_and_comments()
        if not self.token.is_equals():
            raise ValueError("Expected '=' after LET identifier")
        self.set_next_token()
        expression, sub_query = self._parse_let_update_rhs()
        return Let(name, expression, sub_query)

    def _parse_update(self) -> Optional[Operation]:
        if not self.token.is_update():
            return None
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        if not self.token.is_identifier_or_keyword() or self.token.value is None:
            raise ValueError("Expected identifier after UPDATE")
        name = self.token.value
        self.set_next_token()
        self._skip_whitespace_and_comments()

        # `UPDATE name AS alias DELETE WHERE <pred>` — row-filter branch.
        if self.token.is_as():
            return self._parse_update_delete_tail(name)

        # `UPDATE name = <rhs>` — assign branch.
        if not self.token.is_equals():
            raise ValueError("Expected '=' in UPDATE")
        self.set_next_token()
        expression, sub_query = self._parse_let_update_rhs()
        return Update(name, expression, sub_query)

    def _parse_merge(self) -> Optional[Merge]:
        """Parses a ``MERGE INTO <name> [AS <target>] USING <rhs>
        [AS <source>] ON <on-clause> <when-clauses>`` statement."""
        if not self.token.is_merge():
            return None
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        if not self.token.is_into():
            raise ValueError("Expected INTO after MERGE")
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        if not self.token.is_identifier_or_keyword() or self.token.value is None:
            raise ValueError("Expected binding name after MERGE INTO")
        name = self.token.value
        self.set_next_token()
        self._skip_whitespace_and_comments()
        target_alias: Optional[str] = None
        if self.token.is_as():
            self.set_next_token()
            self._expect_and_skip_whitespace_and_comments()
            if not self.token.is_identifier_or_keyword() or self.token.value is None:
                raise ValueError("Expected alias after AS in MERGE INTO")
            target_alias = self.token.value
            self.set_next_token()
            self._skip_whitespace_and_comments()
        if not self.token.is_using():
            raise ValueError("Expected USING after MERGE INTO target")
        self.set_next_token()
        source_expression, source_sub_query = self._parse_let_update_rhs()
        if source_expression is not None:
            # The source RHS lives outside the LET / UPDATE binding-RHS
            # scope, so a bare identifier here refers to an existing
            # binding (e.g. ``USING incoming AS s``) rather than a
            # declaration-site name.  Convert unresolved references so
            # they resolve against the global Bindings store at runtime.
            self._convert_unresolved_references_to_bindings(source_expression)
        self._skip_whitespace_and_comments()
        source_alias: Optional[str] = None
        if self.token.is_as():
            self.set_next_token()
            self._expect_and_skip_whitespace_and_comments()
            if not self.token.is_identifier_or_keyword() or self.token.value is None:
                raise ValueError("Expected alias after AS in MERGE INTO … USING")
            source_alias = self.token.value
            self.set_next_token()
            self._skip_whitespace_and_comments()
        if not self.token.is_on():
            raise ValueError("Expected ON in MERGE INTO")
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()

        # Pre-create the Merge with placeholders so that aliases can
        # resolve to the per-row context while we parse the ON clause
        # and the WHEN expressions.
        placeholder_on: MergeOnClause = MergeOnKeys([])
        merge = Merge(
            name,
            target_alias,
            source_alias,
            source_expression,
            source_sub_query,
            placeholder_on,
            None,
            None,
        )
        if target_alias is not None:
            self._state.variables[target_alias] = MergeTargetAlias(merge)
        if source_alias is not None:
            self._state.variables[source_alias] = MergeSourceAlias(merge)
        try:
            on_clause = self._parse_merge_on()
            self._skip_whitespace_and_comments()
            matched: Optional[MergeMatchedAction] = None
            not_matched: Optional[MergeNotMatchedInsert] = None
            while self.token.is_when():
                kind, action = self._parse_merge_when_clause()
                if kind == "matched":
                    if matched is not None:
                        raise ValueError("Duplicate WHEN MATCHED clause in MERGE INTO")
                    matched = cast(MergeMatchedAction, action)
                else:
                    if not_matched is not None:
                        raise ValueError("Duplicate WHEN NOT MATCHED clause in MERGE INTO")
                    not_matched = cast(MergeNotMatchedInsert, action)
                self._skip_whitespace_and_comments()
            if matched is None and not_matched is None:
                raise ValueError("MERGE INTO requires at least one WHEN clause")
            merge.set_clauses(on_clause, matched, not_matched)
        finally:
            if target_alias is not None:
                self._state.variables.pop(target_alias, None)
            if source_alias is not None:
                self._state.variables.pop(source_alias, None)
        return merge

    def _parse_merge_on(self) -> MergeOnClause:
        """Parses the body of the ``ON`` clause.  A bare identifier (or
        parenthesised list of identifiers) followed by ``WHEN`` is the
        key form; anything else is parsed as an expression."""
        saved_index = self._token_index
        keys = self._try_parse_merge_key_list()
        if keys is not None:
            return MergeOnKeys(keys)
        self._token_index = saved_index
        predicate = self._parse_expression()
        if predicate is None:
            raise ValueError("Expected predicate or key list after MERGE INTO … ON")
        self._convert_unresolved_references_to_bindings(predicate)
        return MergeOnPredicate(predicate)

    def _try_parse_merge_key_list(self) -> Optional[List[str]]:
        """Speculatively parses ``<id>`` or ``(<id> [, <id>]*)`` followed
        by ``WHEN``.  Returns the key list on success or ``None``."""
        keys: List[str] = []
        if self.token.is_left_parenthesis():
            self.set_next_token()
            self._skip_whitespace_and_comments()
            while not self.token.is_right_parenthesis():
                if not self.token.is_identifier_or_keyword() or self.token.value is None:
                    return None
                keys.append(self.token.value)
                self.set_next_token()
                self._skip_whitespace_and_comments()
                if self.token.is_comma():
                    self.set_next_token()
                    self._skip_whitespace_and_comments()
                elif not self.token.is_right_parenthesis():
                    return None
            self.set_next_token()
        else:
            if not self.token.is_identifier_or_keyword() or self.token.value is None:
                return None
            keys.append(self.token.value)
            self.set_next_token()
        self._skip_whitespace_and_comments()
        if not self.token.is_when():
            return None
        if len(keys) == 0:
            return None
        return keys

    def _parse_merge_when_clause(self) -> Tuple[str, Any]:
        """Parses a single ``WHEN [NOT] MATCHED THEN UPDATE SET … |
        DELETE | INSERT [<expr>]`` clause.  Returns a tuple of
        ``("matched" | "not_matched", action)``.  Caller is positioned
        on ``WHEN``."""
        self.set_next_token()  # consume WHEN
        self._expect_and_skip_whitespace_and_comments()
        negated = False
        if self.token.is_not():
            negated = True
            self.set_next_token()
            self._expect_and_skip_whitespace_and_comments()
        if not self.token.is_matched():
            raise ValueError(
                "Expected MATCHED after WHEN" + (" NOT" if negated else "")
            )
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        if not self.token.is_then():
            raise ValueError(
                "Expected THEN after WHEN" + (" NOT" if negated else "") + " MATCHED"
            )
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        if negated:
            if not self.token.is_insert():
                raise ValueError("Expected INSERT after WHEN NOT MATCHED THEN")
            self.set_next_token()
            self._skip_whitespace_and_comments()
            expression: Optional[Expression] = None
            if (
                not self.token.is_when()
                and not self.token.is_eof()
                and not self.token.is_semicolon()
                and not self.token.is_closing_brace()
            ):
                expression = self._parse_expression()
                if expression is None:
                    raise ValueError("Expected expression after WHEN NOT MATCHED THEN INSERT")
                self._convert_unresolved_references_to_bindings(expression)
            return ("not_matched", MergeNotMatchedInsert(expression))
        if self.token.is_update():
            self.set_next_token()
            self._expect_and_skip_whitespace_and_comments()
            if not self.token.is_set():
                raise ValueError("Expected SET after WHEN MATCHED THEN UPDATE")
            self.set_next_token()
            self._expect_and_skip_whitespace_and_comments()
            set_items = self._parse_merge_set_list()
            return ("matched", MergeMatchedUpdate(set_items))
        if self.token.is_delete():
            self.set_next_token()
            return ("matched", MergeMatchedDelete())
        raise ValueError("Expected UPDATE or DELETE after WHEN MATCHED THEN")

    def _parse_merge_set_list(self) -> List[MergeSetItem]:
        """Parses ``.field [= <expr>] [, .field [= <expr>]]*``."""
        items: List[MergeSetItem] = []
        while True:
            if not self.token.is_dot():
                raise ValueError("Expected '.' before SET field name")
            self.set_next_token()
            if not self.token.is_identifier_or_keyword() or self.token.value is None:
                raise ValueError("Expected field name after '.'")
            field = self.token.value
            self.set_next_token()
            self._skip_whitespace_and_comments()
            expression: Optional[Expression] = None
            if self.token.is_equals():
                self.set_next_token()
                self._expect_and_skip_whitespace_and_comments()
                expression = self._parse_expression()
                if expression is None:
                    raise ValueError(f"Expected expression after SET .{field} =")
                self._convert_unresolved_references_to_bindings(expression)
                self._skip_whitespace_and_comments()
            items.append(MergeSetItem(field, expression))
            if not self.token.is_comma():
                break
            self.set_next_token()
            self._skip_whitespace_and_comments()
        if len(items) == 0:
            raise ValueError("Expected at least one SET field")
        return items

    def _parse_update_delete_tail(self, name: str) -> UpdateDelete:
        """Parses the tail of ``UPDATE name AS alias DELETE WHERE <pred>``,
        with ``AS`` already consumed by the caller's lookahead."""
        self.set_next_token()  # consume AS
        self._expect_and_skip_whitespace_and_comments()
        if not self.token.is_identifier_or_keyword() or self.token.value is None:
            raise ValueError("Expected alias after AS")
        alias = self.token.value
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        if not self.token.is_delete():
            raise ValueError("Expected DELETE after UPDATE alias")
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        if not self.token.is_where():
            raise ValueError("Expected WHERE after UPDATE … DELETE")
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()

        # Inject the alias into the parser's variable scope while we
        # parse the predicate so that `<alias>` / `<alias>.field`
        # references resolve to the UpdateDelete's per-row value.
        update_delete = UpdateDelete(name, alias, Expression())
        self._state.variables[alias] = update_delete
        predicate = self._parse_expression()
        self._state.variables.pop(alias, None)
        if predicate is None:
            raise ValueError("Expected predicate expression after WHERE")
        # Any other unresolved bare identifiers (e.g. `IN banned`) refer
        # to LET-bound bindings, which are resolved at run-time against
        # the global Bindings store.
        self._convert_unresolved_references_to_bindings(predicate)
        update_delete.set_predicate(predicate)
        return update_delete

    def _convert_unresolved_references_to_bindings(self, node: ASTNode) -> None:
        """Recursively replaces unresolved ``Reference`` nodes with
        ``BindingReference``, used to support cross-binding references
        inside ``UPDATE … AS u DELETE WHERE …`` predicates."""
        from .expressions.binding_reference import BindingReference
        for child in list(node.get_children()):
            if (
                isinstance(child, Reference)
                and child.referred is None
                and not child.identifier.startswith("$")
            ):
                node.replace_child(child, BindingReference(child.identifier))
            else:
                self._convert_unresolved_references_to_bindings(child)

    def _parse_union(self) -> Optional[Union]:
        """Parse a UNION or UNION ALL keyword."""
        if not self.token.is_union():
            return None
        self.set_next_token()
        self._skip_whitespace_and_comments()
        if self.token.is_all():
            union: Union = UnionAll()
            self.set_next_token()
        else:
            union = Union()
        return union

    def _parse_sub_query(self) -> Optional[ASTNode]:
        """Parse a sub-query enclosed in braces."""
        if not self.token.is_opening_brace():
            return None
        self.set_next_token()
        self._skip_whitespace_and_comments()
        query = self._parse_tokenized(is_sub_query=True)
        self._skip_whitespace_and_comments()
        if not self.token.is_closing_brace():
            raise ValueError("Expected closing brace for sub-query")
        self.set_next_token()
        return query

    def _parse_patterns(self) -> Iterator[Pattern]:
        while True:
            identifier: Optional[str] = None
            if self.token.is_identifier_or_keyword():
                identifier = self.token.value
                self.set_next_token()
                self._skip_whitespace_and_comments()
                if not self.token.is_equals():
                    raise ValueError("Expected '=' for pattern assignment")
                self.set_next_token()
                self._skip_whitespace_and_comments()
            pattern = self._parse_pattern()
            if pattern is not None:
                if identifier is not None:
                    pattern.identifier = identifier
                    self._state.variables[identifier] = pattern
                yield pattern
            else:
                break
            self._skip_whitespace_and_comments()
            if not self.token.is_comma():
                break
            self.set_next_token()
            self._skip_whitespace_and_comments()

    def _parse_pattern(self) -> Optional[Pattern]:
        if not self.token.is_left_parenthesis():
            return None
        pattern = Pattern()
        node = self._parse_node()
        if node is None:
            raise ValueError("Expected node definition")
        pattern.add_element(node)
        while True:
            relationship = self._parse_relationship()
            if relationship is None:
                break
            pattern.add_element(relationship)
            node = self._parse_node()
            if node is None:
                raise ValueError("Expected target node definition")
            pattern.add_element(node)
        return pattern

    def _parse_pattern_expression(self) -> Optional[PatternExpression]:
        """Parse a pattern expression for WHERE clauses.

        PatternExpression is used to test if a graph pattern exists.
        It must start with a NodeReference (referencing an existing variable).
        """
        if not self.token.is_left_parenthesis():
            return None
        pattern = PatternExpression()
        node = self._parse_node()
        if node is None:
            raise ValueError("Expected node definition")
        pattern.add_element(node)
        while True:
            relationship = self._parse_relationship()
            if relationship is None:
                break
            if relationship.hops and relationship.hops.multi():
                raise ValueError("PatternExpression does not support variable-length relationships")
            pattern.add_element(relationship)
            node = self._parse_node()
            if node is None:
                raise ValueError("Expected target node definition")
            pattern.add_element(node)
        pattern.verify()
        return pattern

    def _parse_node(self) -> Optional[Node]:
        if not self.token.is_left_parenthesis():
            return None
        self.set_next_token()
        self._skip_whitespace_and_comments()
        identifier: Optional[str] = None
        # In a node-definition position, any identifier or keyword is unambiguously the
        # node variable name — including reserved keywords like END/NULL/CASE that are
        # otherwise blocked by is_identifier_or_keyword().
        if self.token.is_identifier() or self.token.is_keyword():
            identifier = self.token.value
            self.set_next_token()
        self._skip_whitespace_and_comments()
        label: Optional[str] = None
        peek = self.peek()
        if (
            not self.token.is_colon()
            and not self.token.is_opening_brace()
            and not self.token.is_right_parenthesis()
            and peek is not None
            and peek.is_identifier_or_keyword()
        ):
            raise ValueError("Expected ':' for node label")
        if self.token.is_colon() and (peek is None or not peek.is_identifier_or_keyword()):
            raise ValueError("Expected node label identifier")
        if self.token.is_colon() and peek is not None and peek.is_identifier_or_keyword():
            self.set_next_token()
            label = cast(str, self.token.value)  # Guaranteed by is_identifier check
            self.set_next_token()
        # Parse additional ORed labels: (n:Person|Animal)
        labels: list[str] = [label] if label is not None else []
        while label is not None and self.token.is_pipe():
            self.set_next_token()
            if self.token.is_colon():
                self.set_next_token()
            if not self.token.is_identifier_or_keyword():
                raise ValueError("Expected node label identifier after '|'")
            labels.append(cast(str, self.token.value))
            self.set_next_token()
        self._skip_whitespace_and_comments()
        node = Node()
        if labels:
            node.labels = labels
        node.properties = dict(self._parse_properties())
        if identifier is not None and identifier in self._state.variables:
            reference = self._state.variables.get(identifier)
            if reference is None or (
                not isinstance(reference, Node)
                and not isinstance(reference, Unwind)
                and not isinstance(reference, Expression)
            ):
                raise ValueError(f"Undefined node reference: {identifier}")
            node = NodeReference(node, reference)
        elif identifier is not None:
            node.identifier = identifier
            self._state.variables[identifier] = node
        if not self.token.is_right_parenthesis():
            raise ValueError("Expected closing parenthesis for node definition")
        self.set_next_token()
        return node

    def _parse_relationship(self) -> Optional[Relationship]:
        direction = "right"
        if self.token.is_less_than() and self.peek() is not None and self.peek().is_subtract():
            direction = "left"
            self.set_next_token()
            self.set_next_token()
        elif self.token.is_subtract():
            self.set_next_token()
        else:
            return None
        if not self.token.is_opening_bracket():
            return None
        self.set_next_token()
        variable: Optional[str] = None
        # In a relationship-definition position, any identifier or keyword is
        # unambiguously the relationship variable name — including reserved keywords
        # like END/NULL/CASE that are otherwise blocked by is_identifier_or_keyword().
        if self.token.is_identifier() or self.token.is_keyword():
            variable = self.token.value
            self.set_next_token()
        rel_types: List[str] = []
        if self.token.is_colon():
            self.set_next_token()
            if not self.token.is_identifier_or_keyword():
                raise ValueError("Expected relationship type identifier")
            rel_types.append(self.token.value or "")
            self.set_next_token()
            while self.token.is_pipe():
                self.set_next_token()
                if self.token.is_colon():
                    self.set_next_token()
                if not self.token.is_identifier_or_keyword():
                    raise ValueError("Expected relationship type identifier after '|'")
                rel_types.append(self.token.value or "")
                self.set_next_token()
        hops = self._parse_relationship_hops()
        properties: Dict[str, Expression] = dict(self._parse_properties())
        if not self.token.is_closing_bracket():
            raise ValueError("Expected closing bracket for relationship definition")
        self.set_next_token()
        if not self.token.is_subtract():
            raise ValueError("Expected '-' for relationship definition")
        self.set_next_token()
        if self.token.is_greater_than():
            self.set_next_token()
        relationship = Relationship()
        relationship.direction = direction
        relationship.properties = properties
        if variable is not None and variable in self._state.variables:
            reference = self._state.variables.get(variable)
            # Resolve through Expression -> Reference -> Relationship (e.g., after WITH)
            first = reference.first_child() if isinstance(reference, Expression) else None
            if isinstance(first, Reference):
                inner = first.referred
                if isinstance(inner, Relationship):
                    reference = inner
            if reference is None or not isinstance(reference, Relationship):
                raise ValueError(f"Undefined relationship reference: {variable}")
            relationship = RelationshipReference(relationship, reference)
        elif variable is not None:
            relationship.identifier = variable
            self._state.variables[variable] = relationship
        if hops is not None:
            relationship.hops = hops
        relationship.types = rel_types
        return relationship

    def _parse_properties(self) -> Iterator[Tuple[str, Expression]]:
        self._skip_whitespace_and_comments()
        if not self.token.is_opening_brace():
            return
        self.set_next_token()
        while True:
            self._skip_whitespace_and_comments()
            if self.token.is_closing_brace():
                break
            if not self.token.is_identifier():
                raise ValueError("Expected identifier")
            key: str = self.token.value or ""
            self.set_next_token()
            self._skip_whitespace_and_comments()
            if not self.token.is_colon():
                raise ValueError("Expected colon")
            self.set_next_token()
            self._skip_whitespace_and_comments()
            expression = self._parse_expression()
            if expression is None:
                raise ValueError("Expected expression")
            yield (key, expression)
            self._skip_whitespace_and_comments()
            if not self.token.is_comma():
                break
            self.set_next_token()
        self._skip_whitespace_and_comments()
        if not self.token.is_closing_brace():
            raise ValueError("Expected closing brace")
        self.set_next_token()

    def _parse_relationship_hops(self) -> Optional[Hops]:
        if not self.token.is_multiply():
            return None
        hops = Hops()
        self.set_next_token()
        if self.token.is_number():
            hops.min = int(self.token.value or "0")
            self.set_next_token()
            if self.token.is_dot():
                self.set_next_token()
                if not self.token.is_dot():
                    raise ValueError("Expected '..' for relationship hops")
                self.set_next_token()
                if not self.token.is_number():
                    hops.max = sys.maxsize
                else:
                    hops.max = int(self.token.value or "0")
                    self.set_next_token()
        else:
            # Just * without numbers means unbounded
            hops.min = 0
            hops.max = sys.maxsize
        return hops

    def _parse_limit(self) -> Optional[Limit]:
        self._skip_whitespace_and_comments()
        if not self.token.is_limit():
            return None
        self._expect_previous_token_to_be_whitespace_or_comment()
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        if not self.token.is_number():
            raise ValueError("Expected number")
        limit = Limit(int(self.token.value or "0"))
        self.set_next_token()
        return limit

    def _parse_order_by(self) -> Optional[OrderBy]:
        self._skip_whitespace_and_comments()
        if not self.token.is_order():
            return None
        self._expect_previous_token_to_be_whitespace_or_comment()
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        if not self.token.is_by():
            raise ValueError("Expected BY after ORDER")
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        fields: list[SortField] = []
        while True:
            expression = self._parse_expression()
            if expression is None:
                raise ValueError("Expected expression in ORDER BY")
            self._skip_whitespace_and_comments()
            direction = "asc"
            if self.token.is_asc():
                direction = "asc"
                self.set_next_token()
                self._skip_whitespace_and_comments()
            elif self.token.is_desc():
                direction = "desc"
                self.set_next_token()
                self._skip_whitespace_and_comments()
            fields.append(SortField(expression, direction))
            if self.token.is_comma():
                self.set_next_token()
                self._skip_whitespace_and_comments()
            else:
                break
        return OrderBy(fields)

    def _parse_expressions(
        self, alias_option: AliasOption = AliasOption.NOT_ALLOWED
    ) -> List[Expression]:
        """Parse a comma-separated list of expressions with deferred variable
        registration.  Aliases set by earlier expressions in the same clause
        won't shadow variables needed by later expressions
        (e.g. ``RETURN a.x AS a, a.y AS b``)."""
        parsed = list(self.__parse_expressions(alias_option))
        for expression, variable_name in parsed:
            if variable_name is not None:
                self._state.variables[variable_name] = expression
        return [expression for expression, _ in parsed]

    def __parse_expressions(
        self, alias_option: AliasOption
    ) -> Iterator[Tuple[Expression, Optional[str]]]:
        while True:
            expression = self._parse_expression()
            if expression is not None:
                variable_name: Optional[str] = None
                alias = self._parse_alias()
                if isinstance(expression.first_child(), Reference) and alias is None:
                    reference = expression.first_child()
                    assert isinstance(reference, Reference)  # For type narrowing
                    expression.set_alias(reference.identifier)
                    variable_name = reference.identifier
                elif (alias_option == AliasOption.REQUIRED and
                      alias is None and
                      not isinstance(expression.first_child(), Reference)):
                    raise ValueError("Alias required")
                elif alias_option == AliasOption.NOT_ALLOWED and alias is not None:
                    raise ValueError("Alias not allowed")
                elif alias_option in (AliasOption.OPTIONAL, AliasOption.REQUIRED) and alias is not None:
                    expression.set_alias(alias.get_alias())
                    variable_name = alias.get_alias()
                yield expression, variable_name
            else:
                break
            self._skip_whitespace_and_comments()
            if not self.token.is_comma():
                break
            self.set_next_token()

    def _parse_operand(self, expression: Expression) -> bool:
        """Parse a single operand (without operators). Returns True if an operand was parsed."""
        self._skip_whitespace_and_comments()
        # Subquery expressions: EXISTS { ... }, COUNT { ... }, COLLECT { ... }
        if self._looks_like_subquery_expression():
            subquery = self._parse_subquery_expression()
            if subquery is not None:
                lookup = self._parse_lookup(subquery)
                expression.add_node(lookup)
                return True
        if (self._should_parse_reserved_keyword_reference()
                and (self.peek() is None or not self.peek().is_left_parenthesis())):
            identifier = self.token.value or ""
            next_tok = self.peek()
            property_access = next_tok is not None and (
                next_tok.is_dot() or next_tok.is_opening_bracket()
            )
            reference = Reference(
                identifier, self._state.resolve(identifier, property_access)
            )
            self.set_next_token()
            lookup = self._parse_lookup(reference)
            expression.add_node(lookup)
            return True
        if self.token.is_identifier_or_keyword() and (self.peek() is None or not self.peek().is_left_parenthesis()):
            identifier = self.token.value or ""
            if identifier.startswith("$"):
                if not self._state.in_virtual_definition:
                    raise ValueError(
                        f"Parameter references (${identifier[1:]}) are only allowed "
                        "inside virtual node or relationship definitions"
                    )
                param_ref = ParameterReference(identifier)
                self.set_next_token()
                lookup = self._parse_lookup(param_ref)
                expression.add_node(lookup)
                return True
            next_tok = self.peek()
            property_access = next_tok is not None and (
                next_tok.is_dot() or next_tok.is_opening_bracket()
            )
            reference = Reference(
                identifier, self._state.resolve(identifier, property_access)
            )
            self.set_next_token()
            lookup = self._parse_lookup(reference)
            expression.add_node(lookup)
            return True
        elif self.token.is_identifier_or_keyword() and self.peek() is not None and self.peek().is_left_parenthesis():
            func = self._parse_predicate_function() or self._parse_function()
            if func is not None:
                lookup = self._parse_lookup(func)
                expression.add_node(lookup)
                return True
        elif (
            self.token.is_left_parenthesis()
            and self._looks_like_node_pattern()
        ):
            # Possible graph pattern expression
            pattern = self._parse_pattern_expression()
            if pattern is not None:
                expression.add_node(pattern)
                return True
        elif self.token.is_operand():
            expression.add_node(self.token.node)
            self.set_next_token()
            return True
        elif self.token.is_f_string():
            f_string = self._parse_f_string()
            if f_string is None:
                raise ValueError("Expected f-string")
            expression.add_node(f_string)
            return True
        elif self.token.is_left_parenthesis():
            self.set_next_token()
            sub = self._parse_expression()
            if sub is None:
                raise ValueError("Expected expression")
            if not self.token.is_right_parenthesis():
                raise ValueError("Expected right parenthesis")
            self.set_next_token()
            lookup = self._parse_lookup(sub)
            expression.add_node(lookup)
            return True
        elif self.token.is_opening_bracket() and self._looks_like_list_comprehension():
            list_comp = self._parse_list_comprehension()
            if list_comp is None:
                raise ValueError("Expected list comprehension")
            lookup = self._parse_lookup(list_comp)
            expression.add_node(lookup)
            return True
        elif self.token.is_opening_brace() or self.token.is_opening_bracket():
            json = self._parse_json()
            if json is None:
                raise ValueError("Expected JSON object")
            lookup = self._parse_lookup(json)
            expression.add_node(lookup)
            return True
        elif self.token.is_case():
            case = self._parse_case()
            if case is None:
                raise ValueError("Expected CASE statement")
            expression.add_node(case)
            return True
        elif self.token.is_not():
            not_node = Not()
            self.set_next_token()
            # NOT should only bind to the next operand, not the entire expression
            # Create a temporary expression to parse just one operand
            temp_expr = Expression()
            if not self._parse_operand(temp_expr):
                raise ValueError("Expected expression after NOT")
            temp_expr.finish()
            not_node.add_child(temp_expr)
            expression.add_node(not_node)
            return True
        return False

    def _parse_expression(self) -> Optional[Expression]:
        expression = Expression()
        while True:
            if not self._parse_operand(expression):
                if expression.nodes_added():
                    raise ValueError("Expected operand or left parenthesis")
                else:
                    break
            self._skip_whitespace_and_comments()
            if self.token.is_operator():
                if self.token.is_is():
                    expression.add_node(self._parse_is_operator())
                else:
                    expression.add_node(self.token.node)
            elif self.token.is_in():
                expression.add_node(self._parse_in_operator())
            elif self.token.is_contains():
                expression.add_node(self._parse_contains_operator())
            elif self.token.is_starts():
                expression.add_node(self._parse_starts_with_operator())
            elif self.token.is_ends():
                expression.add_node(self._parse_ends_with_operator())
            elif self.token.is_not():
                not_op = self._parse_not_operator()
                if not_op is None:
                    break
                expression.add_node(not_op)
            else:
                break
            self.set_next_token()

        if expression.nodes_added():
            expression.finish()
            return expression
        return None

    def _should_parse_reserved_keyword_reference(self) -> bool:
        """Check if the current token is a reserved keyword that is registered as a variable."""
        identifier = self.token.value
        if (identifier is None
                or not self.token.is_keyword_that_cannot_be_identifier()
                or identifier not in self._state.variables):
            return False
        if self.token.is_case() and self.next_significant_token().is_when():
            return False
        if self.token.is_null():
            prev = self.previous_significant_token()
            if prev.is_is() or prev.is_not():
                return False
        return True

    def _looks_like_node_pattern(self) -> bool:
        """Peek ahead from a left parenthesis to determine whether the
        upcoming tokens form a graph-node pattern (e.g. (n:Label), (n),
        (:Label), ()) rather than a parenthesised expression (e.g.
        (variable.property), (a + b)).
        """
        saved_index = self._token_index
        self.set_next_token()  # skip '('
        self._skip_whitespace_and_comments()

        if self.token.is_colon() or self.token.is_right_parenthesis():
            self._token_index = saved_index
            return True

        if self.token.is_identifier_or_keyword():
            self.set_next_token()  # skip identifier
            self._skip_whitespace_and_comments()
            result = (
                self.token.is_colon()
                or self.token.is_opening_brace()
                or self.token.is_right_parenthesis()
            )
            self._token_index = saved_index
            return result

        self._token_index = saved_index
        return False

    def _parse_is_operator(self) -> ASTNode:
        """Parse IS or IS NOT operator."""
        # Current token is IS. Look ahead for NOT to produce IS NOT.
        saved_index = self._token_index
        self.set_next_token()
        self._skip_whitespace_and_comments()
        if self.token.is_not():
            return IsNot()
        # Not IS NOT — restore position to IS so the outer loop's set_next_token advances past it.
        self._token_index = saved_index
        return Is()

    def _parse_in_operator(self) -> In:
        """Parse IN operator."""
        # Current token is IN. Advance past it so the outer loop's set_next_token moves correctly.
        return In()

    def _parse_contains_operator(self) -> Contains:
        """Parse CONTAINS operator."""
        return Contains()

    def _parse_starts_with_operator(self) -> StartsWith:
        """Parse STARTS WITH operator."""
        # Current token is STARTS. Look ahead for WITH.
        saved_index = self._token_index
        self.set_next_token()
        self._skip_whitespace_and_comments()
        if self.token.is_with():
            return StartsWith()
        self._token_index = saved_index
        raise ValueError("Expected WITH after STARTS")

    def _parse_ends_with_operator(self) -> EndsWith:
        """Parse ENDS WITH operator."""
        # Current token is ENDS. Look ahead for WITH.
        saved_index = self._token_index
        self.set_next_token()
        self._skip_whitespace_and_comments()
        if self.token.is_with():
            return EndsWith()
        self._token_index = saved_index
        raise ValueError("Expected WITH after ENDS")

    def _parse_not_operator(self) -> NotIn | NotContains | NotStartsWith | NotEndsWith | None:
        """Parse NOT IN, NOT CONTAINS, NOT STARTS WITH, or NOT ENDS WITH operator."""
        saved_index = self._token_index
        self.set_next_token()
        self._skip_whitespace_and_comments()
        if self.token.is_in():
            return NotIn()
        if self.token.is_contains():
            return NotContains()
        if self.token.is_starts():
            self.set_next_token()
            self._skip_whitespace_and_comments()
            if self.token.is_with():
                return NotStartsWith()
            self._token_index = saved_index
            return None
        if self.token.is_ends():
            self.set_next_token()
            self._skip_whitespace_and_comments()
            if self.token.is_with():
                return NotEndsWith()
            self._token_index = saved_index
            return None
        # Not a recognized NOT operator — restore position and let the outer loop break.
        self._token_index = saved_index
        return None

    def _parse_lookup(self, node: ASTNode) -> ASTNode:
        variable = node
        lookup: Lookup | RangeLookup | None = None
        while True:
            if self.token.is_dot():
                self.set_next_token()
                if not self.token.is_identifier() and not self.token.is_keyword():
                    raise ValueError("Expected identifier")
                lookup = Lookup()
                lookup.index = Identifier(self.token.value or "")
                lookup.variable = variable
                self.set_next_token()
            elif self.token.is_opening_bracket():
                self.set_next_token()
                self._skip_whitespace_and_comments()
                index = self._parse_expression()
                to = None
                self._skip_whitespace_and_comments()
                if self.token.is_colon():
                    self.set_next_token()
                    self._skip_whitespace_and_comments()
                    lookup = RangeLookup()
                    to = self._parse_expression()
                else:
                    if index is None:
                        raise ValueError("Expected expression")
                    lookup = Lookup()
                self._skip_whitespace_and_comments()
                if not self.token.is_closing_bracket():
                    raise ValueError("Expected closing bracket")
                self.set_next_token()
                if isinstance(lookup, RangeLookup):
                    lookup.from_ = index or Null()
                    lookup.to = to or Null()
                elif isinstance(lookup, Lookup) and index is not None:
                    lookup.index = index
                lookup.variable = variable
            else:
                break
            variable = lookup or variable
        return variable

    def _parse_case(self) -> Optional[Case]:
        if not self.token.is_case():
            return None
        self.set_next_token()
        case = Case()
        parts = 0
        self._expect_and_skip_whitespace_and_comments()
        while True:
            when = self._parse_when()
            if when is None and parts == 0:
                raise ValueError("Expected WHEN")
            elif when is None and parts > 0:
                break
            elif when is not None:
                case.add_child(when)
            self._expect_and_skip_whitespace_and_comments()
            then = self._parse_then()
            if then is None:
                raise ValueError("Expected THEN")
            else:
                case.add_child(then)
            self._expect_and_skip_whitespace_and_comments()
            parts += 1
        else_ = self._parse_else()
        if else_ is None:
            raise ValueError("Expected ELSE")
        else:
            case.add_child(else_)
        self._expect_and_skip_whitespace_and_comments()
        if not self.token.is_end():
            raise ValueError("Expected END")
        self.set_next_token()
        return case

    def _parse_when(self) -> Optional[When]:
        if not self.token.is_when():
            return None
        self.set_next_token()
        when = When()
        self._expect_and_skip_whitespace_and_comments()
        expression = self._parse_expression()
        if expression is None:
            raise ValueError("Expected expression")
        when.add_child(expression)
        return when

    def _parse_then(self) -> Optional[Then]:
        if not self.token.is_then():
            return None
        self.set_next_token()
        then = Then()
        self._expect_and_skip_whitespace_and_comments()
        expression = self._parse_expression()
        if expression is None:
            raise ValueError("Expected expression")
        then.add_child(expression)
        return then

    def _parse_else(self) -> Optional[Else]:
        if not self.token.is_else():
            return None
        self.set_next_token()
        else_ = Else()
        self._expect_and_skip_whitespace_and_comments()
        expression = self._parse_expression()
        if expression is None:
            raise ValueError("Expected expression")
        else_.add_child(expression)
        return else_

    def _parse_alias(self) -> Optional[Alias]:
        self._skip_whitespace_and_comments()
        if not self.token.is_as():
            return None
        self._expect_previous_token_to_be_whitespace_or_comment()
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        if (not self.token.is_identifier() and not self.token.is_keyword()) or self.token.value is None:
            raise ValueError("Expected identifier")
        alias = Alias(self.token.value or "")
        self.set_next_token()
        return alias

    def _looks_like_predicate_function_identifier(self) -> bool:
        """Peeks ahead to check if tokens form: identifier ( identifier_or_keyword IN ..."""
        if not self.token.is_identifier() or self.peek() is None or not self.peek().is_left_parenthesis():
            return False
        saved_index = self._token_index
        self.set_next_token()
        self.set_next_token()
        self._skip_whitespace_and_comments()
        is_predicate_variable = self.token.is_identifier_or_keyword()
        if not is_predicate_variable:
            self._token_index = saved_index
            return False
        self.set_next_token()
        self._skip_whitespace_and_comments()
        result = self.token.is_in()
        self._token_index = saved_index
        return result

    def _parse_predicate_function(self) -> Optional[PredicateFunction]:
        """Parse a predicate function like sum(n in [...] | n where condition)."""
        identifier_pattern = self._looks_like_predicate_function_identifier()
        keyword_pattern = (not identifier_pattern and self.token.is_keyword()
            and self.peek() is not None and self.peek().is_left_parenthesis()
            and FunctionFactory.has_predicate(self.token.value or ""))
        if not identifier_pattern and not keyword_pattern:
            return None
        if self.token.value is None:
            raise ValueError("Expected identifier")
        func = FunctionFactory.create_predicate(self.token.value)
        self.set_next_token()
        if not self.token.is_left_parenthesis():
            raise ValueError("Expected left parenthesis")
        self.set_next_token()
        self._skip_whitespace_and_comments()
        if not self.token.is_identifier_or_keyword():
            raise ValueError("Expected identifier")
        reference = Reference(self.token.value)
        # Block-local binding: visible inside the predicate body only.
        self._state.push_variable_scope()
        self._state.variables[reference.identifier] = reference
        func.add_child(reference)
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        if not self.token.is_in():
            raise ValueError("Expected IN")
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        expression = self._parse_expression()
        if expression is None:
            raise ValueError("Expected expression")
        if not ObjectUtils.is_instance_of_any(expression.first_child(), [
            JSONArray,
            Reference,
            Lookup,
            Function,
        ]):
            raise ValueError("Expected array or reference")
        func.add_child(expression)
        self._skip_whitespace_and_comments()
        if self.token.is_pipe():
            self.set_next_token()
            return_expr = self._parse_expression()
            if return_expr is None:
                raise ValueError("Expected expression")
            func.add_child(return_expr)
        else:
            func.has_return_expression = False
        where = self._parse_where()
        if where is not None:
            func.add_child(where)
        self._skip_whitespace_and_comments()
        if not self.token.is_right_parenthesis():
            raise ValueError("Expected right parenthesis")
        self.set_next_token()
        self._state.pop_variable_scope()
        return func

    def _parse_function(self) -> Optional[Function]:
        if not self.token.is_identifier():
            return None
        name = self.token.value or ""
        if not self.peek() or not self.peek().is_left_parenthesis():
            return None

        try:
            func = FunctionFactory.create(name)
        except ValueError:
            raise ValueError(f"Unknown function: {name}")

        # Check for nested aggregate functions
        if isinstance(func, AggregateFunction) and self._state.context.contains_type(AggregateFunction):
            raise ValueError("Aggregate functions cannot be nested")

        self._state.context.push(func)
        self.set_next_token()  # skip function name
        self.set_next_token()  # skip left parenthesis
        self._skip_whitespace_and_comments()

        # Check for DISTINCT keyword
        if self.token.is_distinct():
            func.distinct = True
            self.set_next_token()
            self._expect_and_skip_whitespace_and_comments()

        params = list(self._parse_function_parameters())
        func.parameters = params

        if not self.token.is_right_parenthesis():
            raise ValueError("Expected right parenthesis")
        self.set_next_token()
        self._state.context.pop()
        return func

    def _parse_async_function(self) -> Optional[AsyncFunction]:
        if not self.token.is_identifier():
            return None
        name = self.token.value or ""
        if not FunctionFactory.is_async_provider(name):
            return None
        self.set_next_token()
        if not self.token.is_left_parenthesis():
            raise ValueError("Expected left parenthesis")
        self.set_next_token()

        func = FunctionFactory.create_async(name)
        params = list(self._parse_function_parameters())
        func.parameters = params

        if not self.token.is_right_parenthesis():
            raise ValueError("Expected right parenthesis")
        self.set_next_token()
        return func

    def _parse_function_parameters(self) -> Iterator[ASTNode]:
        while True:
            self._skip_whitespace_and_comments()
            if self.token.is_right_parenthesis():
                break
            expr = self._parse_expression()
            if expr is not None:
                yield expr
            self._skip_whitespace_and_comments()
            if not self.token.is_comma():
                break
            self.set_next_token()

    def _looks_like_list_comprehension(self) -> bool:
        """Peek ahead from an opening bracket to determine whether the
        upcoming tokens form a list comprehension (e.g. ``[n IN list | n.name]``)
        rather than a plain JSON array literal (e.g. ``[1, 2, 3]``).

        The heuristic is:  ``[`` identifier ``IN`` -> list comprehension.
        """
        saved_index = self._token_index
        self.set_next_token()  # skip '['
        self._skip_whitespace_and_comments()

        if not self.token.is_identifier_or_keyword():
            self._token_index = saved_index
            return False

        self.set_next_token()  # skip identifier
        self._skip_whitespace_and_comments()
        result = self.token.is_in()
        self._token_index = saved_index
        return result

    def _parse_list_comprehension(self) -> Optional[ListComprehension]:
        """Parse a list comprehension expression.

        Syntax: ``[variable IN list [WHERE condition] [| expression]]``
        """
        if not self.token.is_opening_bracket():
            return None

        list_comp = ListComprehension()
        self.set_next_token()  # skip '['
        self._skip_whitespace_and_comments()

        # Parse iteration variable
        if not self.token.is_identifier_or_keyword():
            raise ValueError("Expected identifier")
        reference = Reference(self.token.value or "")
        # Block-local binding: visible inside the comprehension only.
        self._state.push_variable_scope()
        self._state.variables[reference.identifier] = reference
        list_comp.add_child(reference)
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()

        # Parse IN keyword
        if not self.token.is_in():
            raise ValueError("Expected IN")
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()

        # Parse source array expression
        array_expr = self._parse_expression()
        if array_expr is None:
            raise ValueError("Expected expression")
        list_comp.add_child(array_expr)

        # Optional WHERE clause
        self._skip_whitespace_and_comments()
        where = self._parse_where()
        if where is not None:
            list_comp.add_child(where)

        # Optional | mapping expression
        self._skip_whitespace_and_comments()
        if self.token.is_pipe():
            self.set_next_token()
            self._skip_whitespace_and_comments()
            return_expr = self._parse_expression()
            if return_expr is None:
                raise ValueError("Expected expression after |")
            list_comp.add_child(return_expr)

        self._skip_whitespace_and_comments()
        if not self.token.is_closing_bracket():
            raise ValueError("Expected closing bracket")
        self.set_next_token()

        self._state.pop_variable_scope()
        return list_comp

    def _parse_json(self) -> Optional[ASTNode]:
        if self.token.is_opening_brace():
            return self._parse_associative_array()
        elif self.token.is_opening_bracket():
            return self._parse_json_array()
        return None

    def _parse_associative_array(self) -> AssociativeArray:
        if not self.token.is_opening_brace():
            raise ValueError("Expected opening brace")
        self.set_next_token()
        array = AssociativeArray()
        while True:
            self._skip_whitespace_and_comments()
            if self.token.is_closing_brace():
                break
            if not self.token.is_identifier() and not self.token.is_string() and not self.token.is_keyword():
                raise ValueError("Expected key identifier or string")
            key = self.token.value or ""
            self.set_next_token()
            self._skip_whitespace_and_comments()
            if not self.token.is_colon():
                raise ValueError("Expected colon")
            self.set_next_token()
            self._skip_whitespace_and_comments()
            value = self._parse_expression()
            if value is None:
                raise ValueError("Expected value")
            array.add_key_value(KeyValuePair(key, value))
            self._skip_whitespace_and_comments()
            if not self.token.is_comma():
                break
            self.set_next_token()
        if not self.token.is_closing_brace():
            raise ValueError("Expected closing brace")
        self.set_next_token()
        return array

    def _parse_json_array(self) -> JSONArray:
        if not self.token.is_opening_bracket():
            raise ValueError("Expected opening bracket")
        self.set_next_token()
        array = JSONArray()
        while True:
            self._skip_whitespace_and_comments()
            if self.token.is_closing_bracket():
                break
            value = self._parse_expression()
            if value is None:
                break
            array.add_value(value)
            self._skip_whitespace_and_comments()
            if not self.token.is_comma():
                break
            self.set_next_token()
        if not self.token.is_closing_bracket():
            raise ValueError("Expected closing bracket")
        self.set_next_token()
        return array

    def _parse_f_string(self) -> Optional[FString]:
        if not self.token.is_f_string():
            return None
        f_string = FString()
        while self.token.is_f_string() or self.token.is_opening_brace():
            if self.token.is_f_string():
                f_string.add_child(String(self.token.value or ""))
                self.set_next_token()
            elif self.token.is_opening_brace():
                self.set_next_token()
                expr = self._parse_expression()
                if expr is not None:
                    f_string.add_child(expr)
                if self.token.is_closing_brace():
                    self.set_next_token()
        return f_string

    def _skip_whitespace_and_comments(self) -> bool:
        skipped: bool = self.previous_token.is_whitespace_or_comment() if self.previous_token else False
        while self.token.is_whitespace_or_comment():
            self.set_next_token()
            skipped = True
        return skipped

    def _expect_and_skip_whitespace_and_comments(self) -> None:
        skipped = self._skip_whitespace_and_comments()
        if not skipped:
            raise ValueError("Expected whitespace")

    def _expect_previous_token_to_be_whitespace_or_comment(self) -> None:
        if not self.previous_token.is_whitespace_or_comment():
            raise ValueError("Expected previous token to be whitespace or comment")

    def _looks_like_subquery_expression(self) -> bool:
        """Check if current token is EXISTS/COUNT/COLLECT followed by {."""
        val = (self.token.value or "").upper()
        if val not in ("EXISTS", "COUNT", "COLLECT"):
            return False
        if not self.token.is_keyword() and not self.token.is_identifier():
            return False
        saved_index = self._token_index
        self.set_next_token()
        self._skip_whitespace_and_comments()
        is_brace = self.token.is_opening_brace()
        self._token_index = saved_index
        return is_brace

    def _parse_subquery_expression(self) -> Optional[SubqueryExpression]:
        """Parse EXISTS { ... }, COUNT { ... }, or COLLECT { ... }."""
        keyword = (self.token.value or "").upper()
        mode_map = {
            "EXISTS": SubqueryMode.EXISTS,
            "COUNT": SubqueryMode.COUNT,
            "COLLECT": SubqueryMode.COLLECT,
        }
        mode = mode_map.get(keyword)
        if mode is None:
            return None
        self.set_next_token()  # consume EXISTS/COUNT/COLLECT keyword
        self._skip_whitespace_and_comments()
        # The subquery runs as a nested top-level query: it gets its own
        # returns counter, aggregate context, input-scope snapshot and
        # virtual-definition flag.  Variables are inherited from the
        # outer scope so the subquery body can reference them.
        outer_state = self._state
        self._state = ParserState()
        self._state.inherit_variables_from(outer_state)
        subquery_ast = self._parse_sub_query()
        self._state = outer_state
        if subquery_ast is None:
            raise ValueError(f"Expected opening brace after {keyword}")
        return SubqueryExpression(mode, subquery_ast)
