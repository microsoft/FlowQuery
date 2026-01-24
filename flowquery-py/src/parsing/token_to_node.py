"""Converts tokens to AST nodes."""

from ..tokenization.token import Token
from .ast_node import ASTNode
from .components.csv import CSV
from .components.json import JSON
from .components.null import Null
from .components.text import Text
from .expressions.boolean import Boolean
from .expressions.identifier import Identifier
from .expressions.number import Number
from .expressions.string import String
from .expressions.operator import (
    Add,
    And,
    Divide,
    Equals,
    GreaterThan,
    GreaterThanOrEqual,
    Is,
    LessThan,
    LessThanOrEqual,
    Modulo,
    Multiply,
    Not,
    NotEquals,
    Or,
    Power,
    Subtract,
)
from .logic.else_ import Else
from .logic.end import End
from .logic.then import Then
from .logic.when import When


class TokenToNode:
    """Converts tokens to their corresponding AST nodes."""

    @staticmethod
    def convert(token: Token) -> ASTNode:
        if token.is_number():
            if token.value is None:
                raise ValueError("Number token has no value")
            return Number(token.value)
        elif token.is_string():
            if token.value is None:
                raise ValueError("String token has no value")
            return String(token.value)
        elif token.is_identifier():
            if token.value is None:
                raise ValueError("Identifier token has no value")
            return Identifier(token.value)
        elif token.is_operator():
            if token.is_add():
                return Add()
            elif token.is_subtract():
                return Subtract()
            elif token.is_multiply():
                return Multiply()
            elif token.is_divide():
                return Divide()
            elif token.is_modulo():
                return Modulo()
            elif token.is_exponent():
                return Power()
            elif token.is_equals():
                return Equals()
            elif token.is_not_equals():
                return NotEquals()
            elif token.is_less_than():
                return LessThan()
            elif token.is_greater_than():
                return GreaterThan()
            elif token.is_greater_than_or_equal():
                return GreaterThanOrEqual()
            elif token.is_less_than_or_equal():
                return LessThanOrEqual()
            elif token.is_and():
                return And()
            elif token.is_or():
                return Or()
            elif token.is_is():
                return Is()
        elif token.is_unary_operator():
            if token.is_not():
                return Not()
        elif token.is_keyword():
            if token.is_json():
                return JSON()
            elif token.is_csv():
                return CSV()
            elif token.is_text():
                return Text()
            elif token.is_when():
                return When()
            elif token.is_then():
                return Then()
            elif token.is_else():
                return Else()
            elif token.is_end():
                return End()
            elif token.is_null():
                return Null()
        elif token.is_boolean():
            return Boolean(token.value)
        else:
            raise ValueError("Unknown token")
        return ASTNode()
