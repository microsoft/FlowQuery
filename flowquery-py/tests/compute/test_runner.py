"""Tests for the FlowQuery Runner."""

import pytest
from typing import AsyncIterator
from flowquery.compute.runner import Runner
from flowquery.parsing.functions.async_function import AsyncFunction
from flowquery.parsing.functions.function_metadata import FunctionDef


# Test classes for CALL operation tests
@FunctionDef({
    "description": "Asynchronous function for testing CALL operation",
    "category": "async",
    "parameters": [],
    "output": {"description": "Yields test values", "type": "any"},
})
class _CallTestFunction(AsyncFunction):
    """Test async function for CALL operation."""
    
    def __init__(self):
        super().__init__("calltestfunction")
        self._expected_parameter_count = 0
    
    async def generate(self) -> AsyncIterator:
        yield {"result": 1, "dummy": "a"}
        yield {"result": 2, "dummy": "b"}
        yield {"result": 3, "dummy": "c"}


@FunctionDef({
    "description": "Asynchronous function for testing CALL operation with no yielded expressions",
    "category": "async",
    "parameters": [],
    "output": {"description": "Yields test values", "type": "any"},
})
class _CallTestFunctionNoObject(AsyncFunction):
    """Test async function for CALL operation without object output."""
    
    def __init__(self):
        super().__init__("calltestfunctionnoobject")
        self._expected_parameter_count = 0
    
    async def generate(self) -> AsyncIterator:
        yield 1
        yield 2
        yield 3


class TestRunner:
    """Test cases for the Runner class."""

    @pytest.mark.asyncio
    async def test_return(self):
        """Test return operation."""
        runner = Runner("return 1 + 2 as sum")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"sum": 3}

    @pytest.mark.asyncio
    async def test_return_with_multiple_expressions(self):
        """Test return with multiple expressions."""
        runner = Runner("return 1 + 2 as sum, 3 + 4 as sum2")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"sum": 3, "sum2": 7}

    @pytest.mark.asyncio
    async def test_unwind_and_return(self):
        """Test unwind and return."""
        runner = Runner("unwind [1, 2, 3] as num return num")
        await runner.run()
        results = runner.results
        assert len(results) == 3
        assert results[0] == {"num": 1}
        assert results[1] == {"num": 2}
        assert results[2] == {"num": 3}

    @pytest.mark.asyncio
    async def test_load_and_return(self):
        """Test load and return."""
        runner = Runner(
            'load json from "https://jsonplaceholder.typicode.com/todos" as todo return todo'
        )
        await runner.run()
        results = runner.results
        assert len(results) > 0

    @pytest.mark.asyncio
    async def test_load_with_post_and_return(self):
        """Test load with post and return."""
        runner = Runner(
            'load json from "https://jsonplaceholder.typicode.com/posts" post {userId: 1} as data return data'
        )
        await runner.run()
        results = runner.results
        assert len(results) == 1

    @pytest.mark.asyncio
    async def test_load_which_should_throw_error(self):
        """Test load which should throw error."""
        runner = Runner('load json from "http://non_existing" as data return data')
        with pytest.raises(Exception) as exc_info:
            await runner.run()
        assert "non_existing" in str(exc_info.value).lower() or "failed" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_aggregated_return(self):
        """Test aggregated return."""
        runner = Runner(
            "unwind [1, 1, 2, 2] as i unwind [1, 2, 3, 4] as j return i, sum(j) as sum"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert results[0] == {"i": 1, "sum": 20}
        assert results[1] == {"i": 2, "sum": 20}

    @pytest.mark.asyncio
    async def test_aggregated_return_with_string(self):
        """Test aggregated return with string."""
        runner = Runner(
            'unwind [1, 1, 2, 2] as i unwind ["a", "b", "c", "d"] as j return i, sum(j) as sum'
        )
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert results[0] == {"i": 1, "sum": "abcdabcd"}
        assert results[1] == {"i": 2, "sum": "abcdabcd"}

    @pytest.mark.asyncio
    async def test_aggregated_return_with_object(self):
        """Test aggregated return with object."""
        runner = Runner(
            "unwind [1, 1, 2, 2] as i unwind [1, 2, 3, 4] as j return i, {sum: sum(j)} as sum"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert results[0] == {"i": 1, "sum": {"sum": 20}}
        assert results[1] == {"i": 2, "sum": {"sum": 20}}

    @pytest.mark.asyncio
    async def test_aggregated_return_with_array(self):
        """Test aggregated return with array."""
        runner = Runner(
            "unwind [1, 1, 2, 2] as i unwind [1, 2, 3, 4] as j return i, [sum(j)] as sum"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert results[0] == {"i": 1, "sum": [20]}
        assert results[1] == {"i": 2, "sum": [20]}

    @pytest.mark.asyncio
    async def test_aggregated_return_with_multiple_aggregates(self):
        """Test aggregated return with multiple aggregates."""
        runner = Runner(
            "unwind [1, 1, 2, 2] as i unwind [1, 2, 3, 4] as j return i, sum(j) as sum, avg(j) as avg"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert results[0] == {"i": 1, "sum": 20, "avg": 2.5}
        assert results[1] == {"i": 2, "sum": 20, "avg": 2.5}

    @pytest.mark.asyncio
    async def test_count(self):
        """Test count aggregate function."""
        runner = Runner(
            "unwind [1, 1, 2, 2] as i unwind [1, 2, 3, 4] as j return i, count(j) as cnt"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert results[0] == {"i": 1, "cnt": 8}
        assert results[1] == {"i": 2, "cnt": 8}

    @pytest.mark.asyncio
    async def test_count_distinct(self):
        """Test count with distinct modifier."""
        runner = Runner(
            """
            unwind [1, 1, 2, 2] as i
            unwind [1, 2, 1, 2] as j
            return i, count(distinct j) as cnt
            """
        )
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert results[0] == {"i": 1, "cnt": 2}
        assert results[1] == {"i": 2, "cnt": 2}

    @pytest.mark.asyncio
    async def test_count_with_strings(self):
        """Test count with string values."""
        runner = Runner(
            """
            unwind ["a", "b", "a", "c"] as s
            return count(s) as cnt
            """
        )
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"cnt": 4}

    @pytest.mark.asyncio
    async def test_count_distinct_with_strings(self):
        """Test count distinct with string values."""
        runner = Runner(
            """
            unwind ["a", "b", "a", "c"] as s
            return count(distinct s) as cnt
            """
        )
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"cnt": 3}

    @pytest.mark.asyncio
    async def test_avg_with_null(self):
        """Test avg with null."""
        runner = Runner("return avg(null) as avg")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"avg": None}

    @pytest.mark.asyncio
    async def test_sum_with_null(self):
        """Test sum with null."""
        runner = Runner("return sum(null) as sum")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"sum": None}

    @pytest.mark.asyncio
    async def test_avg_with_one_value(self):
        """Test avg with one value."""
        runner = Runner("return avg(1) as avg")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"avg": 1}

    @pytest.mark.asyncio
    async def test_min(self):
        """Test min aggregate function."""
        runner = Runner("unwind [3, 1, 4, 1, 5, 9] as n return min(n) as minimum")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"minimum": 1}

    @pytest.mark.asyncio
    async def test_max(self):
        """Test max aggregate function."""
        runner = Runner("unwind [3, 1, 4, 1, 5, 9] as n return max(n) as maximum")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"maximum": 9}

    @pytest.mark.asyncio
    async def test_min_with_grouped_values(self):
        """Test min with grouped values."""
        runner = Runner(
            "unwind [1, 1, 2, 2] as i unwind [10, 20, 30, 40] as j return i, min(j) as minimum"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert results[0] == {"i": 1, "minimum": 10}
        assert results[1] == {"i": 2, "minimum": 10}

    @pytest.mark.asyncio
    async def test_max_with_grouped_values(self):
        """Test max with grouped values."""
        runner = Runner(
            "unwind [1, 1, 2, 2] as i unwind [10, 20, 30, 40] as j return i, max(j) as maximum"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert results[0] == {"i": 1, "maximum": 40}
        assert results[1] == {"i": 2, "maximum": 40}

    @pytest.mark.asyncio
    async def test_min_with_null(self):
        """Test min with null."""
        runner = Runner("return min(null) as minimum")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"minimum": None}

    @pytest.mark.asyncio
    async def test_max_with_null(self):
        """Test max with null."""
        runner = Runner("return max(null) as maximum")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"maximum": None}

    @pytest.mark.asyncio
    async def test_min_with_strings(self):
        """Test min with string values."""
        runner = Runner(
            'unwind ["cherry", "apple", "banana"] as s return min(s) as minimum'
        )
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"minimum": "apple"}

    @pytest.mark.asyncio
    async def test_max_with_strings(self):
        """Test max with string values."""
        runner = Runner(
            'unwind ["cherry", "apple", "banana"] as s return max(s) as maximum'
        )
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"maximum": "cherry"}

    @pytest.mark.asyncio
    async def test_min_and_max_together(self):
        """Test min and max together."""
        runner = Runner(
            "unwind [3, 1, 4, 1, 5, 9] as n return min(n) as minimum, max(n) as maximum"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"minimum": 1, "maximum": 9}

    @pytest.mark.asyncio
    async def test_with_and_return(self):
        """Test with and return."""
        runner = Runner("with 1 as a return a")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"a": 1}

    def test_nested_aggregate_functions(self):
        """Test nested aggregate functions throw error."""
        with pytest.raises(Exception, match="Aggregate functions cannot be nested"):
            Runner("unwind [1, 2, 3, 4] as i return sum(sum(i)) as sum")

    @pytest.mark.asyncio
    async def test_with_and_return_with_unwind(self):
        """Test with and return with unwind."""
        runner = Runner("with [1, 2, 3] as a unwind a as b return b as renamed")
        await runner.run()
        results = runner.results
        assert len(results) == 3
        assert results[0] == {"renamed": 1}
        assert results[1] == {"renamed": 2}
        assert results[2] == {"renamed": 3}

    @pytest.mark.asyncio
    async def test_predicate_function(self):
        """Test predicate function."""
        runner = Runner("RETURN sum(n in [1, 2, 3] | n where n > 1) as sum")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"sum": 5}

    @pytest.mark.asyncio
    async def test_predicate_without_where(self):
        """Test predicate without where."""
        runner = Runner("RETURN sum(n in [1, 2, 3] | n) as sum")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"sum": 6}

    @pytest.mark.asyncio
    async def test_predicate_with_return_expression(self):
        """Test predicate with return expression."""
        runner = Runner("RETURN sum(n in [1+2+3, 2, 3] | n^2) as sum")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"sum": 49}

    @pytest.mark.asyncio
    async def test_range_function(self):
        """Test range function."""
        runner = Runner("RETURN range(1, 3) as range")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"range": [1, 2, 3]}

    @pytest.mark.asyncio
    async def test_range_function_with_unwind_and_case(self):
        """Test range function with unwind and case."""
        runner = Runner(
            "unwind range(1, 3) as num return case when num > 1 then num else null end as ret"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 3
        assert results[0] == {"ret": None}
        assert results[1] == {"ret": 2}
        assert results[2] == {"ret": 3}

    @pytest.mark.asyncio
    async def test_size_function(self):
        """Test size function."""
        runner = Runner("RETURN size([1, 2, 3]) as size")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"size": 3}

    @pytest.mark.asyncio
    async def test_rand_and_round_functions(self):
        """Test rand and round functions."""
        runner = Runner("RETURN round(rand() * 10) as rand")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0]["rand"] <= 10

    @pytest.mark.asyncio
    async def test_split_function(self):
        """Test split function."""
        runner = Runner('RETURN split("a,b,c", ",") as split')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"split": ["a", "b", "c"]}

    @pytest.mark.asyncio
    async def test_f_string(self):
        """Test f-string."""
        runner = Runner(
            'with range(1,3) as numbers RETURN f"hello {sum(n in numbers | n)}" as f'
        )
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"f": "hello 6"}

    @pytest.mark.asyncio
    async def test_aggregated_with_and_return(self):
        """Test aggregated with and return."""
        runner = Runner(
            """
            unwind [1, 1, 2, 2] as i
            unwind range(1, 3) as j
            with i, sum(j) as sum
            return i, sum
            """
        )
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert results[0] == {"i": 1, "sum": 12}
        assert results[1] == {"i": 2, "sum": 12}

    @pytest.mark.asyncio
    async def test_aggregated_with_on_empty_result_set(self):
        """Test aggregated with on empty result set does not crash."""
        runner = Runner(
            """
            unwind [] as i
            unwind [1, 2] as j
            with i, count(j) as cnt
            return i, cnt
            """
        )
        await runner.run()
        results = runner.results
        assert len(results) == 0

    @pytest.mark.asyncio
    async def test_aggregated_with_using_collect_and_return(self):
        """Test aggregated with using collect and return."""
        runner = Runner(
            """
            unwind [1, 1, 2, 2] as i
            unwind range(1, 3) as j
            with i, collect(j) as collected
            return i, collected
            """
        )
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert results[0] == {"i": 1, "collected": [1, 2, 3, 1, 2, 3]}
        assert results[1] == {"i": 2, "collected": [1, 2, 3, 1, 2, 3]}

    @pytest.mark.asyncio
    async def test_collect_distinct(self):
        """Test collect distinct."""
        runner = Runner(
            """
            unwind [1, 1, 2, 2] as i
            unwind range(1, 3) as j
            with i, collect(distinct j) as collected
            return i, collected
            """
        )
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert results[0] == {"i": 1, "collected": [1, 2, 3]}
        assert results[1] == {"i": 2, "collected": [1, 2, 3]}

    @pytest.mark.asyncio
    async def test_collect_distinct_with_associative_array(self):
        """Test collect distinct with associative array."""
        runner = Runner(
            """
            unwind [1, 1, 2, 2] as i
            unwind range(1, 3) as j
            with i, collect(distinct {j: j}) as collected
            return i, collected
            """
        )
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert results[0] == {"i": 1, "collected": [{"j": 1}, {"j": 2}, {"j": 3}]}
        assert results[1] == {"i": 2, "collected": [{"j": 1}, {"j": 2}, {"j": 3}]}

    @pytest.mark.asyncio
    async def test_return_distinct(self):
        """Test return distinct."""
        runner = Runner(
            """
            unwind [1, 1, 2, 2, 3, 3] as i
            return distinct i
            """
        )
        await runner.run()
        results = runner.results
        assert len(results) == 3
        assert results[0] == {"i": 1}
        assert results[1] == {"i": 2}
        assert results[2] == {"i": 3}

    @pytest.mark.asyncio
    async def test_return_distinct_with_multiple_expressions(self):
        """Test return distinct with multiple expressions."""
        runner = Runner(
            """
            unwind [1, 1, 2, 2] as i
            unwind [10, 10, 20, 20] as j
            return distinct i, j
            """
        )
        await runner.run()
        results = runner.results
        assert len(results) == 4
        assert results[0] == {"i": 1, "j": 10}
        assert results[1] == {"i": 1, "j": 20}
        assert results[2] == {"i": 2, "j": 10}
        assert results[3] == {"i": 2, "j": 20}

    @pytest.mark.asyncio
    async def test_with_distinct(self):
        """Test with distinct."""
        runner = Runner(
            """
            unwind [1, 1, 2, 2, 3, 3] as i
            with distinct i as i
            return i
            """
        )
        await runner.run()
        results = runner.results
        assert len(results) == 3
        assert results[0] == {"i": 1}
        assert results[1] == {"i": 2}
        assert results[2] == {"i": 3}

    @pytest.mark.asyncio
    async def test_with_distinct_and_aggregation(self):
        """Test with distinct followed by aggregation."""
        runner = Runner(
            """
            unwind [1, 1, 2, 2] as i
            with distinct i as i
            return sum(i) as total
            """
        )
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"total": 3}

    @pytest.mark.asyncio
    async def test_return_distinct_with_strings(self):
        """Test return distinct with strings."""
        runner = Runner(
            """
            unwind ["a", "b", "a", "c", "b"] as x
            return distinct x
            """
        )
        await runner.run()
        results = runner.results
        assert len(results) == 3
        assert results[0] == {"x": "a"}
        assert results[1] == {"x": "b"}
        assert results[2] == {"x": "c"}

    @pytest.mark.asyncio
    async def test_join_function(self):
        """Test join function."""
        runner = Runner('RETURN join(["a", "b", "c"], ",") as join')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"join": "a,b,c"}

    @pytest.mark.asyncio
    async def test_join_function_with_empty_array(self):
        """Test join function with empty array."""
        runner = Runner('RETURN join([], ",") as join')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"join": ""}

    @pytest.mark.asyncio
    async def test_tojson_function(self):
        """Test tojson function."""
        runner = Runner("RETURN tojson('{\"a\": 1, \"b\": 2}') as tojson")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"tojson": {"a": 1, "b": 2}}

    @pytest.mark.asyncio
    async def test_tojson_function_with_lookup(self):
        """Test tojson function with lookup."""
        runner = Runner("RETURN tojson('{\"a\": 1, \"b\": 2}').a as tojson")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"tojson": 1}

    @pytest.mark.asyncio
    async def test_replace_function(self):
        """Test replace function."""
        runner = Runner('RETURN replace("hello", "l", "x") as replace')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"replace": "hexxo"}

    @pytest.mark.asyncio
    async def test_string_distance_function(self):
        """Test string_distance function."""
        runner = Runner('RETURN string_distance("kitten", "sitting") as dist')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0]["dist"] == pytest.approx(3 / 7)

    @pytest.mark.asyncio
    async def test_string_distance_identical_strings(self):
        """Test string_distance function with identical strings."""
        runner = Runner('RETURN string_distance("hello", "hello") as dist')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"dist": 0}

    @pytest.mark.asyncio
    async def test_string_distance_empty_string(self):
        """Test string_distance function with empty string."""
        runner = Runner('RETURN string_distance("", "abc") as dist')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"dist": 1}

    @pytest.mark.asyncio
    async def test_string_distance_both_empty(self):
        """Test string_distance function with both empty strings."""
        runner = Runner('RETURN string_distance("", "") as dist')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"dist": 0}

    @pytest.mark.asyncio
    async def test_f_string_with_escaped_braces(self):
        """Test f-string with escaped braces."""
        runner = Runner(
            'with range(1,3) as numbers RETURN f"hello {{sum(n in numbers | n)}}" as f'
        )
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"f": "hello {sum(n in numbers | n)}"}

    @pytest.mark.asyncio
    async def test_predicate_function_with_collection_from_lookup(self):
        """Test predicate function with collection from lookup."""
        runner = Runner("RETURN sum(n in tojson('{\"a\": [1, 2, 3]}').a | n) as sum")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"sum": 6}

    @pytest.mark.asyncio
    async def test_stringify_function(self):
        """Test stringify function."""
        runner = Runner("RETURN stringify({a: 1, b: 2}) as stringify")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"stringify": '{\n   "a": 1,\n   "b": 2\n}'}

    @pytest.mark.asyncio
    async def test_to_string_function_with_number(self):
        """Test toString function with a number."""
        runner = Runner("RETURN toString(42) as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": "42"}

    @pytest.mark.asyncio
    async def test_to_string_function_with_boolean(self):
        """Test toString function with a boolean."""
        runner = Runner("RETURN toString(true) as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": "true"}

    @pytest.mark.asyncio
    async def test_to_string_function_with_object(self):
        """Test toString function with an object."""
        runner = Runner("RETURN toString({a: 1}) as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": '{"a": 1}'}

    @pytest.mark.asyncio
    async def test_to_lower_function(self):
        """Test toLower function."""
        runner = Runner('RETURN toLower("Hello World") as result')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": "hello world"}

    @pytest.mark.asyncio
    async def test_to_lower_function_with_all_uppercase(self):
        """Test toLower function with all uppercase."""
        runner = Runner('RETURN toLower("FOO BAR") as result')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": "foo bar"}

    @pytest.mark.asyncio
    async def test_trim_function(self):
        """Test trim function."""
        runner = Runner('RETURN trim("  hello  ") as result')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": "hello"}

    @pytest.mark.asyncio
    async def test_trim_function_with_tabs_and_newlines(self):
        """Test trim function with tabs and newlines."""
        runner = Runner('WITH "\tfoo\n" AS s RETURN trim(s) as result')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": "foo"}

    @pytest.mark.asyncio
    async def test_trim_function_with_no_whitespace(self):
        """Test trim function with no whitespace."""
        runner = Runner('RETURN trim("hello") as result')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": "hello"}

    @pytest.mark.asyncio
    async def test_trim_function_with_empty_string(self):
        """Test trim function with empty string."""
        runner = Runner('RETURN trim("") as result')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": ""}

    @pytest.mark.asyncio
    async def test_substring_function_with_start_and_length(self):
        """Test substring function with start and length."""
        runner = Runner('RETURN substring("hello", 1, 3) as result')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": "ell"}

    @pytest.mark.asyncio
    async def test_substring_function_with_start_only(self):
        """Test substring function with start only."""
        runner = Runner('RETURN substring("hello", 2) as result')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": "llo"}

    @pytest.mark.asyncio
    async def test_substring_function_with_zero_start(self):
        """Test substring function with zero start."""
        runner = Runner('RETURN substring("hello", 0, 5) as result')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": "hello"}

    @pytest.mark.asyncio
    async def test_substring_function_with_zero_length(self):
        """Test substring function with zero length."""
        runner = Runner('RETURN substring("hello", 1, 0) as result')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": ""}

    @pytest.mark.asyncio
    async def test_associative_array_with_key_which_is_keyword(self):
        """Test associative array with key which is keyword."""
        runner = Runner("RETURN {return: 1} as aa")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"aa": {"return": 1}}

    @pytest.mark.asyncio
    async def test_lookup_which_is_keyword(self):
        """Test lookup which is keyword."""
        runner = Runner("RETURN {return: 1}.return as aa")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"aa": 1}

    @pytest.mark.asyncio
    async def test_lookup_which_is_keyword_bracket(self):
        """Test lookup which is keyword with bracket notation."""
        runner = Runner('RETURN {return: 1}["return"] as aa')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"aa": 1}

    @pytest.mark.asyncio
    async def test_return_with_expression_alias_which_starts_with_keyword(self):
        """Test return with expression alias which starts with keyword."""
        runner = Runner('RETURN 1 as return1, ["hello", "world"] as notes')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"return1": 1, "notes": ["hello", "world"]}

    @pytest.mark.asyncio
    async def test_return_with_where_clause(self):
        """Test return with where clause."""
        runner = Runner("unwind range(1,100) as n with n return n where n >= 20 and n <= 30")
        await runner.run()
        results = runner.results
        assert len(results) == 11
        assert results[0] == {"n": 20}
        assert results[10] == {"n": 30}

    @pytest.mark.asyncio
    async def test_return_with_where_clause_and_expression_alias(self):
        """Test return with where clause and expression alias."""
        runner = Runner(
            "unwind range(1,100) as n with n return n as number where n >= 20 and n <= 30"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 11
        assert results[0] == {"number": 20}
        assert results[10] == {"number": 30}

    @pytest.mark.asyncio
    async def test_aggregated_return_with_where_clause(self):
        """Test aggregated return with where clause."""
        runner = Runner(
            "unwind range(1,100) as n with n where n >= 20 and n <= 30 return sum(n) as sum"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"sum": 275}

    @pytest.mark.asyncio
    async def test_chained_aggregated_return_with_where_clause(self):
        """Test chained aggregated return with where clause."""
        runner = Runner(
            """
            unwind [1, 1, 2, 2] as i
            unwind range(1, 4) as j
            return i, sum(j) as sum
            where i = 1
            """
        )
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"i": 1, "sum": 20}

    @pytest.mark.asyncio
    async def test_predicate_function_with_collection_from_function(self):
        """Test predicate function with collection from function."""
        runner = Runner(
            """
            unwind range(1, 10) as i
            unwind range(1, 10) as j
            return i, sum(j), avg(j), sum(n in collect(j) | n) as sum
            """
        )
        await runner.run()
        results = runner.results
        assert len(results) == 10
        assert results[0] == {"i": 1, "expr1": 55, "expr2": 5.5, "sum": 55}

    @pytest.mark.asyncio
    async def test_limit(self):
        """Test limit."""
        runner = Runner(
            """
            unwind range(1, 10) as i
            unwind range(1, 10) as j
            limit 5
            return j
            """
        )
        await runner.run()
        results = runner.results
        assert len(results) == 50

    @pytest.mark.asyncio
    async def test_limit_as_last_operation(self):
        """Test limit as the last operation after return."""
        runner = Runner(
            """
            unwind range(1, 10) as i
            return i
            limit 5
            """
        )
        await runner.run()
        results = runner.results
        assert len(results) == 5

    @pytest.mark.asyncio
    async def test_range_lookup(self):
        """Test range lookup."""
        runner = Runner(
            """
            with range(1, 10) as numbers
            return
                numbers[:] as subset1,
                numbers[0:3] as subset2,
                numbers[:-2] as subset3
            """
        )
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {
            "subset1": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            "subset2": [1, 2, 3],
            "subset3": [1, 2, 3, 4, 5, 6, 7, 8],
        }

    @pytest.mark.asyncio
    async def test_return_negative_number(self):
        """Test return -1."""
        runner = Runner("return -1 as num")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"num": -1}

    @pytest.mark.asyncio
    async def test_unwind_range_lookup(self):
        """Test unwind range lookup."""
        runner = Runner(
            """
            with range(1,10) as arr
            unwind arr[2:-2] as a
            return a
            """
        )
        await runner.run()
        results = runner.results
        assert len(results) == 6
        assert results[0] == {"a": 3}
        assert results[5] == {"a": 8}

    @pytest.mark.asyncio
    async def test_range_with_size(self):
        """Test range with size."""
        runner = Runner(
            """
            with range(1,10) as data
            return range(0, size(data)-1) as indices
            """
        )
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"indices": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}

    @pytest.mark.asyncio
    async def test_keys_function(self):
        """Test keys function."""
        runner = Runner('RETURN keys({name: "Alice", age: 30}) as keys')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"keys": ["name", "age"]}

    @pytest.mark.asyncio
    async def test_properties_function_with_map(self):
        """Test properties function with a plain map."""
        runner = Runner('RETURN properties({name: "Alice", age: 30}) as props')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"props": {"name": "Alice", "age": 30}}

    @pytest.mark.asyncio
    async def test_properties_function_with_node(self):
        """Test properties function with a graph node."""
        await Runner(
            """
            CREATE VIRTUAL (:Animal) AS {
                UNWIND [
                    {id: 1, name: 'Dog', legs: 4},
                    {id: 2, name: 'Cat', legs: 4}
                ] AS record
                RETURN record.id AS id, record.name AS name, record.legs AS legs
            }
            """
        ).run()
        match = Runner(
            """
            MATCH (a:Animal)
            RETURN properties(a) AS props
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 2
        assert results[0] == {"props": {"name": "Dog", "legs": 4}}
        assert results[1] == {"props": {"name": "Cat", "legs": 4}}

    @pytest.mark.asyncio
    async def test_properties_function_with_null(self):
        """Test properties function with null."""
        runner = Runner("RETURN properties(null) as props")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"props": None}

    @pytest.mark.asyncio
    async def test_nodes_function(self):
        """Test nodes function with a graph path."""
        await Runner(
            """
            CREATE VIRTUAL (:City) AS {
                UNWIND [
                    {id: 1, name: 'New York'},
                    {id: 2, name: 'Boston'}
                ] AS record
                RETURN record.id AS id, record.name AS name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:City)-[:CONNECTED_TO]-(:City) AS {
                UNWIND [
                    {left_id: 1, right_id: 2}
                ] AS record
                RETURN record.left_id AS left_id, record.right_id AS right_id
            }
            """
        ).run()
        match = Runner(
            """
            MATCH p=(:City)-[:CONNECTED_TO]-(:City)
            RETURN nodes(p) AS cities
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 1
        assert len(results[0]["cities"]) == 2
        assert results[0]["cities"][0]["id"] == 1
        assert results[0]["cities"][0]["name"] == "New York"
        assert results[0]["cities"][1]["id"] == 2
        assert results[0]["cities"][1]["name"] == "Boston"

    @pytest.mark.asyncio
    async def test_relationships_function(self):
        """Test relationships function with a graph path."""
        await Runner(
            """
            CREATE VIRTUAL (:City) AS {
                UNWIND [
                    {id: 1, name: 'New York'},
                    {id: 2, name: 'Boston'}
                ] AS record
                RETURN record.id AS id, record.name AS name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:City)-[:CONNECTED_TO]-(:City) AS {
                UNWIND [
                    {left_id: 1, right_id: 2, distance: 190}
                ] AS record
                RETURN record.left_id AS left_id, record.right_id AS right_id, record.distance AS distance
            }
            """
        ).run()
        match = Runner(
            """
            MATCH p=(:City)-[:CONNECTED_TO]-(:City)
            RETURN relationships(p) AS rels
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 1
        assert len(results[0]["rels"]) == 1
        assert results[0]["rels"][0]["type"] == "CONNECTED_TO"
        assert results[0]["rels"][0]["properties"]["distance"] == 190

    @pytest.mark.asyncio
    async def test_nodes_function_with_null(self):
        """Test nodes function with null."""
        runner = Runner("RETURN nodes(null) as n")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"n": []}

    @pytest.mark.asyncio
    async def test_relationships_function_with_null(self):
        """Test relationships function with null."""
        runner = Runner("RETURN relationships(null) as r")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"r": []}

    @pytest.mark.asyncio
    async def test_type_function(self):
        """Test type function."""
        runner = Runner(
            """
            RETURN type(123) as type1,
                   type("hello") as type2,
                   type([1, 2, 3]) as type3,
                   type({a: 1, b: 2}) as type4,
                   type(null) as type5
            """
        )
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {
            "type1": "number",
            "type2": "string",
            "type3": "array",
            "type4": "object",
            "type5": "null",
        }

    @pytest.mark.asyncio
    async def test_equality_comparison(self):
        """Test equality comparison."""
        runner = Runner(
            """
            unwind range(1,10) as i
            return i=5 as `isEqual`, i<>5 as `isNotEqual`
            """
        )
        await runner.run()
        results = runner.results
        assert len(results) == 10
        for index, result in enumerate(results):
            if index + 1 == 5:
                assert result == {"isEqual": 1, "isNotEqual": 0}
            else:
                assert result == {"isEqual": 0, "isNotEqual": 1}

    @pytest.mark.asyncio
    async def test_create_node_operation(self):
        """Test create node operation."""
        runner = Runner(
            """
            CREATE VIRTUAL (:TestPerson) AS {
                with 1 as x
                RETURN x
            }
            """
        )
        await runner.run()
        results = runner.results
        assert len(results) == 0

    @pytest.mark.asyncio
    async def test_create_node_and_match_operations(self):
        """Test create node and match operations."""
        create = Runner(
            """
            CREATE VIRTUAL (:MatchPerson) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        )
        await create.run()
        match = Runner("MATCH (n:MatchPerson) RETURN n")
        await match.run()
        results = match.results
        assert len(results) == 2
        assert results[0]["n"] is not None
        assert results[0]["n"]["id"] == 1
        assert results[0]["n"]["name"] == "Person 1"
        assert results[1]["n"] is not None
        assert results[1]["n"]["id"] == 2
        assert results[1]["n"]["name"] == "Person 2"

    @pytest.mark.asyncio
    async def test_complex_match_operation(self):
        """Test complex match operation."""
        await Runner(
            """
            CREATE VIRTUAL (:AgePerson) AS {
                unwind [
                    {id: 1, name: 'Person 1', age: 30},
                    {id: 2, name: 'Person 2', age: 25},
                    {id: 3, name: 'Person 3', age: 35}
                ] as record
                RETURN record.id as id, record.name as name, record.age as age
            }
            """
        ).run()
        match = Runner(
            """
            MATCH (n:AgePerson)
            WHERE n.age > 29
            RETURN n.name AS name, n.age AS age
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 2
        assert results[0] == {"name": "Person 1", "age": 30}
        assert results[1] == {"name": "Person 3", "age": 35}

    @pytest.mark.asyncio
    async def test_match(self):
        """Test match operation."""
        await Runner(
            """
            CREATE VIRTUAL (:SimplePerson) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        match = Runner(
            """
            MATCH (n:SimplePerson)
            RETURN n.name AS name
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 2
        assert results[0] == {"name": "Person 1"}
        assert results[1] == {"name": "Person 2"}

    @pytest.mark.asyncio
    async def test_match_with_nested_join(self):
        """Test match with nested join."""
        await Runner(
            """
            CREATE VIRTUAL (:JoinPerson) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        match = Runner(
            """
            MATCH (a:JoinPerson), (b:JoinPerson)
            WHERE a.id <> b.id
            RETURN a.name AS name1, b.name AS name2
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 2
        assert results[0] == {"name1": "Person 1", "name2": "Person 2"}
        assert results[1] == {"name1": "Person 2", "name2": "Person 1"}

    @pytest.mark.asyncio
    async def test_match_with_graph_pattern(self):
        """Test match with graph pattern."""
        await Runner(
            """
            CREATE VIRTUAL (:User) AS {
                UNWIND [
                    {id: 1, name: 'User 1', manager_id: null},
                    {id: 2, name: 'User 2', manager_id: 1},
                    {id: 3, name: 'User 3', manager_id: 1},
                    {id: 4, name: 'User 4', manager_id: 2}
                ] AS record
                RETURN record.id AS id, record.name AS name, record.manager_id AS manager_id
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:User)-[:MANAGED_BY]-(:User) AS {
                UNWIND [
                    {id: 1, manager_id: null},
                    {id: 2, manager_id: 1},
                    {id: 3, manager_id: 1},
                    {id: 4, manager_id: 2}
                ] AS record
                RETURN record.id AS left_id, record.manager_id AS right_id
            }
            """
        ).run()
        match = Runner(
            """
            MATCH (user:User)-[r:MANAGED_BY]-(manager:User)
            RETURN user.name AS user, manager.name AS manager
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 3
        assert results[0] == {"user": "User 2", "manager": "User 1"}
        assert results[1] == {"user": "User 3", "manager": "User 1"}
        assert results[2] == {"user": "User 4", "manager": "User 2"}

    @pytest.mark.asyncio
    async def test_match_with_multiple_hop_graph_pattern(self):
        """Test match with multiple hop graph pattern."""
        await Runner(
            """
            CREATE VIRTUAL (:HopPerson) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'},
                    {id: 3, name: 'Person 3'},
                    {id: 4, name: 'Person 4'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:HopPerson)-[:KNOWS]-(:HopPerson) AS {
                unwind [
                    {left_id: 1, right_id: 2},
                    {left_id: 2, right_id: 3}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
            """
        ).run()
        match = Runner(
            """
            MATCH (a:HopPerson)-[:KNOWS*]-(c:HopPerson)
            RETURN a.name AS name1, c.name AS name2
            """
        )
        await match.run()
        results = match.results
        # With * meaning 0+ hops, each person also matches itself (zero-hop)
        # Person 1→1, 1→2, 1→3, Person 2→2, 2→3, Person 3→3 + bidirectional = 7
        assert len(results) == 7

    @pytest.mark.asyncio
    async def test_match_with_double_graph_pattern(self):
        """Test match with double graph pattern."""
        await Runner(
            """
            CREATE VIRTUAL (:DoublePerson) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'},
                    {id: 3, name: 'Person 3'},
                    {id: 4, name: 'Person 4'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:DoublePerson)-[:KNOWS]-(:DoublePerson) AS {
                unwind [
                    {left_id: 1, right_id: 2},
                    {left_id: 2, right_id: 3},
                    {left_id: 3, right_id: 4}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
            """
        ).run()
        match = Runner(
            """
            MATCH (a:DoublePerson)-[:KNOWS]-(b:DoublePerson)-[:KNOWS]-(c:DoublePerson)
            RETURN a.name AS name1, b.name AS name2, c.name AS name3
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 2
        assert results[0] == {"name1": "Person 1", "name2": "Person 2", "name3": "Person 3"}
        assert results[1] == {"name1": "Person 2", "name2": "Person 3", "name3": "Person 4"}

    @pytest.mark.asyncio
    async def test_match_with_referenced_to_previous_variable(self):
        """Test match with referenced to previous variable."""
        await Runner(
            """
            CREATE VIRTUAL (:RefPerson) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'},
                    {id: 3, name: 'Person 3'},
                    {id: 4, name: 'Person 4'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:RefPerson)-[:KNOWS]-(:RefPerson) AS {
                unwind [
                    {left_id: 1, right_id: 2},
                    {left_id: 2, right_id: 3},
                    {left_id: 3, right_id: 4}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
            """
        ).run()
        match = Runner(
            """
            MATCH (a:RefPerson)-[:KNOWS]-(b:RefPerson)
            MATCH (b)-[:KNOWS]-(c:RefPerson)
            RETURN a.name AS name1, b.name AS name2, c.name AS name3
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 2
        assert results[0] == {"name1": "Person 1", "name2": "Person 2", "name3": "Person 3"}
        assert results[1] == {"name1": "Person 2", "name2": "Person 3", "name3": "Person 4"}

    @pytest.mark.asyncio
    async def test_match_with_aggregated_with_and_subsequent_match(self):
        """Test match with aggregated WITH followed by another match using the same node reference."""
        await Runner(
            """
            CREATE VIRTUAL (:AggUser) AS {
                unwind [
                    {id: 1, name: 'Alice'},
                    {id: 2, name: 'Bob'},
                    {id: 3, name: 'Carol'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:AggUser)-[:KNOWS]-(:AggUser) AS {
                unwind [
                    {left_id: 1, right_id: 2},
                    {left_id: 1, right_id: 3}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:AggProject) AS {
                unwind [
                    {id: 1, name: 'Project A'},
                    {id: 2, name: 'Project B'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:AggUser)-[:WORKS_ON]-(:AggProject) AS {
                unwind [
                    {left_id: 1, right_id: 1},
                    {left_id: 1, right_id: 2}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
            """
        ).run()
        match = Runner(
            """
            MATCH (u:AggUser)-[:KNOWS]->(s:AggUser)
            WITH u, count(s) as acquaintances
            MATCH (u)-[:WORKS_ON]->(p:AggProject)
            RETURN u.name as name, acquaintances, collect(p.name) as projects
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 1
        assert results[0] == {
            "name": "Alice",
            "acquaintances": 2,
            "projects": ["Project A", "Project B"],
        }

    @pytest.mark.asyncio
    async def test_match_and_return_full_node(self):
        """Test match and return full node."""
        await Runner(
            """
            CREATE VIRTUAL (:FullPerson) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        match = Runner(
            """
            MATCH (n:FullPerson)
            RETURN n
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 2
        assert results[0]["n"] is not None
        assert results[0]["n"]["id"] == 1
        assert results[0]["n"]["name"] == "Person 1"
        assert results[1]["n"] is not None
        assert results[1]["n"]["id"] == 2
        assert results[1]["n"]["name"] == "Person 2"

    @pytest.mark.asyncio
    async def test_call_operation_with_async_function(self):
        """Test call operation with async function."""
        runner = Runner("CALL calltestfunction() YIELD result RETURN result")
        await runner.run()
        results = runner.results
        assert len(results) == 3
        assert results[0] == {"result": 1}
        assert results[1] == {"result": 2}
        assert results[2] == {"result": 3}

    @pytest.mark.asyncio
    async def test_call_operation_with_aggregation(self):
        """Test call operation with aggregation."""
        runner = Runner("CALL calltestfunction() YIELD result RETURN sum(result) as total")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"total": 6}

    @pytest.mark.asyncio
    async def test_call_operation_as_last_operation(self):
        """Test call operation as last operation."""
        runner = Runner("CALL calltestfunction()")
        await runner.run()
        results = runner.results
        assert len(results) == 3
        assert results[0] == {"result": 1, "dummy": "a"}
        assert results[1] == {"result": 2, "dummy": "b"}
        assert results[2] == {"result": 3, "dummy": "c"}

    @pytest.mark.asyncio
    async def test_call_operation_as_last_operation_with_yield(self):
        """Test call operation as last operation with yield."""
        runner = Runner("CALL calltestfunction() YIELD result")
        await runner.run()
        results = runner.results
        assert len(results) == 3
        assert results[0] == {"result": 1}
        assert results[1] == {"result": 2}
        assert results[2] == {"result": 3}

    def test_call_operation_with_no_yielded_expressions(self):
        """Test call operation with no yielded expressions throws error."""
        with pytest.raises(ValueError, match="CALL operations must have a YIELD clause"):
            Runner("CALL calltestfunctionnoobject() RETURN 1")

    @pytest.mark.asyncio
    async def test_return_graph_pattern(self):
        """Test return graph pattern."""
        await Runner(
            """
            CREATE VIRTUAL (:PatternPerson) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:PatternPerson)-[:KNOWS]-(:PatternPerson) AS {
                unwind [
                    {left_id: 1, since: '2020-01-01', right_id: 2}
                ] as record
                RETURN record.left_id as left_id, record.since as since, record.right_id as right_id
            }
            """
        ).run()
        match = Runner(
            """
            MATCH p=(:PatternPerson)-[:KNOWS]-(:PatternPerson)
            RETURN p AS pattern
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 1
        assert results[0]["pattern"] is not None
        assert len(results[0]["pattern"]) == 3

    @pytest.mark.asyncio
    async def test_circular_graph_pattern(self):
        """Test circular graph pattern."""
        await Runner(
            """
            CREATE VIRTUAL (:CircularPerson) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:CircularPerson)-[:KNOWS]-(:CircularPerson) AS {
                unwind [
                    {left_id: 1, right_id: 2},
                    {left_id: 2, right_id: 1}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
            """
        ).run()
        match = Runner(
            """
            MATCH p=(:CircularPerson)-[:KNOWS]-(:CircularPerson)-[:KNOWS]-(:CircularPerson)
            RETURN p AS pattern
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 2

    @pytest.mark.asyncio
    async def test_circular_graph_pattern_with_variable_length_should_not_revisit_nodes(self):
        """Test circular graph pattern with variable length should not revisit nodes."""
        await Runner(
            """
            CREATE VIRTUAL (:CircularVarPerson) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:CircularVarPerson)-[:KNOWS]-(:CircularVarPerson) AS {
                unwind [
                    {left_id: 1, right_id: 2},
                    {left_id: 2, right_id: 1}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
            """
        ).run()
        match = Runner(
            """
            MATCH p=(:CircularVarPerson)-[:KNOWS*]-(:CircularVarPerson)
            RETURN p AS pattern
            """
        )
        await match.run()
        results = match.results
        # Circular graph 1↔2: cycles are skipped, only acyclic paths are returned
        assert len(results) == 6

    @pytest.mark.asyncio
    async def test_multi_hop_match_with_min_hops_constraint_1(self):
        """Test multi-hop match with min hops constraint *1.."""
        await Runner(
            """
            CREATE VIRTUAL (:MinHop1Person) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'},
                    {id: 3, name: 'Person 3'},
                    {id: 4, name: 'Person 4'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:MinHop1Person)-[:KNOWS]-(:MinHop1Person) AS {
                unwind [
                    {left_id: 1, right_id: 2},
                    {left_id: 2, right_id: 3},
                    {left_id: 3, right_id: 4}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
            """
        ).run()
        match = Runner(
            """
            MATCH (a:MinHop1Person)-[:KNOWS*1..]->(b:MinHop1Person)
            RETURN a.name AS name1, b.name AS name2
            """
        )
        await match.run()
        results = match.results
        # *1.. means at least 1 hop, so no zero-hop (self) matches
        # Person 1: 1-hop to P2, 2-hop to P3, 3-hop to P4
        # Person 2: 1-hop to P3, 2-hop to P4
        # Person 3: 1-hop to P4
        # Person 4: no outgoing edges
        assert len(results) == 6
        assert results[0] == {"name1": "Person 1", "name2": "Person 2"}
        assert results[1] == {"name1": "Person 1", "name2": "Person 3"}
        assert results[2] == {"name1": "Person 1", "name2": "Person 4"}
        assert results[3] == {"name1": "Person 2", "name2": "Person 3"}
        assert results[4] == {"name1": "Person 2", "name2": "Person 4"}
        assert results[5] == {"name1": "Person 3", "name2": "Person 4"}

    @pytest.mark.asyncio
    async def test_multi_hop_match_with_min_hops_constraint_2(self):
        """Test multi-hop match with min hops constraint *2.."""
        await Runner(
            """
            CREATE VIRTUAL (:MinHop2Person) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'},
                    {id: 3, name: 'Person 3'},
                    {id: 4, name: 'Person 4'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:MinHop2Person)-[:KNOWS]-(:MinHop2Person) AS {
                unwind [
                    {left_id: 1, right_id: 2},
                    {left_id: 2, right_id: 3},
                    {left_id: 3, right_id: 4}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
            """
        ).run()
        match = Runner(
            """
            MATCH (a:MinHop2Person)-[:KNOWS*2..]->(b:MinHop2Person)
            RETURN a.name AS name1, b.name AS name2
            """
        )
        await match.run()
        results = match.results
        # *2.. means at least 2 hops
        # Person 1: 2-hop to P3, 3-hop to P4
        # Person 2: 2-hop to P4
        assert len(results) == 3
        assert results[0] == {"name1": "Person 1", "name2": "Person 3"}
        assert results[1] == {"name1": "Person 1", "name2": "Person 4"}
        assert results[2] == {"name1": "Person 2", "name2": "Person 4"}

    @pytest.mark.asyncio
    async def test_multi_hop_match_with_variable_length_relationships(self):
        """Test multi-hop match with variable length relationships."""
        await Runner(
            """
            CREATE VIRTUAL (:MultiHopPerson) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'},
                    {id: 3, name: 'Person 3'},
                    {id: 4, name: 'Person 4'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:MultiHopPerson)-[:KNOWS]-(:MultiHopPerson) AS {
                unwind [
                    {left_id: 1, right_id: 2},
                    {left_id: 2, right_id: 3},
                    {left_id: 3, right_id: 4}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
            """
        ).run()
        match = Runner(
            """
            MATCH (a:MultiHopPerson)-[r:KNOWS*0..3]->(b:MultiHopPerson)
            RETURN a, r, b
            """
        )
        await match.run()
        results = match.results
        # With *0..3: Person 1 has 4 matches (0,1,2,3 hops), Person 2 has 3, Person 3 has 2, Person 4 has 1 = 10 total
        assert len(results) == 10

    @pytest.mark.asyncio
    async def test_return_match_pattern_with_variable_length_relationships(self):
        """Test return match pattern with variable length relationships."""
        await Runner(
            """
            CREATE VIRTUAL (:VarLenPerson) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'},
                    {id: 3, name: 'Person 3'},
                    {id: 4, name: 'Person 4'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:VarLenPerson)-[:KNOWS]-(:VarLenPerson) AS {
                unwind [
                    {left_id: 1, right_id: 2},
                    {left_id: 2, right_id: 3},
                    {left_id: 3, right_id: 4}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
            """
        ).run()
        match = Runner(
            """
            MATCH p=(a:VarLenPerson)-[:KNOWS*0..3]->(b:VarLenPerson)
            RETURN p AS pattern
            """
        )
        await match.run()
        results = match.results
        # With *0..3: Person 1 has 4 matches (0,1,2,3 hops), Person 2 has 3, Person 3 has 2, Person 4 has 1 = 10 total
        assert len(results) == 10

    @pytest.mark.asyncio
    async def test_statement_with_graph_pattern_in_where_clause(self):
        """Test statement with graph pattern in where clause."""
        await Runner(
            """
            CREATE VIRTUAL (:WherePerson) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'},
                    {id: 3, name: 'Person 3'},
                    {id: 4, name: 'Person 4'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:WherePerson)-[:KNOWS]-(:WherePerson) AS {
                unwind [
                    {left_id: 1, right_id: 2},
                    {left_id: 2, right_id: 3},
                    {left_id: 3, right_id: 4}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
            """
        ).run()
        match = Runner(
            """
            MATCH (a:WherePerson), (b:WherePerson)
            WHERE (a)-[:KNOWS]->(b)
            RETURN a.name AS name1, b.name AS name2
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 3
        assert results[0] == {"name1": "Person 1", "name2": "Person 2"}
        assert results[1] == {"name1": "Person 2", "name2": "Person 3"}
        assert results[2] == {"name1": "Person 3", "name2": "Person 4"}

        # Test negative match
        nomatch = Runner(
            """
            MATCH (a:WherePerson), (b:WherePerson)
            WHERE (a)-[:KNOWS]->(b) <> true
            RETURN a.name AS name1, b.name AS name2
            """
        )
        await nomatch.run()
        noresults = nomatch.results
        assert len(noresults) == 13
        assert noresults[0] == {"name1": "Person 1", "name2": "Person 1"}
        assert noresults[1] == {"name1": "Person 1", "name2": "Person 3"}
        assert noresults[2] == {"name1": "Person 1", "name2": "Person 4"}
        assert noresults[3] == {"name1": "Person 2", "name2": "Person 1"}
        assert noresults[4] == {"name1": "Person 2", "name2": "Person 2"}
        assert noresults[5] == {"name1": "Person 2", "name2": "Person 4"}
        assert noresults[6] == {"name1": "Person 3", "name2": "Person 1"}
        assert noresults[7] == {"name1": "Person 3", "name2": "Person 2"}
        assert noresults[8] == {"name1": "Person 3", "name2": "Person 3"}
        assert noresults[9] == {"name1": "Person 4", "name2": "Person 1"}
        assert noresults[10] == {"name1": "Person 4", "name2": "Person 2"}
        assert noresults[11] == {"name1": "Person 4", "name2": "Person 3"}
        assert noresults[12] == {"name1": "Person 4", "name2": "Person 4"}

    @pytest.mark.asyncio
    async def test_person_who_does_not_know_anyone(self):
        """Test person who does not know anyone."""
        await Runner(
            """
            CREATE VIRTUAL (:LonePerson) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'},
                    {id: 3, name: 'Person 3'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:LonePerson)-[:KNOWS]-(:LonePerson) AS {
                unwind [
                    {left_id: 1, right_id: 2},
                    {left_id: 2, right_id: 1}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
            """
        ).run()
        match = Runner(
            """
            MATCH (a:LonePerson)
            WHERE NOT (a)-[:KNOWS]->(:LonePerson)
            RETURN a.name AS name
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 1
        assert results[0] == {"name": "Person 3"}

    @pytest.mark.asyncio
    async def test_manager_chain(self):
        """Test manager chain."""
        await Runner(
            """
            CREATE VIRTUAL (:ChainEmployee) AS {
                unwind [
                    {id: 1, name: 'Employee 1'},
                    {id: 2, name: 'Employee 2'},
                    {id: 3, name: 'Employee 3'},
                    {id: 4, name: 'Employee 4'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:ChainEmployee)-[:MANAGED_BY]-(:ChainEmployee) AS {
                unwind [
                    {left_id: 2, right_id: 1},
                    {left_id: 3, right_id: 2},
                    {left_id: 4, right_id: 2}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
            """
        ).run()
        match = Runner(
            """
            MATCH p=(e:ChainEmployee)-[:MANAGED_BY*]->(m:ChainEmployee)
            WHERE NOT (m)-[:MANAGED_BY]->(:ChainEmployee)
            RETURN p
            """
        )
        await match.run()
        results = match.results
        # With * meaning 0+ hops, Employee 1 (CEO) also matches itself (zero-hop)
        # Employee 1→1 (zero-hop), 2→1, 3→2→1, 4→2→1 = 4 results
        assert len(results) == 4

    @pytest.mark.asyncio
    async def test_match_with_leftward_relationship_direction(self):
        """Test match with leftward relationship direction."""
        await Runner(
            """
            CREATE VIRTUAL (:DirPerson) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'},
                    {id: 3, name: 'Person 3'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:DirPerson)-[:REPORTS_TO]-(:DirPerson) AS {
                unwind [
                    {left_id: 2, right_id: 1},
                    {left_id: 3, right_id: 1}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
            """
        ).run()
        # Rightward: left_id -> right_id (2->1, 3->1)
        right_match = Runner(
            """
            MATCH (a:DirPerson)-[:REPORTS_TO]->(b:DirPerson)
            RETURN a.name AS employee, b.name AS manager
            """
        )
        await right_match.run()
        right_results = right_match.results
        assert len(right_results) == 2
        assert right_results[0] == {"employee": "Person 2", "manager": "Person 1"}
        assert right_results[1] == {"employee": "Person 3", "manager": "Person 1"}

        # Leftward: right_id -> left_id (1->2, 1->3) - reverse traversal
        left_match = Runner(
            """
            MATCH (m:DirPerson)<-[:REPORTS_TO]-(e:DirPerson)
            RETURN m.name AS manager, e.name AS employee
            """
        )
        await left_match.run()
        left_results = left_match.results
        assert len(left_results) == 2
        assert left_results[0] == {"manager": "Person 1", "employee": "Person 2"}
        assert left_results[1] == {"manager": "Person 1", "employee": "Person 3"}

    @pytest.mark.asyncio
    async def test_match_with_leftward_direction_swapped_data(self):
        """Test match with leftward direction produces same results as rightward with swapped data."""
        await Runner(
            """
            CREATE VIRTUAL (:DirCity) AS {
                unwind [
                    {id: 1, name: 'New York'},
                    {id: 2, name: 'Boston'},
                    {id: 3, name: 'Chicago'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:DirCity)-[:ROUTE]-(:DirCity) AS {
                unwind [
                    {left_id: 1, right_id: 2},
                    {left_id: 1, right_id: 3}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
            """
        ).run()
        # Leftward from destination: find where right_id matches, follow left_id
        match = Runner(
            """
            MATCH (dest:DirCity)<-[:ROUTE]-(origin:DirCity)
            RETURN dest.name AS destination, origin.name AS origin
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 2
        assert results[0] == {"destination": "Boston", "origin": "New York"}
        assert results[1] == {"destination": "Chicago", "origin": "New York"}

    @pytest.mark.asyncio
    async def test_match_with_leftward_variable_length(self):
        """Test match with leftward variable-length relationships."""
        await Runner(
            """
            CREATE VIRTUAL (:DirVarPerson) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'},
                    {id: 3, name: 'Person 3'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:DirVarPerson)-[:MANAGES]-(:DirVarPerson) AS {
                unwind [
                    {left_id: 1, right_id: 2},
                    {left_id: 2, right_id: 3}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
            """
        ).run()
        # Leftward variable-length: traverse from right_id to left_id
        match = Runner(
            """
            MATCH (a:DirVarPerson)<-[:MANAGES*]-(b:DirVarPerson)
            RETURN a.name AS name1, b.name AS name2
            """
        )
        await match.run()
        results = match.results
        # Leftward indexes on right_id. find(id) looks up right_id=id, follows left_id.
        # Person 1: zero-hop only (no right_id=1)
        # Person 2: zero-hop, then left_id=1 (1 hop)
        # Person 3: zero-hop, then left_id=2 (1 hop), then left_id=1 (2 hops)
        assert len(results) == 6
        assert results[0] == {"name1": "Person 1", "name2": "Person 1"}
        assert results[1] == {"name1": "Person 2", "name2": "Person 2"}
        assert results[2] == {"name1": "Person 2", "name2": "Person 1"}
        assert results[3] == {"name1": "Person 3", "name2": "Person 3"}
        assert results[4] == {"name1": "Person 3", "name2": "Person 2"}
        assert results[5] == {"name1": "Person 3", "name2": "Person 1"}

    @pytest.mark.asyncio
    async def test_match_with_leftward_double_graph_pattern(self):
        """Test match with leftward double graph pattern."""
        await Runner(
            """
            CREATE VIRTUAL (:DirDoublePerson) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'},
                    {id: 3, name: 'Person 3'},
                    {id: 4, name: 'Person 4'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:DirDoublePerson)-[:KNOWS]-(:DirDoublePerson) AS {
                unwind [
                    {left_id: 1, right_id: 2},
                    {left_id: 2, right_id: 3},
                    {left_id: 3, right_id: 4}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
            """
        ).run()
        # Leftward chain: (c)<-[:KNOWS]-(b)<-[:KNOWS]-(a)
        match = Runner(
            """
            MATCH (c:DirDoublePerson)<-[:KNOWS]-(b:DirDoublePerson)<-[:KNOWS]-(a:DirDoublePerson)
            RETURN a.name AS name1, b.name AS name2, c.name AS name3
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 2
        assert results[0] == {"name1": "Person 1", "name2": "Person 2", "name3": "Person 3"}
        assert results[1] == {"name1": "Person 2", "name2": "Person 3", "name3": "Person 4"}

    @pytest.mark.asyncio
    async def test_match_with_constraints(self):
        await Runner(
            """
            CREATE VIRTUAL (:ConstraintEmployee) AS {
                unwind [
                    {id: 1, name: 'Employee 1'},
                    {id: 2, name: 'Employee 2'},
                    {id: 3, name: 'Employee 3'},
                    {id: 4, name: 'Employee 4'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        match = Runner(
            """
            match (e:ConstraintEmployee{name:'Employee 1'})
            return e.name as name
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 1
        assert results[0]["name"] == "Employee 1"

    @pytest.mark.asyncio
    async def test_optional_match_with_no_matching_relationship(self):
        """Test optional match with no matching relationship returns null."""
        await Runner(
            """
            CREATE VIRTUAL (:OptPerson) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'},
                    {id: 3, name: 'Person 3'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:OptPerson)-[:KNOWS]-(:OptPerson) AS {
                unwind [
                    {left_id: 1, right_id: 2}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
            """
        ).run()
        # Person 3 has no KNOWS relationship, so OPTIONAL MATCH should return null for friend
        match = Runner(
            """
            MATCH (a:OptPerson)
            OPTIONAL MATCH (a)-[:KNOWS]->(b:OptPerson)
            RETURN a.name AS name, b AS friend
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 3
        assert results[0]["name"] == "Person 1"
        assert results[0]["friend"] is not None
        assert results[0]["friend"]["name"] == "Person 2"
        assert results[1]["name"] == "Person 2"
        assert results[1]["friend"] is None
        assert results[2]["name"] == "Person 3"
        assert results[2]["friend"] is None

    @pytest.mark.asyncio
    async def test_optional_match_property_access_on_null_node_returns_null(self):
        """Test that accessing a property on a null node from optional match returns null."""
        await Runner(
            """
            CREATE VIRTUAL (:OptPropPerson) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'},
                    {id: 3, name: 'Person 3'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:OptPropPerson)-[:KNOWS]-(:OptPropPerson) AS {
                unwind [
                    {left_id: 1, right_id: 2}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
            """
        ).run()
        # When accessing b.name and b is null (no match), should return null
        match = Runner(
            """
            MATCH (a:OptPropPerson)
            OPTIONAL MATCH (a)-[:KNOWS]->(b:OptPropPerson)
            RETURN a.name AS name, b.name AS friend_name
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 3
        assert results[0] == {"name": "Person 1", "friend_name": "Person 2"}
        assert results[1] == {"name": "Person 2", "friend_name": None}
        assert results[2] == {"name": "Person 3", "friend_name": None}

    @pytest.mark.asyncio
    async def test_optional_match_where_all_nodes_match(self):
        """Test optional match where all nodes have matching relationships."""
        await Runner(
            """
            CREATE VIRTUAL (:OptAllPerson) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:OptAllPerson)-[:KNOWS]-(:OptAllPerson) AS {
                unwind [
                    {left_id: 1, right_id: 2},
                    {left_id: 2, right_id: 1}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
            """
        ).run()
        # All persons have KNOWS relationships, so no null values
        match = Runner(
            """
            MATCH (a:OptAllPerson)
            OPTIONAL MATCH (a)-[:KNOWS]->(b:OptAllPerson)
            RETURN a.name AS name, b AS friend
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 2
        assert results[0]["name"] == "Person 1"
        assert results[0]["friend"]["name"] == "Person 2"
        assert results[1]["name"] == "Person 2"
        assert results[1]["friend"]["name"] == "Person 1"

    @pytest.mark.asyncio
    async def test_optional_match_with_no_data_returns_nulls(self):
        """Test optional match with no matching data returns nulls."""
        await Runner(
            """
            CREATE VIRTUAL (:OptNullPerson) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:OptNullPerson)-[:KNOWS]-(:OptNullPerson) AS {
                unwind [] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
            """
        ).run()
        # KNOWS relationship type exists but has no data
        match = Runner(
            """
            MATCH (a:OptNullPerson)
            OPTIONAL MATCH (a)-[:KNOWS]->(b:OptNullPerson)
            RETURN a.name AS name, b AS friend
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 2
        assert results[0]["name"] == "Person 1"
        assert results[0]["friend"] is None
        assert results[1]["name"] == "Person 2"
        assert results[1]["friend"] is None

    @pytest.mark.asyncio
    async def test_optional_match_with_aggregation(self):
        """Test optional match with aggregation (collect friends)."""
        await Runner(
            """
            CREATE VIRTUAL (:OptAggPerson) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'},
                    {id: 3, name: 'Person 3'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:OptAggPerson)-[:KNOWS]-(:OptAggPerson) AS {
                unwind [
                    {left_id: 1, right_id: 2},
                    {left_id: 1, right_id: 3}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
            """
        ).run()
        # Collect friends per person; Person 2 and 3 have no friends
        match = Runner(
            """
            MATCH (a:OptAggPerson)
            OPTIONAL MATCH (a)-[:KNOWS]->(b:OptAggPerson)
            RETURN a.name AS name, collect(b) AS friends
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 3
        assert results[0]["name"] == "Person 1"
        assert len(results[0]["friends"]) == 2
        assert results[1]["name"] == "Person 2"
        assert len(results[1]["friends"]) == 1  # null is collected
        assert results[2]["name"] == "Person 3"
        assert len(results[2]["friends"]) == 1  # null is collected

    @pytest.mark.asyncio
    async def test_standalone_optional_match_returns_data(self):
        """Test standalone optional match returns data when label exists."""
        await Runner(
            """
            CREATE VIRTUAL (:OptStandalonePerson) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:OptStandalonePerson)-[:KNOWS]-(:OptStandalonePerson) AS {
                unwind [
                    {left_id: 1, right_id: 2}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
            """
        ).run()
        # Standalone OPTIONAL MATCH with relationship where only Person 1 has a match
        match = Runner(
            """
            OPTIONAL MATCH (a:OptStandalonePerson)-[:KNOWS]->(b:OptStandalonePerson)
            RETURN a.name AS name, b.name AS friend
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 1
        assert results[0] == {"name": "Person 1", "friend": "Person 2"}

    @pytest.mark.asyncio
    async def test_optional_match_returns_full_node_when_matched(self):
        """Test optional match on existing label returns actual nodes."""
        await Runner(
            """
            CREATE VIRTUAL (:OptFullPerson) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'}
                ] as record
                RETURN record.id as id, record.name as name
            }
            """
        ).run()
        # OPTIONAL MATCH on existing label returns actual nodes
        match = Runner(
            """
            OPTIONAL MATCH (n:OptFullPerson)
            RETURN n.name AS name
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 2
        assert results[0] == {"name": "Person 1"}
        assert results[1] == {"name": "Person 2"}

    @pytest.mark.asyncio
    async def test_schema_returns_nodes_and_relationships_with_sample_data(self):
        """Test schema() returns nodes and relationships with sample data."""
        await Runner(
            """
            CREATE VIRTUAL (:Animal) AS {
                UNWIND [
                    {id: 1, species: 'Cat', legs: 4},
                    {id: 2, species: 'Dog', legs: 4}
                ] AS record
                RETURN record.id AS id, record.species AS species, record.legs AS legs
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:Animal)-[:CHASES]-(:Animal) AS {
                UNWIND [
                    {left_id: 2, right_id: 1, speed: 'fast'}
                ] AS record
                RETURN record.left_id AS left_id, record.right_id AS right_id, record.speed AS speed
            }
            """
        ).run()

        runner = Runner(
            "CALL schema() YIELD kind, label, type, from_label, to_label, properties, sample RETURN kind, label, type, from_label, to_label, properties, sample"
        )
        await runner.run()
        results = runner.results

        animal = next((r for r in results if r.get("kind") == "Node" and r.get("label") == "Animal"), None)
        assert animal is not None
        assert animal["properties"] == ["species", "legs"]
        assert animal["sample"] is not None
        assert "id" not in animal["sample"]
        assert "species" in animal["sample"]
        assert "legs" in animal["sample"]

        chases = next((r for r in results if r.get("kind") == "Relationship" and r.get("type") == "CHASES"), None)
        assert chases is not None
        assert chases["from_label"] == "Animal"
        assert chases["to_label"] == "Animal"
        assert chases["properties"] == ["speed"]
        assert chases["sample"] is not None
        assert "left_id" not in chases["sample"]
        assert "right_id" not in chases["sample"]
        assert "speed" in chases["sample"]

    @pytest.mark.asyncio
    async def test_reserved_keywords_as_identifiers(self):
        """Test reserved keywords as identifiers."""
        runner = Runner("""
            WITH 1 AS return
            RETURN return
        """)
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0]["return"] == 1

    @pytest.mark.asyncio
    async def test_reserved_keywords_as_parts_of_identifiers(self):
        """Test reserved keywords as parts of identifiers."""
        runner = Runner("""
            unwind [
                {from: "Alice", to: "Bob", organizer: "Charlie"},
                {from: "Bob", to: "Charlie", organizer: "Alice"},
                {from: "Charlie", to: "Alice", organizer: "Bob"}
            ] as data
            return data.from as from, data.to as to, data.organizer as organizer
        """)
        await runner.run()
        results = runner.results
        assert len(results) == 3
        assert results[0] == {"from": "Alice", "to": "Bob", "organizer": "Charlie"}
        assert results[1] == {"from": "Bob", "to": "Charlie", "organizer": "Alice"}
        assert results[2] == {"from": "Charlie", "to": "Alice", "organizer": "Bob"}

    @pytest.mark.asyncio
    async def test_reserved_keywords_as_relationship_types_and_labels(self):
        """Test reserved keywords as relationship types and labels."""
        await Runner("""
            CREATE VIRTUAL (:Return) AS {
                unwind [
                    {id: 1, name: 'Node 1'},
                    {id: 2, name: 'Node 2'}
                ] as record
                RETURN record.id as id, record.name as name
            }
        """).run()
        await Runner("""
            CREATE VIRTUAL (:Return)-[:With]-(:Return) AS {
                unwind [
                    {left_id: 1, right_id: 2}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
        """).run()
        runner = Runner("""
            MATCH (a:Return)-[:With]->(b:Return)
            RETURN a.name AS name1, b.name AS name2
        """)
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"name1": "Node 1", "name2": "Node 2"}

    @pytest.mark.asyncio
    async def test_match_with_node_reference_passed_through_with(self):
        """Test that node variables passed through WITH can be re-referenced in subsequent MATCH."""
        await Runner("""
            CREATE VIRTUAL (:WithRefUser) AS {
                UNWIND [
                    {id: 1, name: 'Alice', mail: 'alice@test.com', jobTitle: 'CEO'},
                    {id: 2, name: 'Bob', mail: 'bob@test.com', jobTitle: 'VP'},
                    {id: 3, name: 'Carol', mail: 'carol@test.com', jobTitle: 'VP'},
                    {id: 4, name: 'Dave', mail: 'dave@test.com', jobTitle: 'Engineer'}
                ] AS record
                RETURN record.id AS id, record.name AS name, record.mail AS mail, record.jobTitle AS jobTitle
            }
        """).run()
        await Runner("""
            CREATE VIRTUAL (:WithRefUser)-[:MANAGES]-(:WithRefUser) AS {
                UNWIND [
                    {left_id: 1, right_id: 2},
                    {left_id: 1, right_id: 3},
                    {left_id: 2, right_id: 4}
                ] AS record
                RETURN record.left_id AS left_id, record.right_id AS right_id
            }
        """).run()
        runner = Runner("""
            MATCH (ceo:WithRefUser)-[:MANAGES]->(dr1:WithRefUser)
            WHERE ceo.jobTitle = 'CEO'
            WITH ceo, dr1
            MATCH (ceo)-[:MANAGES]->(dr2:WithRefUser)
            WHERE dr1.mail <> dr2.mail
            RETURN ceo.name AS ceo, dr1.name AS dr1, dr2.name AS dr2
        """)
        await runner.run()
        results = runner.results
        # CEO (Alice) manages Bob and Carol. All distinct pairs:
        # (Alice, Bob, Carol) and (Alice, Carol, Bob)
        assert len(results) == 2
        assert results[0] == {"ceo": "Alice", "dr1": "Bob", "dr2": "Carol"}
        assert results[1] == {"ceo": "Alice", "dr1": "Carol", "dr2": "Bob"}

    async def test_match_with_node_reference_reuse_with_label(self):
        """Test that reusing a node variable with a label creates a NodeReference, not a new node."""
        await Runner("""
            CREATE VIRTUAL (:RefLabelUser) AS {
                UNWIND [
                    {id: 1, name: 'Alice', jobTitle: 'CEO'},
                    {id: 2, name: 'Bob', jobTitle: 'VP'},
                    {id: 3, name: 'Carol', jobTitle: 'VP'},
                    {id: 4, name: 'Dave', jobTitle: 'Engineer'}
                ] AS record
                RETURN record.id AS id, record.name AS name, record.jobTitle AS jobTitle
            }
        """).run()
        await Runner("""
            CREATE VIRTUAL (:RefLabelUser)-[:MANAGES]-(:RefLabelUser) AS {
                UNWIND [
                    {left_id: 1, right_id: 2},
                    {left_id: 1, right_id: 3},
                    {left_id: 2, right_id: 4}
                ] AS record
                RETURN record.left_id AS left_id, record.right_id AS right_id
            }
        """).run()
        # Uses (ceo:RefLabelUser) with label in both MATCH clauses.
        # Previously this would create a new node instead of a NodeReference.
        runner = Runner("""
            MATCH (ceo:RefLabelUser)-[:MANAGES]->(dr1:RefLabelUser)
            WHERE ceo.jobTitle = 'CEO'
            WITH ceo, dr1
            MATCH (ceo:RefLabelUser)-[:MANAGES]->(dr2:RefLabelUser)
            WHERE dr1.name <> dr2.name
            RETURN ceo.name AS ceo, dr1.name AS dr1, dr2.name AS dr2
        """)
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert results[0] == {"ceo": "Alice", "dr1": "Bob", "dr2": "Carol"}
        assert results[1] == {"ceo": "Alice", "dr1": "Carol", "dr2": "Bob"}

    @pytest.mark.asyncio
    async def test_where_with_is_null(self):
        """Test WHERE with IS NULL."""
        runner = Runner("""
            unwind [{name: 'Alice', age: 30}, {name: 'Bob', age: null}] as person
            with person.name as name, person.age as age
            where age IS NULL
            return name
        """)
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"name": "Bob"}

    @pytest.mark.asyncio
    async def test_where_with_is_not_null(self):
        """Test WHERE with IS NOT NULL."""
        runner = Runner("""
            unwind [{name: 'Alice', age: 30}, {name: 'Bob', age: null}] as person
            with person.name as name, person.age as age
            where age IS NOT NULL
            return name, age
        """)
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"name": "Alice", "age": 30}

    @pytest.mark.asyncio
    async def test_where_with_is_not_null_multiple_results(self):
        """Test WHERE with IS NOT NULL filters multiple results."""
        runner = Runner("""
            unwind [{name: 'Alice', age: 30}, {name: 'Bob', age: null}, {name: 'Carol', age: 25}] as person
            with person.name as name, person.age as age
            where age IS NOT NULL
            return name, age
        """)
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert results[0] == {"name": "Alice", "age": 30}
        assert results[1] == {"name": "Carol", "age": 25}

    @pytest.mark.asyncio
    async def test_where_with_in_list_check(self):
        """Test WHERE with IN list check."""
        runner = Runner("""
            unwind range(1, 10) as n
            with n
            where n IN [2, 4, 6, 8]
            return n
        """)
        await runner.run()
        results = runner.results
        assert len(results) == 4
        assert [r["n"] for r in results] == [2, 4, 6, 8]

    @pytest.mark.asyncio
    async def test_where_with_not_in_list_check(self):
        """Test WHERE with NOT IN list check."""
        runner = Runner("""
            unwind range(1, 5) as n
            with n
            where n NOT IN [2, 4]
            return n
        """)
        await runner.run()
        results = runner.results
        assert len(results) == 3
        assert [r["n"] for r in results] == [1, 3, 5]

    @pytest.mark.asyncio
    async def test_where_with_in_string_list(self):
        """Test WHERE with IN string list."""
        runner = Runner("""
            unwind ['apple', 'banana', 'cherry', 'date'] as fruit
            with fruit
            where fruit IN ['banana', 'date']
            return fruit
        """)
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert [r["fruit"] for r in results] == ["banana", "date"]

    @pytest.mark.asyncio
    async def test_where_with_in_combined_with_and(self):
        """Test WHERE with IN combined with AND."""
        runner = Runner("""
            unwind range(1, 20) as n
            with n
            where n IN [1, 5, 10, 15, 20] AND n > 5
            return n
        """)
        await runner.run()
        results = runner.results
        assert len(results) == 3
        assert [r["n"] for r in results] == [10, 15, 20]

    @pytest.mark.asyncio
    async def test_where_with_and_before_in(self):
        """Test WHERE with AND before IN (IN on right side of AND)."""
        runner = Runner("""
            unwind ['expert', 'intermediate', 'beginner'] as proficiency
            with proficiency where 1=1 and proficiency in ['expert']
            return proficiency
        """)
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"proficiency": "expert"}

    @pytest.mark.asyncio
    async def test_where_with_and_before_not_in(self):
        """Test WHERE with AND before NOT IN."""
        runner = Runner("""
            unwind ['expert', 'intermediate', 'beginner'] as proficiency
            with proficiency where 1=1 and proficiency not in ['expert']
            return proficiency
        """)
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert [r["proficiency"] for r in results] == ["intermediate", "beginner"]

    @pytest.mark.asyncio
    async def test_where_with_or_before_in(self):
        """Test WHERE with OR before IN."""
        runner = Runner("""
            unwind range(1, 10) as n
            with n where 1=0 or n in [3, 7]
            return n
        """)
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert [r["n"] for r in results] == [3, 7]

    @pytest.mark.asyncio
    async def test_in_as_return_expression_with_and_in_where(self):
        """Test IN as return expression with AND in WHERE."""
        runner = Runner("""
            unwind ['expert', 'intermediate', 'beginner'] as proficiency
            with proficiency where 1=1 and proficiency in ['expert']
            return proficiency, proficiency in ['expert'] as isExpert
        """)
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"proficiency": "expert", "isExpert": 1}

    @pytest.mark.asyncio
    async def test_where_with_contains(self):
        """Test WHERE with CONTAINS."""
        runner = Runner("""
            unwind ['apple', 'banana', 'grape', 'pineapple'] as fruit
            with fruit
            where fruit CONTAINS 'apple'
            return fruit
        """)
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert [r["fruit"] for r in results] == ["apple", "pineapple"]

    @pytest.mark.asyncio
    async def test_where_with_not_contains(self):
        """Test WHERE with NOT CONTAINS."""
        runner = Runner("""
            unwind ['apple', 'banana', 'grape', 'pineapple'] as fruit
            with fruit
            where fruit NOT CONTAINS 'apple'
            return fruit
        """)
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert [r["fruit"] for r in results] == ["banana", "grape"]

    @pytest.mark.asyncio
    async def test_where_with_starts_with(self):
        """Test WHERE with STARTS WITH."""
        runner = Runner("""
            unwind ['apple', 'apricot', 'banana', 'avocado'] as fruit
            with fruit
            where fruit STARTS WITH 'ap'
            return fruit
        """)
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert [r["fruit"] for r in results] == ["apple", "apricot"]

    @pytest.mark.asyncio
    async def test_where_with_not_starts_with(self):
        """Test WHERE with NOT STARTS WITH."""
        runner = Runner("""
            unwind ['apple', 'apricot', 'banana', 'avocado'] as fruit
            with fruit
            where fruit NOT STARTS WITH 'ap'
            return fruit
        """)
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert [r["fruit"] for r in results] == ["banana", "avocado"]

    @pytest.mark.asyncio
    async def test_where_with_ends_with(self):
        """Test WHERE with ENDS WITH."""
        runner = Runner("""
            unwind ['apple', 'pineapple', 'banana', 'grape'] as fruit
            with fruit
            where fruit ENDS WITH 'ple'
            return fruit
        """)
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert [r["fruit"] for r in results] == ["apple", "pineapple"]

    @pytest.mark.asyncio
    async def test_where_with_not_ends_with(self):
        """Test WHERE with NOT ENDS WITH."""
        runner = Runner("""
            unwind ['apple', 'pineapple', 'banana', 'grape'] as fruit
            with fruit
            where fruit NOT ENDS WITH 'ple'
            return fruit
        """)
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert [r["fruit"] for r in results] == ["banana", "grape"]

    @pytest.mark.asyncio
    async def test_where_with_contains_combined_with_and(self):
        """Test WHERE with CONTAINS combined with AND."""
        runner = Runner("""
            unwind ['apple', 'pineapple', 'applesauce', 'banana'] as fruit
            with fruit
            where fruit CONTAINS 'apple' AND fruit STARTS WITH 'pine'
            return fruit
        """)
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0]["fruit"] == "pineapple"

    @pytest.mark.asyncio
    async def test_collected_nodes_and_re_matching(self):
        """Test that collected nodes can be unwound and used as node references in subsequent MATCH."""
        await Runner("""
            CREATE VIRTUAL (:Person) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'},
                    {id: 3, name: 'Person 3'},
                    {id: 4, name: 'Person 4'}
                ] as record
                RETURN record.id as id, record.name as name
            }
        """).run()
        await Runner("""
            CREATE VIRTUAL (:Person)-[:KNOWS]-(:Person) AS {
                unwind [
                    {left_id: 1, right_id: 2},
                    {left_id: 2, right_id: 3},
                    {left_id: 3, right_id: 4}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
        """).run()
        runner = Runner("""
            MATCH (a:Person)-[:KNOWS*0..3]->(b:Person)
            WITH collect(a) AS persons, b
            UNWIND persons AS p
            match (p)-[:KNOWS]->(:Person)
            return p.name AS name
        """)
        await runner.run()
        results = runner.results
        assert len(results) == 9
        names = [r["name"] for r in results]
        assert "Person 1" in names
        assert "Person 2" in names
        assert "Person 3" in names

    # ============================================================
    # Add operator tests
    # ============================================================

    @pytest.mark.asyncio
    async def test_collected_patterns_and_unwind(self):
        """Test collecting graph patterns and unwinding them."""
        await Runner("""
            CREATE VIRTUAL (:Person) AS {
                unwind [
                    {id: 1, name: 'Person 1'},
                    {id: 2, name: 'Person 2'},
                    {id: 3, name: 'Person 3'},
                    {id: 4, name: 'Person 4'}
                ] as record
                RETURN record.id as id, record.name as name
            }
        """).run()
        await Runner("""
            CREATE VIRTUAL (:Person)-[:KNOWS]-(:Person) AS {
                unwind [
                    {left_id: 1, right_id: 2},
                    {left_id: 2, right_id: 3},
                    {left_id: 3, right_id: 4}
                ] as record
                RETURN record.left_id as left_id, record.right_id as right_id
            }
        """).run()
        runner = Runner("""
            MATCH p=(a:Person)-[:KNOWS*0..3]->(b:Person)
            WITH collect(p) AS patterns
            UNWIND patterns AS pattern
            RETURN pattern
        """)
        await runner.run()
        results = runner.results
        assert len(results) == 10
        # Index 0: Person 1 zero-hop - pattern = [node1] (single node)
        assert len(results[0]["pattern"]) == 1
        assert results[0]["pattern"][0]["id"] == 1
        # Index 1: Person 1 -> Person 2 (1-hop)
        assert len(results[1]["pattern"]) == 3
        # Index 2: Person 1 -> Person 2 -> Person 3 (2-hop)
        assert len(results[2]["pattern"]) == 5
        # Index 3: Person 1 -> Person 2 -> Person 3 -> Person 4 (3-hop)
        assert len(results[3]["pattern"]) == 7
        # Index 4: Person 2 zero-hop
        assert len(results[4]["pattern"]) == 1
        assert results[4]["pattern"][0]["id"] == 2
        # Index 5: Person 2 -> Person 3 (1-hop)
        assert len(results[5]["pattern"]) == 3
        # Index 6: Person 2 -> Person 3 -> Person 4 (2-hop)
        assert len(results[6]["pattern"]) == 5
        # Index 7: Person 3 zero-hop
        assert len(results[7]["pattern"]) == 1
        assert results[7]["pattern"][0]["id"] == 3
        # Index 8: Person 3 -> Person 4 (1-hop)
        assert len(results[8]["pattern"]) == 3
        # Index 9: Person 4 zero-hop
        assert len(results[9]["pattern"]) == 1
        assert results[9]["pattern"][0]["id"] == 4

    @pytest.mark.asyncio
    async def test_add_two_integers(self):
        """Test add two integers."""
        runner = Runner("return 1 + 2 as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": 3}

    @pytest.mark.asyncio
    async def test_add_negative_number(self):
        """Test add with a negative number."""
        runner = Runner("return -3 + 7 as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": 4}

    @pytest.mark.asyncio
    async def test_add_to_negative_result(self):
        """Test add to negative result."""
        runner = Runner("return 0 - 10 + 4 as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": -6}

    @pytest.mark.asyncio
    async def test_add_zero(self):
        """Test add zero."""
        runner = Runner("return 42 + 0 as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": 42}

    @pytest.mark.asyncio
    async def test_add_floating_point_numbers(self):
        """Test add floating point numbers."""
        runner = Runner("return 1.5 + 2.3 as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0]["result"] == pytest.approx(3.8)

    @pytest.mark.asyncio
    async def test_add_integer_and_float(self):
        """Test add integer and float."""
        runner = Runner("return 1 + 0.5 as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0]["result"] == pytest.approx(1.5)

    @pytest.mark.asyncio
    async def test_add_strings(self):
        """Test add strings."""
        runner = Runner('return "hello" + " world" as result')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": "hello world"}

    @pytest.mark.asyncio
    async def test_add_empty_strings(self):
        """Test add empty strings."""
        runner = Runner('return "" + "" as result')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": ""}

    @pytest.mark.asyncio
    async def test_add_string_and_empty_string(self):
        """Test add string and empty string."""
        runner = Runner('return "hello" + "" as result')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": "hello"}

    @pytest.mark.asyncio
    async def test_add_two_lists(self):
        """Test add two lists."""
        runner = Runner("return [1, 2] + [3, 4] as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": [1, 2, 3, 4]}

    @pytest.mark.asyncio
    async def test_add_empty_list_to_list(self):
        """Test add empty list to list."""
        runner = Runner("return [1, 2, 3] + [] as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": [1, 2, 3]}

    @pytest.mark.asyncio
    async def test_add_two_empty_lists(self):
        """Test add two empty lists."""
        runner = Runner("return [] + [] as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": []}

    @pytest.mark.asyncio
    async def test_add_lists_with_mixed_types(self):
        """Test add lists with mixed types."""
        runner = Runner('return [1, "a"] + [2, "b"] as result')
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": [1, "a", 2, "b"]}

    @pytest.mark.asyncio
    async def test_add_chained_three_numbers(self):
        """Test add chained three numbers."""
        runner = Runner("return 1 + 2 + 3 as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": 6}

    @pytest.mark.asyncio
    async def test_add_chained_multiple_numbers(self):
        """Test add chained multiple numbers."""
        runner = Runner("return 10 + 20 + 30 + 40 as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": 100}

    @pytest.mark.asyncio
    async def test_add_large_numbers(self):
        """Test add large numbers."""
        runner = Runner("return 1000000 + 2000000 as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": 3000000}

    @pytest.mark.asyncio
    async def test_add_with_unwind(self):
        """Test add with unwind."""
        runner = Runner("unwind [1, 2, 3] as x return x + 10 as result")
        await runner.run()
        results = runner.results
        assert len(results) == 3
        assert results[0] == {"result": 11}
        assert results[1] == {"result": 12}
        assert results[2] == {"result": 13}

    @pytest.mark.asyncio
    async def test_add_with_multiple_return_expressions(self):
        """Test add with multiple return expressions."""
        runner = Runner("return 1 + 2 as sum1, 3 + 4 as sum2, 5 + 6 as sum3")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"sum1": 3, "sum2": 7, "sum3": 11}

    @pytest.mark.asyncio
    async def test_add_mixed_with_other_operators(self):
        """Test add mixed with other operators (precedence)."""
        runner = Runner("return 2 + 3 * 4 as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": 14}

    @pytest.mark.asyncio
    async def test_add_with_parentheses(self):
        """Test add with parentheses."""
        runner = Runner("return (2 + 3) * 4 as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": 20}

    @pytest.mark.asyncio
    async def test_add_nested_lists(self):
        """Test add nested lists."""
        runner = Runner("return [[1, 2]] + [[3, 4]] as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": [[1, 2], [3, 4]]}

    @pytest.mark.asyncio
    async def test_add_with_with_clause(self):
        """Test add with with clause."""
        runner = Runner("with 5 as a, 10 as b return a + b as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": 15}

    # ============================================================
    # UNION and UNION ALL tests
    # ============================================================

    @pytest.mark.asyncio
    async def test_union_with_simple_values(self):
        """Test UNION with simple values."""
        runner = Runner("WITH 1 AS x RETURN x UNION WITH 2 AS x RETURN x")
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert results == [{"x": 1}, {"x": 2}]

    @pytest.mark.asyncio
    async def test_union_removes_duplicates(self):
        """Test UNION removes duplicates."""
        runner = Runner("WITH 1 AS x RETURN x UNION WITH 1 AS x RETURN x")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results == [{"x": 1}]

    @pytest.mark.asyncio
    async def test_union_all_keeps_duplicates(self):
        """Test UNION ALL keeps duplicates."""
        runner = Runner("WITH 1 AS x RETURN x UNION ALL WITH 1 AS x RETURN x")
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert results == [{"x": 1}, {"x": 1}]

    @pytest.mark.asyncio
    async def test_union_with_multiple_columns(self):
        """Test UNION with multiple columns."""
        runner = Runner(
            "WITH 1 AS a, 'hello' AS b RETURN a, b UNION WITH 2 AS a, 'world' AS b RETURN a, b"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert results == [
            {"a": 1, "b": "hello"},
            {"a": 2, "b": "world"},
        ]

    @pytest.mark.asyncio
    async def test_union_all_with_multiple_columns(self):
        """Test chained UNION ALL with three branches."""
        runner = Runner(
            "WITH 1 AS a RETURN a UNION ALL WITH 2 AS a RETURN a UNION ALL WITH 3 AS a RETURN a"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 3
        assert results == [{"a": 1}, {"a": 2}, {"a": 3}]

    @pytest.mark.asyncio
    async def test_chained_union_removes_duplicates(self):
        """Test chained UNION removes duplicates across all branches."""
        runner = Runner(
            "WITH 1 AS x RETURN x UNION WITH 2 AS x RETURN x UNION WITH 1 AS x RETURN x"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert results == [{"x": 1}, {"x": 2}]

    @pytest.mark.asyncio
    async def test_union_with_unwind(self):
        """Test UNION with UNWIND."""
        runner = Runner(
            "UNWIND [1, 2] AS x RETURN x UNION UNWIND [3, 4] AS x RETURN x"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 4
        assert results == [{"x": 1}, {"x": 2}, {"x": 3}, {"x": 4}]

    @pytest.mark.asyncio
    async def test_union_with_mismatched_columns(self):
        """Test UNION with mismatched columns throws error."""
        runner = Runner("WITH 1 AS x RETURN x UNION WITH 2 AS y RETURN y")
        with pytest.raises(ValueError, match="All sub queries in a UNION must have the same return column names"):
            await runner.run()

    @pytest.mark.asyncio
    async def test_union_with_empty_left_side(self):
        """Test UNION with empty left side."""
        runner = Runner(
            "UNWIND [] AS x RETURN x UNION WITH 1 AS x RETURN x"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results == [{"x": 1}]

    @pytest.mark.asyncio
    async def test_union_with_empty_right_side(self):
        """Test UNION with empty right side."""
        runner = Runner(
            "WITH 1 AS x RETURN x UNION UNWIND [] AS x RETURN x"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results == [{"x": 1}]

    @pytest.mark.asyncio
    async def test_language_name_hits_query_with_virtual_graph(self):
        """Test full language-name-hits query with virtual graph.

        Reproduces the original bug: collect(distinct ...) on MATCH results,
        then sum(lang IN langs | ...) in a WITH clause, was throwing
        "Invalid array for sum function" because collect() returned null
        instead of [] when no rows entered aggregation.
        """
        # Create Language nodes
        await Runner(
            """
            CREATE VIRTUAL (:Language) AS {
                UNWIND [
                    {id: 1, name: 'Python'},
                    {id: 2, name: 'JavaScript'},
                    {id: 3, name: 'TypeScript'}
                ] AS record
                RETURN record.id AS id, record.name AS name
            }
            """
        ).run()

        # Create Chat nodes with messages
        await Runner(
            """
            CREATE VIRTUAL (:Chat) AS {
                UNWIND [
                    {id: 1, name: 'Dev Discussion', messages: [
                        {From: 'Alice', SentDateTime: '2025-01-01T10:00:00', Content: 'I love Python and JavaScript'},
                        {From: 'Bob', SentDateTime: '2025-01-01T10:05:00', Content: 'What languages do you prefer?'}
                    ]},
                    {id: 2, name: 'General', messages: [
                        {From: 'Charlie', SentDateTime: '2025-01-02T09:00:00', Content: 'The weather is nice today'},
                        {From: 'Alice', SentDateTime: '2025-01-02T09:05:00', Content: 'TypeScript is great for language tooling'}
                    ]}
                ] AS record
                RETURN record.id AS id, record.name AS name, record.messages AS messages
            }
            """
        ).run()

        # Create User nodes
        await Runner(
            """
            CREATE VIRTUAL (:User) AS {
                UNWIND [
                    {id: 1, displayName: 'Alice'},
                    {id: 2, displayName: 'Bob'},
                    {id: 3, displayName: 'Charlie'}
                ] AS record
                RETURN record.id AS id, record.displayName AS displayName
            }
            """
        ).run()

        # Create PARTICIPATES_IN relationships
        await Runner(
            """
            CREATE VIRTUAL (:User)-[:PARTICIPATES_IN]-(:Chat) AS {
                UNWIND [
                    {left_id: 1, right_id: 1},
                    {left_id: 2, right_id: 1},
                    {left_id: 3, right_id: 2},
                    {left_id: 1, right_id: 2}
                ] AS record
                RETURN record.left_id AS left_id, record.right_id AS right_id
            }
            """
        ).run()

        # Run the original query (using 'sender' alias since 'from' is a reserved keyword)
        runner = Runner(
            """
            MATCH (l:Language)
            WITH collect(distinct l.name) AS langs
            MATCH (c:Chat)
            UNWIND c.messages AS msg
            WITH c, msg, langs,
                 sum(lang IN langs | 1 where toLower(msg.Content) CONTAINS toLower(lang)) AS langNameHits
            WHERE toLower(msg.Content) CONTAINS "language"
               OR toLower(msg.Content) CONTAINS "languages"
               OR langNameHits > 0
            OPTIONAL MATCH (u:User)-[:PARTICIPATES_IN]->(c)
            RETURN
              c.name AS chat,
              collect(distinct u.displayName) AS participants,
              msg.From AS sender,
              msg.SentDateTime AS sentDateTime,
              msg.Content AS message
            """
        )
        await runner.run()
        results = runner.results

        # Messages that mention a language name or the word "language(s)":
        # 1. "I love Python and JavaScript" - langNameHits=2
        # 2. "What languages do you prefer?" - contains "languages"
        # 3. "TypeScript is great for language tooling" - langNameHits=1, also "language"
        assert len(results) == 3
        assert results[0]["chat"] == "Dev Discussion"
        assert results[0]["message"] == "I love Python and JavaScript"
        assert results[0]["sender"] == "Alice"
        assert results[1]["chat"] == "Dev Discussion"
        assert results[1]["message"] == "What languages do you prefer?"
        assert results[1]["sender"] == "Bob"
        assert results[2]["chat"] == "General"
        assert results[2]["message"] == "TypeScript is great for language tooling"
        assert results[2]["sender"] == "Alice"

    @pytest.mark.asyncio
    async def test_sum_with_empty_collected_array(self):
        """Reproduces the original bug: collect on empty input should yield []
        and sum over that empty array should return 0, not throw."""
        runner = Runner(
            """
            UNWIND [] AS lang
            WITH collect(distinct lang) AS langs
            UNWIND ['hello', 'world'] AS msg
            WITH msg, langs, sum(l IN langs | 1 where toLower(msg) CONTAINS toLower(l)) AS hits
            RETURN msg, hits
            """
        )
        await runner.run()
        results = runner.results
        assert len(results) == 2
        assert results[0] == {"msg": "hello", "hits": 0}
        assert results[1] == {"msg": "world", "hits": 0}

    @pytest.mark.asyncio
    async def test_sum_where_all_elements_filtered_returns_0(self):
        """Test sum returns 0 when where clause filters everything."""
        runner = Runner("RETURN sum(n in [1, 2, 3] | n where n > 100) as sum")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"sum": 0}

    @pytest.mark.asyncio
    async def test_sum_over_empty_array_returns_0(self):
        """Test sum over empty array returns 0."""
        runner = Runner("WITH [] AS arr RETURN sum(n in arr | n) as sum")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"sum": 0}

    @pytest.mark.asyncio
    async def test_coalesce_returns_first_non_null(self):
        """Test coalesce returns first non-null value."""
        runner = Runner("RETURN coalesce(null, null, 'hello', 'world') as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": "hello"}

    @pytest.mark.asyncio
    async def test_coalesce_returns_first_argument_when_not_null(self):
        """Test coalesce returns first argument when not null."""
        runner = Runner("RETURN coalesce('first', 'second') as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": "first"}

    @pytest.mark.asyncio
    async def test_coalesce_returns_null_when_all_null(self):
        """Test coalesce returns null when all arguments are null."""
        runner = Runner("RETURN coalesce(null, null, null) as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": None}

    @pytest.mark.asyncio
    async def test_coalesce_with_single_non_null_argument(self):
        """Test coalesce with single non-null argument."""
        runner = Runner("RETURN coalesce(42) as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": 42}

    @pytest.mark.asyncio
    async def test_coalesce_with_mixed_types(self):
        """Test coalesce with mixed types."""
        runner = Runner("RETURN coalesce(null, 42, 'hello') as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": 42}

    @pytest.mark.asyncio
    async def test_coalesce_with_property_access(self):
        """Test coalesce with property access."""
        runner = Runner("WITH {name: 'Alice'} AS person RETURN coalesce(person.nickname, person.name) as result")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"result": "Alice"}

    # ============================================================
    # Temporal / Time Functions
    # ============================================================

    @pytest.mark.asyncio
    async def test_datetime_returns_current_datetime_object(self):
        """Test datetime() returns current datetime object."""
        import time
        before = int(time.time() * 1000)
        runner = Runner("RETURN datetime() AS dt")
        await runner.run()
        after = int(time.time() * 1000)
        results = runner.results
        assert len(results) == 1
        dt = results[0]["dt"]
        assert dt is not None
        assert isinstance(dt["year"], int)
        assert isinstance(dt["month"], int)
        assert isinstance(dt["day"], int)
        assert isinstance(dt["hour"], int)
        assert isinstance(dt["minute"], int)
        assert isinstance(dt["second"], int)
        assert isinstance(dt["millisecond"], int)
        assert isinstance(dt["epochMillis"], int)
        assert isinstance(dt["epochSeconds"], int)
        assert isinstance(dt["dayOfWeek"], int)
        assert isinstance(dt["dayOfYear"], int)
        assert isinstance(dt["quarter"], int)
        assert isinstance(dt["formatted"], str)
        # epochMillis should be between before and after
        assert dt["epochMillis"] >= before
        assert dt["epochMillis"] <= after

    @pytest.mark.asyncio
    async def test_datetime_with_iso_string_argument(self):
        """Test datetime() with ISO string argument."""
        runner = Runner("RETURN datetime('2025-06-15T12:30:45.123Z') AS dt")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        dt = results[0]["dt"]
        assert dt["year"] == 2025
        assert dt["month"] == 6
        assert dt["day"] == 15
        assert dt["hour"] == 12
        assert dt["minute"] == 30
        assert dt["second"] == 45
        assert dt["millisecond"] == 123
        assert dt["formatted"] == "2025-06-15T12:30:45.123Z"

    @pytest.mark.asyncio
    async def test_datetime_property_access(self):
        """Test datetime() property access."""
        runner = Runner(
            "WITH datetime('2025-06-15T12:30:45.123Z') AS dt RETURN dt.year AS year, dt.month AS month, dt.day AS day"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"year": 2025, "month": 6, "day": 15}

    @pytest.mark.asyncio
    async def test_date_returns_current_date_object(self):
        """Test date() returns current date object."""
        runner = Runner("RETURN date() AS d")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        d = results[0]["d"]
        assert d is not None
        assert isinstance(d["year"], int)
        assert isinstance(d["month"], int)
        assert isinstance(d["day"], int)
        assert isinstance(d["epochMillis"], int)
        assert isinstance(d["dayOfWeek"], int)
        assert isinstance(d["dayOfYear"], int)
        assert isinstance(d["quarter"], int)
        assert isinstance(d["formatted"], str)
        # Should not have time fields
        assert "hour" not in d
        assert "minute" not in d

    @pytest.mark.asyncio
    async def test_date_with_iso_date_string(self):
        """Test date() with ISO date string."""
        runner = Runner("RETURN date('2025-06-15') AS d")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        d = results[0]["d"]
        assert d["year"] == 2025
        assert d["month"] == 6
        assert d["day"] == 15
        assert d["formatted"] == "2025-06-15"

    @pytest.mark.asyncio
    async def test_date_dayofweek_and_quarter(self):
        """Test date() dayOfWeek and quarter."""
        # 2025-06-15 is a Sunday
        runner = Runner("RETURN date('2025-06-15') AS d")
        await runner.run()
        d = runner.results[0]["d"]
        assert d["dayOfWeek"] == 7  # Sunday = 7 in ISO
        assert d["quarter"] == 2  # June = Q2

    @pytest.mark.asyncio
    async def test_time_returns_current_utc_time(self):
        """Test time() returns current UTC time."""
        runner = Runner("RETURN time() AS t")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        t = results[0]["t"]
        assert isinstance(t["hour"], int)
        assert isinstance(t["minute"], int)
        assert isinstance(t["second"], int)
        assert isinstance(t["millisecond"], int)
        assert isinstance(t["formatted"], str)
        assert t["formatted"].endswith("Z")  # UTC time ends in Z

    @pytest.mark.asyncio
    async def test_localtime_returns_current_local_time(self):
        """Test localtime() returns current local time."""
        runner = Runner("RETURN localtime() AS t")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        t = results[0]["t"]
        assert isinstance(t["hour"], int)
        assert isinstance(t["minute"], int)
        assert isinstance(t["second"], int)
        assert isinstance(t["millisecond"], int)
        assert isinstance(t["formatted"], str)
        assert not t["formatted"].endswith("Z")  # Local time does not end in Z

    @pytest.mark.asyncio
    async def test_localdatetime_returns_current_local_datetime(self):
        """Test localdatetime() returns current local datetime."""
        runner = Runner("RETURN localdatetime() AS dt")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        dt = results[0]["dt"]
        assert isinstance(dt["year"], int)
        assert isinstance(dt["month"], int)
        assert isinstance(dt["day"], int)
        assert isinstance(dt["hour"], int)
        assert isinstance(dt["minute"], int)
        assert isinstance(dt["second"], int)
        assert isinstance(dt["millisecond"], int)
        assert isinstance(dt["epochMillis"], int)
        assert isinstance(dt["formatted"], str)
        assert not dt["formatted"].endswith("Z")  # Local datetime does not end in Z

    @pytest.mark.asyncio
    async def test_localdatetime_with_string_argument(self):
        """Test localdatetime() with string argument."""
        runner = Runner("RETURN localdatetime('2025-01-20T08:15:30.500') AS dt")
        await runner.run()
        dt = runner.results[0]["dt"]
        assert isinstance(dt["year"], int)
        assert isinstance(dt["hour"], int)
        assert dt["epochMillis"] is not None

    @pytest.mark.asyncio
    async def test_timestamp_returns_epoch_millis(self):
        """Test timestamp() returns epoch millis."""
        import time
        before = int(time.time() * 1000)
        runner = Runner("RETURN timestamp() AS ts")
        await runner.run()
        after = int(time.time() * 1000)
        results = runner.results
        assert len(results) == 1
        ts = results[0]["ts"]
        assert isinstance(ts, int)
        assert ts >= before
        assert ts <= after

    @pytest.mark.asyncio
    async def test_datetime_epochmillis_matches_timestamp(self):
        """Test datetime() epochMillis matches timestamp()."""
        runner = Runner(
            "WITH datetime() AS dt, timestamp() AS ts RETURN dt.epochMillis AS dtMillis, ts AS tsMillis"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 1
        # They should be very close (within a few ms)
        assert abs(results[0]["dtMillis"] - results[0]["tsMillis"]) < 100

    @pytest.mark.asyncio
    async def test_date_with_property_access_in_where(self):
        """Test date() with property access in WHERE."""
        runner = Runner(
            "UNWIND [1, 2, 3] AS x WITH x, date('2025-06-15') AS d WHERE d.quarter = 2 RETURN x"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 3  # All 3 pass through since Q2 = 2

    @pytest.mark.asyncio
    async def test_datetime_with_map_argument(self):
        """Test datetime() with map argument."""
        runner = Runner(
            "RETURN datetime({year: 2024, month: 12, day: 25, hour: 10, minute: 30}) AS dt"
        )
        await runner.run()
        dt = runner.results[0]["dt"]
        assert dt["year"] == 2024
        assert dt["month"] == 12
        assert dt["day"] == 25
        assert dt["quarter"] == 4  # December = Q4

    @pytest.mark.asyncio
    async def test_date_with_map_argument(self):
        """Test date() with map argument."""
        runner = Runner(
            "RETURN date({year: 2025, month: 3, day: 1}) AS d"
        )
        await runner.run()
        d = runner.results[0]["d"]
        assert d["year"] == 2025
        assert d["month"] == 3
        assert d["day"] == 1
        assert d["quarter"] == 1  # March = Q1

    @pytest.mark.asyncio
    async def test_id_function_with_node(self):
        """Test id() function with a graph node."""
        await Runner(
            """
            CREATE VIRTUAL (:Person) AS {
                UNWIND [
                    {id: 1, name: 'Alice'},
                    {id: 2, name: 'Bob'}
                ] AS record
                RETURN record.id AS id, record.name AS name
            }
            """
        ).run()
        match = Runner(
            """
            MATCH (n:Person)
            RETURN id(n) AS nodeId
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 2
        assert results[0] == {"nodeId": 1}
        assert results[1] == {"nodeId": 2}

    @pytest.mark.asyncio
    async def test_id_function_with_null(self):
        """Test id() function with null."""
        runner = Runner("RETURN id(null) AS nodeId")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"nodeId": None}

    @pytest.mark.asyncio
    async def test_id_function_with_relationship(self):
        """Test id() function with a relationship."""
        await Runner(
            """
            CREATE VIRTUAL (:City) AS {
                UNWIND [
                    {id: 1, name: 'New York'},
                    {id: 2, name: 'Boston'}
                ] AS record
                RETURN record.id AS id, record.name AS name
            }
            """
        ).run()
        await Runner(
            """
            CREATE VIRTUAL (:City)-[:CONNECTED_TO]-(:City) AS {
                UNWIND [
                    {left_id: 1, right_id: 2}
                ] AS record
                RETURN record.left_id AS left_id, record.right_id AS right_id
            }
            """
        ).run()
        match = Runner(
            """
            MATCH (a:City)-[r:CONNECTED_TO]->(b:City)
            RETURN id(r) AS relId
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 1
        assert results[0] == {"relId": "CONNECTED_TO"}

    @pytest.mark.asyncio
    async def test_element_id_function_with_node(self):
        """Test elementId() function with a graph node."""
        await Runner(
            """
            CREATE VIRTUAL (:Person) AS {
                UNWIND [
                    {id: 1, name: 'Alice'},
                    {id: 2, name: 'Bob'}
                ] AS record
                RETURN record.id AS id, record.name AS name
            }
            """
        ).run()
        match = Runner(
            """
            MATCH (n:Person)
            RETURN elementId(n) AS eid
            """
        )
        await match.run()
        results = match.results
        assert len(results) == 2
        assert results[0] == {"eid": "1"}
        assert results[1] == {"eid": "2"}

    @pytest.mark.asyncio
    async def test_element_id_function_with_null(self):
        """Test elementId() function with null."""
        runner = Runner("RETURN elementId(null) AS eid")
        await runner.run()
        results = runner.results
        assert len(results) == 1
        assert results[0] == {"eid": None}

    @pytest.mark.asyncio
    async def test_head_function(self):
        """Test head() function."""
        runner = Runner("RETURN head([1, 2, 3]) AS h")
        await runner.run()
        assert len(runner.results) == 1
        assert runner.results[0] == {"h": 1}

    @pytest.mark.asyncio
    async def test_head_function_empty_list(self):
        """Test head() function with empty list."""
        runner = Runner("RETURN head([]) AS h")
        await runner.run()
        assert runner.results[0] == {"h": None}

    @pytest.mark.asyncio
    async def test_head_function_null(self):
        """Test head() function with null."""
        runner = Runner("RETURN head(null) AS h")
        await runner.run()
        assert runner.results[0] == {"h": None}

    @pytest.mark.asyncio
    async def test_tail_function(self):
        """Test tail() function."""
        runner = Runner("RETURN tail([1, 2, 3]) AS t")
        await runner.run()
        assert len(runner.results) == 1
        assert runner.results[0] == {"t": [2, 3]}

    @pytest.mark.asyncio
    async def test_tail_function_single_element(self):
        """Test tail() function with single element."""
        runner = Runner("RETURN tail([1]) AS t")
        await runner.run()
        assert runner.results[0] == {"t": []}

    @pytest.mark.asyncio
    async def test_tail_function_null(self):
        """Test tail() function with null."""
        runner = Runner("RETURN tail(null) AS t")
        await runner.run()
        assert runner.results[0] == {"t": None}

    @pytest.mark.asyncio
    async def test_last_function(self):
        """Test last() function."""
        runner = Runner("RETURN last([1, 2, 3]) AS l")
        await runner.run()
        assert len(runner.results) == 1
        assert runner.results[0] == {"l": 3}

    @pytest.mark.asyncio
    async def test_last_function_empty_list(self):
        """Test last() function with empty list."""
        runner = Runner("RETURN last([]) AS l")
        await runner.run()
        assert runner.results[0] == {"l": None}

    @pytest.mark.asyncio
    async def test_last_function_null(self):
        """Test last() function with null."""
        runner = Runner("RETURN last(null) AS l")
        await runner.run()
        assert runner.results[0] == {"l": None}

    @pytest.mark.asyncio
    async def test_to_integer_function_string(self):
        """Test toInteger() function with string."""
        runner = Runner('RETURN toInteger("42") AS i')
        await runner.run()
        assert runner.results[0] == {"i": 42}

    @pytest.mark.asyncio
    async def test_to_integer_function_float(self):
        """Test toInteger() function with float."""
        runner = Runner("RETURN toInteger(3.14) AS i")
        await runner.run()
        assert runner.results[0] == {"i": 3}

    @pytest.mark.asyncio
    async def test_to_integer_function_boolean(self):
        """Test toInteger() function with boolean."""
        runner = Runner("RETURN toInteger(true) AS i")
        await runner.run()
        assert runner.results[0] == {"i": 1}

    @pytest.mark.asyncio
    async def test_to_integer_function_null(self):
        """Test toInteger() function with null."""
        runner = Runner("RETURN toInteger(null) AS i")
        await runner.run()
        assert runner.results[0] == {"i": None}

    @pytest.mark.asyncio
    async def test_to_float_function_string(self):
        """Test toFloat() function with string."""
        runner = Runner('RETURN toFloat("3.14") AS f')
        await runner.run()
        assert runner.results[0] == {"f": 3.14}

    @pytest.mark.asyncio
    async def test_to_float_function_integer(self):
        """Test toFloat() function with integer."""
        runner = Runner("RETURN toFloat(42) AS f")
        await runner.run()
        assert runner.results[0] == {"f": 42}

    @pytest.mark.asyncio
    async def test_to_float_function_boolean(self):
        """Test toFloat() function with boolean."""
        runner = Runner("RETURN toFloat(true) AS f")
        await runner.run()
        assert runner.results[0] == {"f": 1.0}

    @pytest.mark.asyncio
    async def test_to_float_function_null(self):
        """Test toFloat() function with null."""
        runner = Runner("RETURN toFloat(null) AS f")
        await runner.run()
        assert runner.results[0] == {"f": None}

    @pytest.mark.asyncio
    async def test_duration_iso_string(self):
        """Test duration() with ISO 8601 string."""
        runner = Runner("RETURN duration('P1Y2M3DT4H5M6S') AS d")
        await runner.run()
        d = runner.results[0]["d"]
        assert d["years"] == 1
        assert d["months"] == 2
        assert d["days"] == 3
        assert d["hours"] == 4
        assert d["minutes"] == 5
        assert d["seconds"] == 6
        assert d["totalMonths"] == 14
        assert d["formatted"] == "P1Y2M3DT4H5M6S"

    @pytest.mark.asyncio
    async def test_duration_map_argument(self):
        """Test duration() with map argument."""
        runner = Runner("RETURN duration({days: 14, hours: 16}) AS d")
        await runner.run()
        d = runner.results[0]["d"]
        assert d["days"] == 14
        assert d["hours"] == 16
        assert d["totalDays"] == 14
        assert d["totalSeconds"] == 57600

    @pytest.mark.asyncio
    async def test_duration_weeks(self):
        """Test duration() with weeks."""
        runner = Runner("RETURN duration('P2W') AS d")
        await runner.run()
        d = runner.results[0]["d"]
        assert d["weeks"] == 2
        assert d["days"] == 14
        assert d["totalDays"] == 14

    @pytest.mark.asyncio
    async def test_duration_null(self):
        """Test duration() with null."""
        runner = Runner("RETURN duration(null) AS d")
        await runner.run()
        assert runner.results[0] == {"d": None}

    @pytest.mark.asyncio
    async def test_duration_time_only(self):
        """Test duration() with time-only string."""
        runner = Runner("RETURN duration('PT2H30M') AS d")
        await runner.run()
        d = runner.results[0]["d"]
        assert d["hours"] == 2
        assert d["minutes"] == 30
        assert d["totalSeconds"] == 9000
        assert d["formatted"] == "PT2H30M"

    # ORDER BY tests

    @pytest.mark.asyncio
    async def test_order_by_ascending(self):
        """Test ORDER BY ascending (default)."""
        runner = Runner("unwind [3, 1, 2] as x return x order by x")
        await runner.run()
        results = runner.results
        assert len(results) == 3
        assert results[0] == {"x": 1}
        assert results[1] == {"x": 2}
        assert results[2] == {"x": 3}

    @pytest.mark.asyncio
    async def test_order_by_descending(self):
        """Test ORDER BY descending."""
        runner = Runner("unwind [3, 1, 2] as x return x order by x desc")
        await runner.run()
        results = runner.results
        assert len(results) == 3
        assert results[0] == {"x": 3}
        assert results[1] == {"x": 2}
        assert results[2] == {"x": 1}

    @pytest.mark.asyncio
    async def test_order_by_ascending_explicit(self):
        """Test ORDER BY with explicit ASC."""
        runner = Runner("unwind [3, 1, 2] as x return x order by x asc")
        await runner.run()
        results = runner.results
        assert len(results) == 3
        assert results[0] == {"x": 1}
        assert results[1] == {"x": 2}
        assert results[2] == {"x": 3}

    @pytest.mark.asyncio
    async def test_order_by_with_multiple_fields(self):
        """Test ORDER BY with multiple sort fields."""
        runner = Runner(
            "unwind [{name: 'Alice', age: 30}, {name: 'Bob', age: 25}, {name: 'Alice', age: 25}] as person "
            "return person.name as name, person.age as age "
            "order by name asc, age asc"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 3
        assert results[0] == {"name": "Alice", "age": 25}
        assert results[1] == {"name": "Alice", "age": 30}
        assert results[2] == {"name": "Bob", "age": 25}

    @pytest.mark.asyncio
    async def test_order_by_with_strings(self):
        """Test ORDER BY with string values."""
        runner = Runner(
            "unwind ['banana', 'apple', 'cherry'] as fruit return fruit order by fruit"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 3
        assert results[0] == {"fruit": "apple"}
        assert results[1] == {"fruit": "banana"}
        assert results[2] == {"fruit": "cherry"}

    @pytest.mark.asyncio
    async def test_order_by_with_aggregated_return(self):
        """Test ORDER BY with aggregated RETURN."""
        runner = Runner(
            "unwind [1, 1, 2, 2, 3, 3] as x "
            "return x, count(x) as cnt "
            "order by x desc"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 3
        assert results[0] == {"x": 3, "cnt": 2}
        assert results[1] == {"x": 2, "cnt": 2}
        assert results[2] == {"x": 1, "cnt": 2}

    @pytest.mark.asyncio
    async def test_order_by_with_limit(self):
        """Test ORDER BY combined with LIMIT."""
        runner = Runner(
            "unwind [3, 1, 4, 1, 5, 9, 2, 6] as x return x order by x limit 3"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 3
        assert results[0] == {"x": 1}
        assert results[1] == {"x": 1}
        assert results[2] == {"x": 2}

    @pytest.mark.asyncio
    async def test_order_by_with_where(self):
        """Test ORDER BY combined with WHERE."""
        runner = Runner(
            "unwind [3, 1, 4, 1, 5, 9, 2, 6] as x return x where x > 2 order by x desc"
        )
        await runner.run()
        results = runner.results
        assert len(results) == 5
        assert results[0] == {"x": 9}
        assert results[1] == {"x": 6}
        assert results[2] == {"x": 5}
        assert results[3] == {"x": 4}
        assert results[4] == {"x": 3}