"""Tests for expression evaluation."""

import pytest
from flowquery.parsing.expressions.expression import Expression
from flowquery.parsing.expressions.operator import (
    Add, Subtract, Multiply, Power, GreaterThan, And, Is, IsNot,
    Contains, NotContains, StartsWith, NotStartsWith, EndsWith, NotEndsWith,
)
from flowquery.parsing.expressions.number import Number
from flowquery.parsing.expressions.string import String
from flowquery.parsing.components.null import Null


class TestExpression:
    """Test cases for the Expression class."""

    def test_expression_shunting_yard_algorithm(self):
        """Test Expression Shunting Yard algorithm."""
        expression = Expression()
        expression.add_node(Number("2"))
        expression.add_node(Add())
        expression.add_node(Number("3"))
        expression.add_node(Multiply())
        expression.add_node(Number("4"))
        expression.add_node(Subtract())
        expression.add_node(Number("2"))
        expression.add_node(Power())
        expression.add_node(Number("2"))
        expression.finish()
        assert expression.value() == 10

    def test_expression_with_and_operator(self):
        """Test Expression with and operator."""
        expression = Expression()
        expression.add_node(Number("2"))
        expression.add_node(And())
        expression.add_node(Number("3"))
        expression.finish()
        assert expression.value() == 1

    def test_comparison_with_and(self):
        """Test 1 > 0 and 2 > 1."""
        expression = Expression()
        expression.add_node(Number("1"))
        expression.add_node(GreaterThan())
        expression.add_node(Number("0"))
        expression.add_node(And())
        expression.add_node(Number("2"))
        expression.add_node(GreaterThan())
        expression.add_node(Number("1"))
        expression.finish()
        assert expression.value() == 1

    def test_is_null_with_null_value(self):
        """Test IS NULL with null value."""
        expression = Expression()
        expression.add_node(Null())
        expression.add_node(Is())
        expression.add_node(Null())
        expression.finish()
        assert expression.value() == 1

    def test_is_null_with_non_null_value(self):
        """Test IS NULL with non-null value."""
        expression = Expression()
        expression.add_node(Number("42"))
        expression.add_node(Is())
        expression.add_node(Null())
        expression.finish()
        assert expression.value() == 0

    def test_is_not_null_with_non_null_value(self):
        """Test IS NOT NULL with non-null value."""
        expression = Expression()
        expression.add_node(Number("42"))
        expression.add_node(IsNot())
        expression.add_node(Null())
        expression.finish()
        assert expression.value() == 1

    def test_is_not_null_with_null_value(self):
        """Test IS NOT NULL with null value."""
        expression = Expression()
        expression.add_node(Null())
        expression.add_node(IsNot())
        expression.add_node(Null())
        expression.finish()
        assert expression.value() == 0

    def test_contains_with_matching_substring(self):
        """Test CONTAINS with matching substring."""
        expression = Expression()
        expression.add_node(String("pineapple"))
        expression.add_node(Contains())
        expression.add_node(String("apple"))
        expression.finish()
        assert expression.value() == 1

    def test_contains_with_non_matching_substring(self):
        """Test CONTAINS with non-matching substring."""
        expression = Expression()
        expression.add_node(String("banana"))
        expression.add_node(Contains())
        expression.add_node(String("apple"))
        expression.finish()
        assert expression.value() == 0

    def test_not_contains(self):
        """Test NOT CONTAINS."""
        expression = Expression()
        expression.add_node(String("banana"))
        expression.add_node(NotContains())
        expression.add_node(String("apple"))
        expression.finish()
        assert expression.value() == 1

    def test_starts_with_matching_prefix(self):
        """Test STARTS WITH matching prefix."""
        expression = Expression()
        expression.add_node(String("pineapple"))
        expression.add_node(StartsWith())
        expression.add_node(String("pine"))
        expression.finish()
        assert expression.value() == 1

    def test_starts_with_non_matching_prefix(self):
        """Test STARTS WITH non-matching prefix."""
        expression = Expression()
        expression.add_node(String("pineapple"))
        expression.add_node(StartsWith())
        expression.add_node(String("apple"))
        expression.finish()
        assert expression.value() == 0

    def test_not_starts_with(self):
        """Test NOT STARTS WITH."""
        expression = Expression()
        expression.add_node(String("pineapple"))
        expression.add_node(NotStartsWith())
        expression.add_node(String("apple"))
        expression.finish()
        assert expression.value() == 1

    def test_ends_with_matching_suffix(self):
        """Test ENDS WITH matching suffix."""
        expression = Expression()
        expression.add_node(String("pineapple"))
        expression.add_node(EndsWith())
        expression.add_node(String("apple"))
        expression.finish()
        assert expression.value() == 1

    def test_ends_with_non_matching_suffix(self):
        """Test ENDS WITH non-matching suffix."""
        expression = Expression()
        expression.add_node(String("pineapple"))
        expression.add_node(EndsWith())
        expression.add_node(String("banana"))
        expression.finish()
        assert expression.value() == 0

    def test_not_ends_with(self):
        """Test NOT ENDS WITH."""
        expression = Expression()
        expression.add_node(String("pineapple"))
        expression.add_node(NotEndsWith())
        expression.add_node(String("banana"))
        expression.finish()
        assert expression.value() == 1
