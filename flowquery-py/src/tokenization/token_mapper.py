"""Maps string values to tokens using a Trie for efficient lookup."""

from typing import Optional

from .token import Token
from .trie import Trie


class TokenMapper:
    """Maps string values to tokens using a Trie for efficient lookup.
    
    Takes an enum of keywords, operators, or symbols and builds a trie
    for fast token matching during tokenization.
    
    Example:
        mapper = TokenMapper(Keyword)
        token = mapper.map("WITH")
    """

    def __init__(self, enum_class):
        """Creates a TokenMapper from an enum of token values.
        
        Args:
            enum_class: An enum class containing token values
        """
        self._trie = Trie()
        self._enum = enum_class
        
        for member in enum_class:
            token = Token.method(member.name)
            if token is not None and token.value is not None:
                self._trie.insert(token)

    def map(self, value: str) -> Optional[Token]:
        """Maps a string value to its corresponding token.
        
        Args:
            value: The string value to map
            
        Returns:
            The matched token, or None if no match found
        """
        return self._trie.find(value)

    @property
    def last_found(self) -> Optional[str]:
        """Gets the last matched string from the most recent map operation.
        
        Returns:
            The last found string, or None if no match
        """
        return self._trie.last_found
