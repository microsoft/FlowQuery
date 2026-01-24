"""Base class for parsers providing common token manipulation functionality."""

from typing import List, Optional

from ..tokenization.token import Token
from ..tokenization.tokenizer import Tokenizer


class BaseParser:
    """Base class for parsers providing common token manipulation functionality.
    
    This class handles tokenization and provides utility methods for navigating
    through tokens, peeking ahead, and checking token sequences.
    """

    def __init__(self, tokens: Optional[List[Token]] = None):
        self._tokens: List[Token] = tokens or []
        self._token_index: int = 0

    def tokenize(self, statement: str) -> None:
        """Tokenizes a statement and initializes the token array.
        
        Args:
            statement: The input statement to tokenize
        """
        self._tokens = Tokenizer(statement).tokenize()
        self._token_index = 0

    def set_next_token(self) -> None:
        """Advances to the next token in the sequence."""
        self._token_index += 1

    def peek(self) -> Optional[Token]:
        """Peeks at the next token without advancing the current position.
        
        Returns:
            The next token, or None if at the end of the token stream
        """
        if self._token_index + 1 >= len(self._tokens):
            return None
        return self._tokens[self._token_index + 1]

    def ahead(self, tokens: List[Token], skip_whitespace_and_comments: bool = True) -> bool:
        """Checks if a sequence of tokens appears ahead in the token stream.
        
        Args:
            tokens: The sequence of tokens to look for
            skip_whitespace_and_comments: Whether to skip whitespace and comments when matching
            
        Returns:
            True if the token sequence is found ahead, False otherwise
        """
        j = 0
        for i in range(self._token_index, len(self._tokens)):
            if skip_whitespace_and_comments and self._tokens[i].is_whitespace_or_comment():
                continue
            if not self._tokens[i].equals(tokens[j]):
                return False
            j += 1
            if j == len(tokens):
                break
        return j == len(tokens)

    @property
    def token(self) -> Token:
        """Gets the current token.
        
        Returns:
            The current token, or EOF if at the end
        """
        if self._token_index >= len(self._tokens):
            return Token.EOF()
        return self._tokens[self._token_index]

    @property
    def previous_token(self) -> Token:
        """Gets the previous token.
        
        Returns:
            The previous token, or EOF if at the beginning
        """
        if self._token_index - 1 < 0:
            return Token.EOF()
        return self._tokens[self._token_index - 1]
