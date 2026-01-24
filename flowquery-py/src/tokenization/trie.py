"""Trie (prefix tree) data structure for efficient keyword and operator lookup."""

from __future__ import annotations
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from .token import Token


class TrieNode:
    """Represents a node in a Trie data structure.
    
    Each node can have children nodes (one per character) and may contain a token
    if the path to this node represents a complete word.
    """

    def __init__(self):
        self._children: dict[str, TrieNode] = {}
        self._token: Optional[Token] = None

    def map(self, char: str) -> TrieNode:
        if char not in self._children:
            self._children[char] = TrieNode()
        return self._children[char]

    def retrieve(self, char: str) -> Optional[TrieNode]:
        return self._children.get(char)

    @property
    def token(self) -> Optional[Token]:
        return self._token

    @token.setter
    def token(self, token: Token) -> None:
        self._token = token

    def is_end_of_word(self) -> bool:
        return self._token is not None

    def no_children(self) -> bool:
        return len(self._children) == 0


class Trie:
    """Trie (prefix tree) data structure for efficient keyword and operator lookup.
    
    Used during tokenization to quickly match input strings against known keywords
    and operators. Supports case-insensitive matching and tracks the longest match found.
    
    Example:
        trie = Trie()
        trie.insert(Token.WITH)
        found = trie.find("WITH")
    """

    def __init__(self):
        self._root = TrieNode()
        self._max_length = 0
        self._last_found: Optional[str] = None

    def insert(self, token: Token) -> None:
        """Inserts a token into the trie.
        
        Args:
            token: The token to insert
            
        Raises:
            ValueError: If the token value is None or empty
        """
        if token.value is None or len(token.value) == 0:
            raise ValueError("Token value cannot be null or empty")
        
        current_node = self._root
        for char in token.value:
            current_node = current_node.map(char.lower())
        
        if len(token.value) > self._max_length:
            self._max_length = len(token.value)
        
        current_node.token = token

    def find(self, value: str) -> Optional[Token]:
        """Finds a token by searching for the longest matching prefix in the trie.
        
        Args:
            value: The string value to search for
            
        Returns:
            The token if found, None otherwise
        """
        if len(value) == 0:
            return None
        
        index = 0
        current: Optional[TrieNode] = None
        found: Optional[Token] = None
        self._last_found = None
        
        while True:
            next_node = (current or self._root).retrieve(value[index].lower())
            if next_node is None:
                break
            current = next_node
            if current.is_end_of_word():
                found = current.token
                self._last_found = value[:index + 1]
            index += 1
            if index >= len(value) or index > self._max_length:
                break
        
        if current is not None and current.is_end_of_word():
            found = current.token
            self._last_found = value[:index]
        
        return found

    @property
    def last_found(self) -> Optional[str]:
        """Gets the last matched string from the most recent find operation.
        
        Returns:
            The last found string, or None if no match was found
        """
        return self._last_found
