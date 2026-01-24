"""Represents a single token in the FlowQuery language."""

from __future__ import annotations
from typing import TYPE_CHECKING, Optional, Any

from .token_type import TokenType
from .keyword import Keyword
from .operator import Operator
from .symbol import Symbol
from ..utils.string_utils import StringUtils

if TYPE_CHECKING:
    from ..parsing.ast_node import ASTNode


class Token:
    """Represents a single token in the FlowQuery language.
    
    Tokens are the atomic units of lexical analysis, produced by the tokenizer
    and consumed by the parser. Each token has a type (keyword, operator, identifier, etc.)
    and an optional value.
    
    Example:
        with_token = Token.WITH
        ident_token = Token.IDENTIFIER("myVar")
        num_token = Token.NUMBER("42")
    """

    def __init__(self, type_: TokenType, value: Optional[str] = None):
        """Creates a new Token instance.
        
        Args:
            type_: The type of the token
            value: The optional value associated with the token
        """
        self._position: int = -1
        self._type = type_
        self._value = value
        self._case_sensitive_value: Optional[str] = None
        self._can_be_identifier = StringUtils.can_be_identifier(value or "")

    def equals(self, other: Token) -> bool:
        """Checks if this token equals another token.
        
        Args:
            other: The token to compare against
            
        Returns:
            True if tokens are equal, False otherwise
        """
        if self._type == TokenType.IDENTIFIER and other.type == TokenType.IDENTIFIER:
            return True  # Identifier values are not compared
        return self._type == other.type and self._value == other.value

    @property
    def position(self) -> int:
        return self._position

    @position.setter
    def position(self, value: int) -> None:
        self._position = value

    @property
    def type(self) -> TokenType:
        return self._type

    @property
    def value(self) -> Optional[str]:
        return self._case_sensitive_value or self._value

    @property
    def case_sensitive_value(self) -> Optional[str]:
        return self._case_sensitive_value

    @case_sensitive_value.setter
    def case_sensitive_value(self, value: str) -> None:
        self._case_sensitive_value = value

    @property
    def can_be_identifier(self) -> bool:
        return self._can_be_identifier

    @property
    def node(self) -> ASTNode:
        from ..parsing.token_to_node import TokenToNode
        return TokenToNode.convert(self)

    def __str__(self) -> str:
        return f"{self._type.value} {self._value}"

    # Comment tokens

    @staticmethod
    def COMMENT(comment: str) -> Token:
        return Token(TokenType.COMMENT, comment)

    def is_comment(self) -> bool:
        return self._type == TokenType.COMMENT

    # Identifier token

    @staticmethod
    def IDENTIFIER(value: str) -> Token:
        return Token(TokenType.IDENTIFIER, value)

    def is_identifier(self) -> bool:
        return self._type == TokenType.IDENTIFIER or self._type == TokenType.BACKTICK_STRING

    # String token

    @staticmethod
    def STRING(value: str, quote_char: str = '"') -> Token:
        unquoted = StringUtils.unquote(value)
        unescaped = StringUtils.remove_escaped_quotes(unquoted, quote_char)
        return Token(TokenType.STRING, unescaped)

    def is_string(self) -> bool:
        return self._type == TokenType.STRING or self._type == TokenType.BACKTICK_STRING

    @staticmethod
    def BACKTICK_STRING(value: str, quote_char: str = '"') -> Token:
        unquoted = StringUtils.unquote(value)
        unescaped = StringUtils.remove_escaped_quotes(unquoted, quote_char)
        return Token(TokenType.BACKTICK_STRING, unescaped)

    @staticmethod
    def F_STRING(value: str, quote_char: str = '"') -> Token:
        unquoted = StringUtils.unquote(value)
        unescaped = StringUtils.remove_escaped_quotes(unquoted, quote_char)
        fstring = StringUtils.remove_escaped_braces(unescaped)
        return Token(TokenType.F_STRING, fstring)

    def is_f_string(self) -> bool:
        return self._type == TokenType.F_STRING

    # Number token

    @staticmethod
    def NUMBER(value: str) -> Token:
        return Token(TokenType.NUMBER, value)

    def is_number(self) -> bool:
        return self._type == TokenType.NUMBER

    # Boolean token

    @staticmethod
    def BOOLEAN(value: str) -> Token:
        return Token(TokenType.BOOLEAN, value)

    def is_boolean(self) -> bool:
        return self._type == TokenType.BOOLEAN and self._value in ("TRUE", "FALSE")

    # Symbol tokens

    @classmethod
    @property
    def LEFT_PARENTHESIS(cls) -> Token:
        return Token(TokenType.SYMBOL, Symbol.LEFT_PARENTHESIS.value)

    def is_left_parenthesis(self) -> bool:
        return self._type == TokenType.SYMBOL and self._value == Symbol.LEFT_PARENTHESIS.value

    @classmethod
    @property
    def RIGHT_PARENTHESIS(cls) -> Token:
        return Token(TokenType.SYMBOL, Symbol.RIGHT_PARENTHESIS.value)

    def is_right_parenthesis(self) -> bool:
        return self._type == TokenType.SYMBOL and self._value == Symbol.RIGHT_PARENTHESIS.value

    @classmethod
    @property
    def COMMA(cls) -> Token:
        return Token(TokenType.SYMBOL, Symbol.COMMA.value)

    def is_comma(self) -> bool:
        return self._type == TokenType.SYMBOL and self._value == Symbol.COMMA.value

    @classmethod
    @property
    def DOT(cls) -> Token:
        return Token(TokenType.SYMBOL, Symbol.DOT.value)

    def is_dot(self) -> bool:
        return self._type == TokenType.SYMBOL and self._value == Symbol.DOT.value

    @classmethod
    @property
    def COLON(cls) -> Token:
        return Token(TokenType.SYMBOL, Symbol.COLON.value)

    def is_colon(self) -> bool:
        return self._type == TokenType.SYMBOL and self._value == Symbol.COLON.value

    @classmethod
    @property
    def OPENING_BRACE(cls) -> Token:
        return Token(TokenType.SYMBOL, Symbol.OPENING_BRACE.value)

    def is_opening_brace(self) -> bool:
        return self._type == TokenType.SYMBOL and self._value == Symbol.OPENING_BRACE.value

    @classmethod
    @property
    def CLOSING_BRACE(cls) -> Token:
        return Token(TokenType.SYMBOL, Symbol.CLOSING_BRACE.value)

    def is_closing_brace(self) -> bool:
        return self._type == TokenType.SYMBOL and self._value == Symbol.CLOSING_BRACE.value

    @classmethod
    @property
    def OPENING_BRACKET(cls) -> Token:
        return Token(TokenType.SYMBOL, Symbol.OPENING_BRACKET.value)

    def is_opening_bracket(self) -> bool:
        return self._type == TokenType.SYMBOL and self._value == Symbol.OPENING_BRACKET.value

    @classmethod
    @property
    def CLOSING_BRACKET(cls) -> Token:
        return Token(TokenType.SYMBOL, Symbol.CLOSING_BRACKET.value)

    def is_closing_bracket(self) -> bool:
        return self._type == TokenType.SYMBOL and self._value == Symbol.CLOSING_BRACKET.value

    # Whitespace token

    @classmethod
    @property
    def WHITESPACE(cls) -> Token:
        return Token(TokenType.WHITESPACE)

    def is_whitespace(self) -> bool:
        return self._type == TokenType.WHITESPACE

    # Operator tokens

    def is_operator(self) -> bool:
        return self._type == TokenType.OPERATOR

    def is_unary_operator(self) -> bool:
        return self._type == TokenType.UNARY_OPERATOR

    @classmethod
    @property
    def ADD(cls) -> Token:
        return Token(TokenType.OPERATOR, Operator.ADD.value)

    def is_add(self) -> bool:
        return self._type == TokenType.OPERATOR and self._value == Operator.ADD.value

    @classmethod
    @property
    def SUBTRACT(cls) -> Token:
        return Token(TokenType.OPERATOR, Operator.SUBTRACT.value)

    def is_subtract(self) -> bool:
        return self._type == TokenType.OPERATOR and self._value == Operator.SUBTRACT.value

    def is_negation(self) -> bool:
        return self.is_subtract()

    @classmethod
    @property
    def MULTIPLY(cls) -> Token:
        return Token(TokenType.OPERATOR, Operator.MULTIPLY.value)

    def is_multiply(self) -> bool:
        return self._type == TokenType.OPERATOR and self._value == Operator.MULTIPLY.value

    @classmethod
    @property
    def DIVIDE(cls) -> Token:
        return Token(TokenType.OPERATOR, Operator.DIVIDE.value)

    def is_divide(self) -> bool:
        return self._type == TokenType.OPERATOR and self._value == Operator.DIVIDE.value

    @classmethod
    @property
    def EXPONENT(cls) -> Token:
        return Token(TokenType.OPERATOR, Operator.EXPONENT.value)

    def is_exponent(self) -> bool:
        return self._type == TokenType.OPERATOR and self._value == Operator.EXPONENT.value

    @classmethod
    @property
    def MODULO(cls) -> Token:
        return Token(TokenType.OPERATOR, Operator.MODULO.value)

    def is_modulo(self) -> bool:
        return self._type == TokenType.OPERATOR and self._value == Operator.MODULO.value

    @classmethod
    @property
    def EQUALS(cls) -> Token:
        return Token(TokenType.OPERATOR, Operator.EQUALS.value)

    def is_equals(self) -> bool:
        return self._type == TokenType.OPERATOR and self._value == Operator.EQUALS.value

    @classmethod
    @property
    def NOT_EQUALS(cls) -> Token:
        return Token(TokenType.OPERATOR, Operator.NOT_EQUALS.value)

    def is_not_equals(self) -> bool:
        return self._type == TokenType.OPERATOR and self._value == Operator.NOT_EQUALS.value

    @classmethod
    @property
    def LESS_THAN(cls) -> Token:
        return Token(TokenType.OPERATOR, Operator.LESS_THAN.value)

    def is_less_than(self) -> bool:
        return self._type == TokenType.OPERATOR and self._value == Operator.LESS_THAN.value

    @classmethod
    @property
    def LESS_THAN_OR_EQUAL(cls) -> Token:
        return Token(TokenType.OPERATOR, Operator.LESS_THAN_OR_EQUAL.value)

    def is_less_than_or_equal(self) -> bool:
        return self._type == TokenType.OPERATOR and self._value == Operator.LESS_THAN_OR_EQUAL.value

    @classmethod
    @property
    def GREATER_THAN(cls) -> Token:
        return Token(TokenType.OPERATOR, Operator.GREATER_THAN.value)

    def is_greater_than(self) -> bool:
        return self._type == TokenType.OPERATOR and self._value == Operator.GREATER_THAN.value

    @classmethod
    @property
    def GREATER_THAN_OR_EQUAL(cls) -> Token:
        return Token(TokenType.OPERATOR, Operator.GREATER_THAN_OR_EQUAL.value)

    def is_greater_than_or_equal(self) -> bool:
        return self._type == TokenType.OPERATOR and self._value == Operator.GREATER_THAN_OR_EQUAL.value

    @classmethod
    @property
    def AND(cls) -> Token:
        return Token(TokenType.OPERATOR, Operator.AND.value)

    def is_and(self) -> bool:
        return self._type == TokenType.OPERATOR and self._value == Operator.AND.value

    @classmethod
    @property
    def OR(cls) -> Token:
        return Token(TokenType.OPERATOR, Operator.OR.value)

    def is_or(self) -> bool:
        return self._type == TokenType.OPERATOR and self._value == Operator.OR.value

    @classmethod
    @property
    def NOT(cls) -> Token:
        return Token(TokenType.UNARY_OPERATOR, Operator.NOT.value)

    def is_not(self) -> bool:
        return self._type == TokenType.UNARY_OPERATOR and self._value == Operator.NOT.value

    @classmethod
    @property
    def IS(cls) -> Token:
        return Token(TokenType.OPERATOR, Operator.IS.value)

    def is_is(self) -> bool:
        return self._type == TokenType.OPERATOR and self._value == Operator.IS.value

    # Keyword tokens

    def is_keyword(self) -> bool:
        return self._type == TokenType.KEYWORD

    @classmethod
    @property
    def WITH(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.WITH.value)

    def is_with(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.WITH.value

    @classmethod
    @property
    def RETURN(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.RETURN.value)

    def is_return(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.RETURN.value

    @classmethod
    @property
    def LOAD(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.LOAD.value)

    def is_load(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.LOAD.value

    @classmethod
    @property
    def CALL(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.CALL.value)

    def is_call(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.CALL.value

    @classmethod
    @property
    def YIELD(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.YIELD.value)

    def is_yield(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.YIELD.value

    @classmethod
    @property
    def JSON(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.JSON.value)

    def is_json(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.JSON.value

    @classmethod
    @property
    def CSV(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.CSV.value)

    def is_csv(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.CSV.value

    @classmethod
    @property
    def TEXT(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.TEXT.value)

    def is_text(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.TEXT.value

    @classmethod
    @property
    def FROM(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.FROM.value)

    def is_from(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.FROM.value

    @classmethod
    @property
    def HEADERS(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.HEADERS.value)

    def is_headers(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.HEADERS.value

    @classmethod
    @property
    def POST(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.POST.value)

    def is_post(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.POST.value

    @classmethod
    @property
    def UNWIND(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.UNWIND.value)

    def is_unwind(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.UNWIND.value

    @classmethod
    @property
    def MATCH(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.MATCH.value)

    def is_match(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.MATCH.value

    @classmethod
    @property
    def AS(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.AS.value)

    def is_as(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.AS.value

    @classmethod
    @property
    def WHERE(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.WHERE.value)

    def is_where(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.WHERE.value

    @classmethod
    @property
    def MERGE(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.MERGE.value)

    def is_merge(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.MERGE.value

    @classmethod
    @property
    def CREATE(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.CREATE.value)

    def is_create(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.CREATE.value

    @classmethod
    @property
    def VIRTUAL(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.VIRTUAL.value)

    def is_virtual(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.VIRTUAL.value

    @classmethod
    @property
    def DELETE(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.DELETE.value)

    def is_delete(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.DELETE.value

    @classmethod
    @property
    def SET(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.SET.value)

    def is_set(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.SET.value

    @classmethod
    @property
    def REMOVE(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.REMOVE.value)

    def is_remove(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.REMOVE.value

    @classmethod
    @property
    def CASE(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.CASE.value)

    def is_case(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.CASE.value

    @classmethod
    @property
    def WHEN(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.WHEN.value)

    def is_when(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.WHEN.value

    @classmethod
    @property
    def THEN(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.THEN.value)

    def is_then(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.THEN.value

    @classmethod
    @property
    def ELSE(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.ELSE.value)

    def is_else(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.ELSE.value

    @classmethod
    @property
    def END(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.END.value)

    def is_end(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.END.value

    @classmethod
    @property
    def NULL(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.NULL.value)

    def is_null(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.NULL.value

    @classmethod
    @property
    def IN(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.IN.value)

    def is_in(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.IN.value

    @classmethod
    @property
    def PIPE(cls) -> Token:
        return Token(TokenType.KEYWORD, Operator.PIPE.value)

    def is_pipe(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Operator.PIPE.value

    @classmethod
    @property
    def DISTINCT(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.DISTINCT.value)

    def is_distinct(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.DISTINCT.value

    @classmethod
    @property
    def LIMIT(cls) -> Token:
        return Token(TokenType.KEYWORD, Keyword.LIMIT.value)

    def is_limit(self) -> bool:
        return self._type == TokenType.KEYWORD and self._value == Keyword.LIMIT.value

    # End of file token

    @classmethod
    @property
    def EOF(cls) -> Token:
        return Token(TokenType.EOF)

    def is_eof(self) -> bool:
        return self._type == TokenType.EOF

    # Other utility methods

    def is_operand(self) -> bool:
        return self.is_number() or self.is_boolean() or self.is_string() or self.is_null()

    def is_whitespace_or_comment(self) -> bool:
        return self.is_whitespace() or self.is_comment()

    def is_symbol(self) -> bool:
        return self._type == TokenType.SYMBOL

    # Static class method lookup via string
    @staticmethod
    def method(name: str) -> Optional[Token]:
        name_upper = name.upper()
        if hasattr(Token, name_upper):
            attr = getattr(Token, name_upper)
            if isinstance(attr, Token):
                return attr
        return None
