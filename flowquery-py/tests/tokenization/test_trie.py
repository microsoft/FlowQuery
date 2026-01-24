"""Tests for the Trie data structure."""

import pytest
from flowquery.tokenization.trie import Trie
from flowquery.tokenization.token import Token
from flowquery.tokenization.keyword import Keyword


class TestTrie:
    """Test cases for the Trie class."""

    def test_trie_insert_and_find(self):
        """Test Trie insert and find operations."""
        trie = Trie()
        
        # Insert all keywords
        for keyword in Keyword:
            token = Token.method(keyword.value)
            if token is not None and token.value is not None:
                trie.insert(token)
                found = trie.find(keyword.value)
                assert found is not None
        
        # Test for non-existent values
        assert trie.find("not_a_keyword") is None
        assert trie.find("not_an_operator") is None
        assert trie.find("not_a_keyword_or_operator") is None
        assert trie.find("") is None
        assert trie.find(" ") is None
        assert trie.find("a") is None
