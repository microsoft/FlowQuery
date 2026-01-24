"""Tests for the parsing context."""

import pytest
from flowquery.parsing.context import Context
from flowquery.parsing.functions.sum import Sum
from flowquery.parsing.functions.aggregate_function import AggregateFunction


class TestContext:
    """Test cases for the Context class."""

    def test_context_contains_type(self):
        """Test Context containsType."""
        context = Context()
        sum_func = Sum()
        context.push(sum_func)
        assert context.contains_type(AggregateFunction) is True

    def test_context_contains_type_false(self):
        """Test Context containsType false."""
        context = Context()
        assert context.contains_type(AggregateFunction) is False

    def test_context_push_and_pop(self):
        """Test Context push and pop."""
        context = Context()
        sum_func = Sum()
        context.push(sum_func)
        assert context.pop() is sum_func

    def test_context_pop_none(self):
        """Test Context pop returns None when empty."""
        context = Context()
        assert context.pop() is None
