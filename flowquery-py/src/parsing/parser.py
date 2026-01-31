"""Main parser for FlowQuery statements."""

from typing import Dict, Iterator, List, Optional

from ..tokenization.token import Token
from ..utils.object_utils import ObjectUtils
from .alias import Alias
from .alias_option import AliasOption
from .ast_node import ASTNode
from .base_parser import BaseParser
from .context import Context
from .components.from_ import From
from .components.headers import Headers
from .components.null import Null
from .components.post import Post
from .data_structures.associative_array import AssociativeArray
from .data_structures.json_array import JSONArray
from .data_structures.key_value_pair import KeyValuePair
from .data_structures.lookup import Lookup
from .data_structures.range_lookup import RangeLookup
from .expressions.expression import Expression
from .expressions.f_string import FString
from .expressions.identifier import Identifier
from .expressions.operator import Not
from .expressions.reference import Reference
from .expressions.string import String
from .functions.aggregate_function import AggregateFunction
from .functions.async_function import AsyncFunction
from .functions.function import Function
from .functions.function_factory import FunctionFactory
from .functions.predicate_function import PredicateFunction
from .logic.case import Case
from .logic.when import When
from .logic.then import Then
from .logic.else_ import Else
from .operations.aggregated_return import AggregatedReturn
from .operations.aggregated_with import AggregatedWith
from .operations.call import Call
from .operations.limit import Limit
from .operations.load import Load
from .operations.match import Match
from .operations.operation import Operation
from .operations.return_op import Return
from .operations.unwind import Unwind
from .operations.where import Where
from .operations.with_op import With
from ..graph.node import Node
from ..graph.node_reference import NodeReference
from ..graph.pattern import Pattern
from ..graph.pattern_expression import PatternExpression
from ..graph.relationship import Relationship
from .operations.create_node import CreateNode
from .operations.create_relationship import CreateRelationship


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
        self._variables: Dict[str, ASTNode] = {}
        self._context = Context()
        self._returns = 0

    def parse(self, statement: str) -> ASTNode:
        """Parses a FlowQuery statement into an Abstract Syntax Tree.
        
        Args:
            statement: The FlowQuery statement to parse
            
        Returns:
            The root AST node containing the parsed structure
            
        Raises:
            ValueError: If the statement is malformed or contains syntax errors
        """
        self.tokenize(statement)
        return self._parse_tokenized()

    def _parse_tokenized(self, is_sub_query: bool = False) -> ASTNode:
        root = ASTNode()
        previous: Optional[Operation] = None
        operation: Optional[Operation] = None
        
        while not self.token.is_eof():
            if root.child_count() > 0:
                self._expect_and_skip_whitespace_and_comments()
            else:
                self._skip_whitespace_and_comments()
            
            operation = self._parse_operation()
            if operation is None and not is_sub_query:
                raise ValueError("Expected one of WITH, UNWIND, RETURN, LOAD, OR CALL")
            elif operation is None and is_sub_query:
                return root
            
            if self._returns > 1:
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
            
            limit = self._parse_limit()
            if limit is not None:
                operation.add_sibling(limit)
                operation = limit
            
            previous = operation
        
        if not isinstance(operation, (Return, Call, CreateNode, CreateRelationship)):
            raise ValueError("Last statement must be a RETURN, WHERE, CALL, or CREATE statement")
        
        return root

    def _parse_operation(self) -> Optional[Operation]:
        return (
            self._parse_with() or
            self._parse_unwind() or
            self._parse_return() or
            self._parse_load() or
            self._parse_call() or
            self._parse_match() or
            self._parse_create()
        )

    def _parse_with(self) -> Optional[With]:
        if not self.token.is_with():
            return None
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        expressions = list(self._parse_expressions(AliasOption.REQUIRED))
        if len(expressions) == 0:
            raise ValueError("Expected expression")
        if any(expr.has_reducers() for expr in expressions):
            return AggregatedWith(expressions)
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
        self._variables[alias.get_alias()] = unwind
        return unwind

    def _parse_return(self) -> Optional[Return]:
        if not self.token.is_return():
            return None
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        expressions = list(self._parse_expressions(AliasOption.OPTIONAL))
        if len(expressions) == 0:
            raise ValueError("Expected expression")
        if any(expr.has_reducers() for expr in expressions):
            return AggregatedReturn(expressions)
        self._returns += 1
        return Return(expressions)

    def _parse_where(self) -> Optional[Where]:
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
            self._variables[alias.get_alias()] = load
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
            expressions = list(self._parse_expressions(AliasOption.OPTIONAL))
            if len(expressions) == 0:
                raise ValueError("Expected at least one expression")
            call.yielded = expressions
        return call

    def _parse_match(self) -> Optional[Match]:
        if not self.token.is_match():
            return None
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        patterns = list(self._parse_patterns())
        if len(patterns) == 0:
            raise ValueError("Expected graph pattern")
        return Match(patterns)

    def _parse_create(self) -> Optional[Operation]:
        """Parse CREATE VIRTUAL statement for nodes and relationships."""
        if not self.token.is_create():
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
            if not self.token.is_identifier():
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
        
        self._expect_and_skip_whitespace_and_comments()
        if not self.token.is_as():
            raise ValueError("Expected AS")
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        
        query = self._parse_sub_query()
        if query is None:
            raise ValueError("Expected sub-query")
        
        if relationship is not None:
            return CreateRelationship(relationship, query)
        else:
            return CreateNode(node, query)

    def _parse_sub_query(self) -> Optional[ASTNode]:
        """Parse a sub-query enclosed in braces."""
        if not self.token.is_opening_brace():
            return None
        self.set_next_token()
        self._expect_and_skip_whitespace_and_comments()
        query = self._parse_tokenized(is_sub_query=True)
        self._skip_whitespace_and_comments()
        if not self.token.is_closing_brace():
            raise ValueError("Expected closing brace for sub-query")
        self.set_next_token()
        return query

    def _parse_patterns(self) -> Iterator[Pattern]:
        while True:
            identifier: Optional[str] = None
            if self.token.is_identifier():
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
                    self._variables[identifier] = pattern
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
        if self.token.is_identifier():
            identifier = self.token.value
            self.set_next_token()
        self._skip_whitespace_and_comments()
        label: Optional[str] = None
        peek = self.peek()
        if not self.token.is_colon() and peek is not None and peek.is_identifier():
            raise ValueError("Expected ':' for node label")
        if self.token.is_colon() and (peek is None or not peek.is_identifier()):
            raise ValueError("Expected node label identifier")
        if self.token.is_colon() and peek is not None and peek.is_identifier():
            self.set_next_token()
            label = self.token.value
            self.set_next_token()
        self._skip_whitespace_and_comments()
        node = Node()
        node.label = label
        if label is not None and identifier is not None:
            node.identifier = identifier
            self._variables[identifier] = node
        elif identifier is not None:
            reference = self._variables.get(identifier)
            from ..graph.node_reference import NodeReference
            if reference is None or not isinstance(reference, Node):
                raise ValueError(f"Undefined node reference: {identifier}")
            node = NodeReference(node, reference)
        if not self.token.is_right_parenthesis():
            raise ValueError("Expected closing parenthesis for node definition")
        self.set_next_token()
        return node

    def _parse_relationship(self) -> Optional[Relationship]:
        if self.token.is_less_than() and self.peek() is not None and self.peek().is_subtract():
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
        if self.token.is_identifier():
            variable = self.token.value
            self.set_next_token()
        if not self.token.is_colon():
            raise ValueError("Expected ':' for relationship type")
        self.set_next_token()
        if not self.token.is_identifier():
            raise ValueError("Expected relationship type identifier")
        rel_type: str = self.token.value or ""
        self.set_next_token()
        hops = self._parse_relationship_hops()
        if not self.token.is_closing_bracket():
            raise ValueError("Expected closing bracket for relationship definition")
        self.set_next_token()
        if not self.token.is_subtract():
            raise ValueError("Expected '-' for relationship definition")
        self.set_next_token()
        if self.token.is_greater_than():
            self.set_next_token()
        relationship = Relationship()
        if rel_type is not None and variable is not None:
            relationship.identifier = variable
            self._variables[variable] = relationship
        elif variable is not None:
            reference = self._variables.get(variable)
            from ..graph.relationship_reference import RelationshipReference
            if reference is None or not isinstance(reference, Relationship):
                raise ValueError(f"Undefined relationship reference: {variable}")
            relationship = RelationshipReference(relationship, reference)
        if hops is not None:
            relationship.hops = hops
        relationship.type = rel_type
        return relationship

    def _parse_relationship_hops(self):
        import sys
        from ..graph.hops import Hops
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

    def _parse_expressions(
        self, alias_option: AliasOption = AliasOption.NOT_ALLOWED
    ) -> Iterator[Expression]:
        while True:
            expression = self._parse_expression()
            if expression is not None:
                alias = self._parse_alias()
                if isinstance(expression.first_child(), Reference) and alias is None:
                    reference = expression.first_child()
                    expression.set_alias(reference.identifier)
                    self._variables[reference.identifier] = expression
                elif (alias_option == AliasOption.REQUIRED and 
                      alias is None and 
                      not isinstance(expression.first_child(), Reference)):
                    raise ValueError("Alias required")
                elif alias_option == AliasOption.NOT_ALLOWED and alias is not None:
                    raise ValueError("Alias not allowed")
                elif alias_option in (AliasOption.OPTIONAL, AliasOption.REQUIRED) and alias is not None:
                    expression.set_alias(alias.get_alias())
                    self._variables[alias.get_alias()] = expression
                yield expression
            else:
                break
            self._skip_whitespace_and_comments()
            if not self.token.is_comma():
                break
            self.set_next_token()

    def _parse_operand(self, expression: Expression) -> bool:
        """Parse a single operand (without operators). Returns True if an operand was parsed."""
        self._skip_whitespace_and_comments()
        if self.token.is_identifier() and (self.peek() is None or not self.peek().is_left_parenthesis()):
            identifier = self.token.value or ""
            reference = Reference(identifier, self._variables.get(identifier))
            self.set_next_token()
            lookup = self._parse_lookup(reference)
            expression.add_node(lookup)
            return True
        elif self.token.is_identifier() and self.peek() is not None and self.peek().is_left_parenthesis():
            func = self._parse_predicate_function() or self._parse_function()
            if func is not None:
                lookup = self._parse_lookup(func)
                expression.add_node(lookup)
                return True
        elif self.token.is_left_parenthesis() and self.peek() is not None and (self.peek().is_identifier() or self.peek().is_colon() or self.peek().is_right_parenthesis()):
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
                expression.add_node(self.token.node)
            else:
                break
            self.set_next_token()
        
        if expression.nodes_added():
            expression.finish()
            return expression
        return None

    def _parse_lookup(self, node: ASTNode) -> ASTNode:
        variable = node
        lookup = None
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
        if not self.token.is_identifier():
            raise ValueError("Expected identifier")
        alias = Alias(self.token.value or "")
        self.set_next_token()
        return alias

    def _parse_predicate_function(self) -> Optional[PredicateFunction]:
        """Parse a predicate function like sum(n in [...] | n where condition)."""
        # Lookahead: identifier ( identifier in
        if not self.ahead([
            Token.IDENTIFIER(""),
            Token.LEFT_PARENTHESIS(),
            Token.IDENTIFIER(""),
            Token.IN(),
        ]):
            return None
        if self.token.value is None:
            raise ValueError("Expected identifier")
        func = FunctionFactory.create_predicate(self.token.value)
        self.set_next_token()
        if not self.token.is_left_parenthesis():
            raise ValueError("Expected left parenthesis")
        self.set_next_token()
        self._skip_whitespace_and_comments()
        if not self.token.is_identifier():
            raise ValueError("Expected identifier")
        reference = Reference(self.token.value)
        self._variables[reference.identifier] = reference
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
        if not self.token.is_pipe():
            raise ValueError("Expected pipe")
        self.set_next_token()
        return_expr = self._parse_expression()
        if return_expr is None:
            raise ValueError("Expected expression")
        func.add_child(return_expr)
        where = self._parse_where()
        if where is not None:
            func.add_child(where)
        self._skip_whitespace_and_comments()
        if not self.token.is_right_parenthesis():
            raise ValueError("Expected right parenthesis")
        self.set_next_token()
        del self._variables[reference.identifier]
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
        if isinstance(func, AggregateFunction) and self._context.contains_type(AggregateFunction):
            raise ValueError("Aggregate functions cannot be nested")
        
        self._context.push(func)
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
        self._context.pop()
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
