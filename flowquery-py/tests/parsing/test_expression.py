"""Tests for expression evaluation."""

import pytest
from flowquery.parsing.expressions.expression import Expression
from flowquery.parsing.expressions.operator import (
    Add, Subtract, Multiply, Power, GreaterThan, And, Is, IsNot,
    Contains, NotContains, StartsWith, NotStartsWith, EndsWith, NotEndsWith,
    Equals, NotEquals,
)
from flowquery.parsing.expressions.number import Number
from flowquery.parsing.expressions.string import String
from flowquery.parsing.components.null import Null
from flowquery.parsing.ast_node import ASTNode


class ObjectValue(ASTNode):
    """Test helper that wraps an arbitrary value as an ASTNode operand."""

    def __init__(self, val):
        super().__init__()
        self._val = val

    def value(self):
        return self._val


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

    # Equals / NotEquals tests

    def test_equals_with_equal_numbers(self):
        """Test Equals with equal numbers."""
        expression = Expression()
        expression.add_node(Number("42"))
        expression.add_node(Equals())
        expression.add_node(Number("42"))
        expression.finish()
        assert expression.value() == 1

    def test_equals_with_different_numbers(self):
        """Test Equals with different numbers."""
        expression = Expression()
        expression.add_node(Number("42"))
        expression.add_node(Equals())
        expression.add_node(Number("99"))
        expression.finish()
        assert expression.value() == 0

    def test_equals_with_structurally_equal_objects(self):
        """Test Equals with structurally equal objects (different references)."""
        expression = Expression()
        expression.add_node(ObjectValue({"id": "1", "name": "Alice"}))
        expression.add_node(Equals())
        expression.add_node(ObjectValue({"id": "1", "name": "Alice"}))
        expression.finish()
        assert expression.value() == 1

    def test_equals_with_different_objects(self):
        """Test Equals with different objects."""
        expression = Expression()
        expression.add_node(ObjectValue({"id": "1", "name": "Alice"}))
        expression.add_node(Equals())
        expression.add_node(ObjectValue({"id": "2", "name": "Bob"}))
        expression.finish()
        assert expression.value() == 0

    def test_not_equals_with_structurally_equal_objects(self):
        """Test NotEquals with structurally equal objects."""
        expression = Expression()
        expression.add_node(ObjectValue({"id": "1", "name": "Alice"}))
        expression.add_node(NotEquals())
        expression.add_node(ObjectValue({"id": "1", "name": "Alice"}))
        expression.finish()
        assert expression.value() == 0

    def test_not_equals_with_different_objects(self):
        """Test NotEquals with different objects."""
        expression = Expression()
        expression.add_node(ObjectValue({"id": "1", "name": "Alice"}))
        expression.add_node(NotEquals())
        expression.add_node(ObjectValue({"id": "2", "name": "Bob"}))
        expression.finish()
        assert expression.value() == 1

    def test_equals_with_same_reference_object(self):
        """Test Equals with the same reference object."""
        obj = {"id": "1", "name": "Alice"}
        expression = Expression()
        expression.add_node(ObjectValue(obj))
        expression.add_node(Equals())
        expression.add_node(ObjectValue(obj))
        expression.finish()
        assert expression.value() == 1
