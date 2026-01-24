"""Tests for the TokenMapper class."""

import pytest
from flowquery.tokenization.token_mapper import TokenMapper
from flowquery.tokenization.symbol import Symbol
from flowquery.tokenization.keyword import Keyword
from flowquery.tokenization.operator import Operator


class TestTokenMapper:
    """Test cases for the TokenMapper class."""

    def test_mapper_with_symbols(self):
        """Test mapper with Symbol enum."""
        mapper = TokenMapper(Symbol)
        
        assert mapper.map(Symbol.LEFT_PARENTHESIS.value) is not None
        assert mapper.map(Symbol.RIGHT_PARENTHESIS.value) is not None
        assert mapper.map(Symbol.COMMA.value) is not None
        assert mapper.map(Symbol.DOT.value) is not None
        assert mapper.map(Symbol.COLON.value) is not None
        
        # Operator should not be found in symbol mapper
        assert mapper.map(Operator.ADD.value) is None

    def test_mapper_with_keywords(self):
        """Test mapper with Keyword enum."""
        mapper = TokenMapper(Keyword)
        
        assert mapper.map(Keyword.MATCH.value) is not None
        assert mapper.map(Keyword.RETURN.value) is not None
        assert mapper.map(Keyword.WHERE.value) is not None
        
        assert mapper.map("not_a_keyword") is None

    def test_mapper_with_operators(self):
        """Test mapper with Operator enum."""
        mapper = TokenMapper(Operator)
        
        assert mapper.map(Operator.GREATER_THAN_OR_EQUAL.value) is not None
        assert mapper.map(Operator.ADD.value) is not None
        assert mapper.map(Operator.SUBTRACT.value) is not None
        assert mapper.map(Operator.NOT.value) is not None
        assert mapper.map(Operator.EQUALS.value) is not None
        assert mapper.map(Operator.NOT_EQUALS.value) is not None
        assert mapper.map(Operator.LESS_THAN.value) is not None
        assert mapper.map(Operator.LESS_THAN_OR_EQUAL.value) is not None
        
        # Partial match should still work
        assert mapper.map(Operator.GREATER_THAN_OR_EQUAL.value + "1") is not None
        
        assert mapper.map("i_s_n_o_t_an_operator") is None

    def test_mapper_with_mixed_types(self):
        """Test mapper with mixed types."""
        mapper = TokenMapper(Symbol)
        
        assert mapper.map(Symbol.LEFT_PARENTHESIS.value) is not None
        assert mapper.map(Symbol.RIGHT_PARENTHESIS.value) is not None
        assert mapper.map(Symbol.COMMA.value) is not None
