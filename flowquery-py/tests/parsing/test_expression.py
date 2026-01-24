"""Tests for expression evaluation."""

import pytest
from flowquery.parsing.expressions.expression import Expression
from flowquery.parsing.expressions.operator import (
    Add, Subtract, Multiply, Power, GreaterThan, And
)
from flowquery.parsing.expressions.number import Number


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
