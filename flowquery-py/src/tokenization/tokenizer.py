"""Tokenizes FlowQuery input strings into a sequence of tokens."""

from typing import List, Optional, Iterator, Callable

from ..utils.string_utils import StringUtils
from .keyword import Keyword
from .operator import Operator
from .string_walker import StringWalker
from .symbol import Symbol
from .token import Token
from .token_mapper import TokenMapper


class Tokenizer:
    """Tokenizes FlowQuery input strings into a sequence of tokens.
    
    The tokenizer performs lexical analysis, breaking down the input text into
    meaningful tokens such as keywords, identifiers, operators, strings, numbers,
    and symbols. It handles comments, whitespace, and f-strings.
    
    Example:
        tokenizer = Tokenizer("WITH x = 1 RETURN x")
        tokens = tokenizer.tokenize()
    """

    def __init__(self, input_: str):
        """Creates a new Tokenizer instance for the given input.
        
        Args:
            input_: The FlowQuery input string to tokenize
        """
        self._walker = StringWalker(input_)
        self._keywords = TokenMapper(Keyword)
        self._symbols = TokenMapper(Symbol)
        self._operators = TokenMapper(Operator)

    def tokenize(self) -> List[Token]:
        """Tokenizes the input string into an array of tokens.
        
        Returns:
            An array of Token objects representing the tokenized input
            
        Raises:
            ValueError: If an unrecognized token is encountered
        """
        tokens: List[Token] = []
        last: Optional[Token] = None
        
        while not self._walker.is_at_end:
            tokens.extend(self._f_string())
            last = self._get_last_non_whitespace_or_non_comment_token(tokens) or last
            token = self._get_next_token(last)
            if token is None:
                raise ValueError(f"Unrecognized token at position {self._walker.position}")
            token.position = self._walker.position
            tokens.append(token)
        
        return tokens

    def _get_last_non_whitespace_or_non_comment_token(self, tokens: List[Token]) -> Optional[Token]:
        if len(tokens) == 0:
            return None
        if not tokens[-1].is_whitespace_or_comment():
            return tokens[-1]
        return None

    def _get_next_token(self, last: Optional[Token] = None) -> Optional[Token]:
        if self._walker.is_at_end:
            return Token.EOF()
        return (
            self._comment() or
            self._whitespace() or
            self._lookup(self._keywords) or
            self._lookup(self._operators, last, self._skip_minus) or
            self._boolean() or
            self._identifier() or
            self._string() or
            self._number() or
            self._lookup(self._symbols)
        )

    def _comment(self) -> Optional[Token]:
        start_position = self._walker.position
        if self._walker.check_for_single_comment() or self._walker.check_for_multi_line_comment():
            uncommented = StringUtils.uncomment(self._walker.get_string(start_position))
            return Token.COMMENT(uncommented)
        return None

    def _boolean(self) -> Optional[Token]:
        start_position = self._walker.position
        if self._walker.check_for_string("TRUE"):
            return Token.BOOLEAN(self._walker.get_string(start_position).upper())
        if self._walker.check_for_string("FALSE"):
            return Token.BOOLEAN(self._walker.get_string(start_position).upper())
        return None

    def _identifier(self) -> Optional[Token]:
        start_position = self._walker.position
        if self._walker.check_for_under_score() or self._walker.check_for_letter():
            while (not self._walker.is_at_end and 
                   (self._walker.check_for_letter() or 
                    self._walker.check_for_digit() or 
                    self._walker.check_for_under_score())):
                pass
            return Token.IDENTIFIER(self._walker.get_string(start_position))
        return None

    def _string(self) -> Optional[Token]:
        start_position = self._walker.position
        quote_char = self._walker.check_for_quote()
        if quote_char is None:
            return None
        
        while not self._walker.is_at_end:
            if self._walker.escaped(quote_char):
                self._walker.move_next()
                self._walker.move_next()
                continue
            if self._walker.check_for_string(quote_char):
                value = self._walker.get_string(start_position)
                if quote_char == Symbol.BACKTICK.value:
                    return Token.BACKTICK_STRING(value, quote_char)
                return Token.STRING(value, quote_char)
            self._walker.move_next()
        
        raise ValueError(f"Unterminated string at position {start_position}")

    def _f_string(self) -> Iterator[Token]:
        if not self._walker.check_for_f_string_start():
            return
        
        self._walker.move_next()  # skip the f
        position = self._walker.position
        quote_char = self._walker.check_for_quote()
        if quote_char is None:
            return
        
        while not self._walker.is_at_end:
            if self._walker.escaped(quote_char) or self._walker.escaped_brace():
                self._walker.move_next()
                self._walker.move_next()
                continue
            
            if self._walker.opening_brace():
                yield Token.F_STRING(self._walker.get_string(position), quote_char)
                position = self._walker.position
                yield Token.OPENING_BRACE()
                self._walker.move_next()  # skip the opening brace
                position = self._walker.position
                
                while not self._walker.is_at_end and not self._walker.closing_brace():
                    token = self._get_next_token()
                    if token is not None:
                        yield token
                    else:
                        break
                    if self._walker.closing_brace():
                        yield Token.CLOSING_BRACE()
                        self._walker.move_next()  # skip the closing brace
                        position = self._walker.position
                        break
            
            if self._walker.check_for_string(quote_char):
                yield Token.F_STRING(self._walker.get_string(position), quote_char)
                return
            
            self._walker.move_next()

    def _whitespace(self) -> Optional[Token]:
        found_whitespace = False
        while not self._walker.is_at_end and self._walker.check_for_whitespace():
            self._walker.move_next()
            found_whitespace = True
        return Token.WHITESPACE() if found_whitespace else None

    def _number(self) -> Optional[Token]:
        start_position = self._walker.position
        if self._walker.check_for_string("-") or self._walker.check_for_digit():
            while not self._walker.is_at_end and self._walker.check_for_digit():
                pass
            if self._walker.check_for_string(Symbol.DOT.value):
                decimal_digits = 0
                while not self._walker.is_at_end and self._walker.check_for_digit():
                    decimal_digits += 1
                if decimal_digits == 0:
                    self._walker.move_previous()
            number_str = self._walker.get_string(start_position)
            return Token.NUMBER(number_str)
        return None

    def _lookup(
        self,
        mapper: TokenMapper,
        last: Optional[Token] = None,
        skip: Optional[Callable[[Optional[Token], Token], bool]] = None
    ) -> Optional[Token]:
        token = mapper.map(self._walker.get_remaining_string())
        if token is not None and token.value is not None:
            if token.can_be_identifier and self._walker.word_continuation(token.value):
                return None
            if skip and last and skip(last, token):
                return None
            self._walker.move_by(len(token.value))
            if mapper.last_found is not None:
                token.case_sensitive_value = mapper.last_found
            return token
        return None

    def _skip_minus(self, last: Optional[Token], current: Token) -> bool:
        if last is None:
            return False
        if (last.is_keyword() or last.is_comma() or last.is_colon()) and current.is_negation():
            return True
        return False
