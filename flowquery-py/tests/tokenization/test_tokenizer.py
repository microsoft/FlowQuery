"""Tests for the FlowQuery tokenizer."""

import pytest
from flowquery.tokenization.tokenizer import Tokenizer


class TestTokenizer:
    """Test cases for the Tokenizer class."""

    def test_tokenize_returns_array_of_tokens(self):
        """Tokenizer.tokenize() should return an array of tokens."""
        tokenizer = Tokenizer("MATCH (n:Person) RETURN n")
        tokens = tokenizer.tokenize()
        assert tokens is not None
        assert len(tokens) > 0

    def test_tokenize_handles_escaped_quotes(self):
        """Tokenizer.tokenize() should handle escaped quotes."""
        tokenizer = Tokenizer('return "hello \\"world"')
        tokens = tokenizer.tokenize()
        assert tokens is not None
        assert len(tokens) > 0

    def test_predicate_function(self):
        """Test predicate function tokenization."""
        tokenizer = Tokenizer("RETURN sum(n in [1, 2, 3] | n where n > 1)")
        tokens = tokenizer.tokenize()
        assert tokens is not None
        assert len(tokens) > 0

    def test_f_string(self):
        """Test f-string tokenization."""
        tokenizer = Tokenizer('RETURN f"hello {world}"')
        tokens = tokenizer.tokenize()
        assert tokens is not None
        assert len(tokens) > 0

    def test_another_f_string(self):
        """Test another f-string tokenization."""
        tokenizer = Tokenizer("RETURN f`Value is: {value}`")
        tokens = tokenizer.tokenize()
        assert tokens is not None
        assert len(tokens) > 0

    def test_basic(self):
        """Test basic tokenization."""
        tokenizer = Tokenizer("WITH 1 AS n RETURN n")
        tokens = tokenizer.tokenize()
        assert tokens is not None
        assert len(tokens) > 0

    def test_associative_array_with_backtick_string(self):
        """Test associative array with backtick string."""
        tokenizer = Tokenizer("RETURN {`key`: `value`}")
        tokens = tokenizer.tokenize()
        assert tokens is not None
        assert len(tokens) > 0

    def test_limit(self):
        """Test limit keyword."""
        tokenizer = Tokenizer("unwind range(1, 10) as n limit 5 return n")
        tokens = tokenizer.tokenize()
        assert tokens is not None
        assert len(tokens) > 0

    def test_return_negative_number(self):
        """Test return with negative number."""
        tokenizer = Tokenizer("return [:-2], -2")
        tokens = tokenizer.tokenize()
        assert tokens is not None
        assert len(tokens) > 0

    def test_range_with_function(self):
        """Test range with function."""
        tokenizer = Tokenizer("""
            with range(1,10) as data
            return range(0, size(data)-1) as indices
        """)
        tokens = tokenizer.tokenize()
        assert tokens is not None
        assert len(tokens) > 0

    def test_create_virtual_node(self):
        """Test CREATE VIRTUAL node tokenization."""
        tokenizer = Tokenizer("""
            CREATE VIRTUAL (:Person) AS {
                call users() YIELD id, name
            }
        """)
        tokens = tokenizer.tokenize()
        assert tokens is not None
        assert len(tokens) > 0

    def test_create_virtual_relationship(self):
        """Test CREATE VIRTUAL relationship tokenization."""
        tokenizer = Tokenizer("""
            CREATE VIRTUAL (:Person)-[:KNOWS]->(:Person) AS {
                call friendships() YIELD user1_id, user2_id
            }
        """)
        tokens = tokenizer.tokenize()
        assert tokens is not None
        assert len(tokens) > 0

    def test_match_based_on_virtual_node(self):
        """Test match based on virtual node."""
        tokenizer = Tokenizer("""
            MATCH (a:Person)
            RETURN a.name
        """)
        tokens = tokenizer.tokenize()
        assert tokens is not None
        assert len(tokens) > 0

    def test_match_based_on_virtual_nodes_and_relationships(self):
        """Test match based on virtual nodes and relationships."""
        tokenizer = Tokenizer("""
            MATCH (a:Person)-[r:KNOWS]->(b:Person)
            RETURN a.name, b.name
        """)
        tokens = tokenizer.tokenize()
        assert tokens is not None
        assert len(tokens) > 0

    def test_not_equal_operator(self):
        """Test not equal operator."""
        tokenizer = Tokenizer("""
            MATCH (n:Person)
            WHERE n.age <> 30
            RETURN n.name AS name, n.age AS age
        """)
        tokens = tokenizer.tokenize()
        assert tokens is not None
        assert len(tokens) > 0

    def test_equal_operator(self):
        """Test equal operator."""
        tokenizer = Tokenizer("""
            MATCH (n:Person)
            WHERE n.age = 30
            RETURN n.name AS name, n.age AS age
        """)
        tokens = tokenizer.tokenize()
        assert tokens is not None
        assert len(tokens) > 0

    def test_boolean_operators(self):
        """Test boolean operators."""
        tokenizer = Tokenizer("""
            return true AND false OR true NOT false
        """)
        tokens = tokenizer.tokenize()
        assert tokens is not None
        assert len(tokens) > 0

    def test_relationship_with_hops(self):
        """Test relationship with hops."""
        tokenizer = Tokenizer("""
            MATCH (a:Person)-[r:KNOWS*1..3]->(b:Person)
            RETURN a.name, b.name
        """)
        tokens = tokenizer.tokenize()
        assert tokens is not None
        assert len(tokens) > 0
