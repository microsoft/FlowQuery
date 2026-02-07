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
    async def test_circular_graph_pattern_with_variable_length_should_throw_error(self):
        """Test circular graph pattern with variable length should throw error."""
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
        with pytest.raises(ValueError, match="Circular relationship detected"):
            await match.run()

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
            "CALL schema() YIELD kind, label, type, sample RETURN kind, label, type, sample"
        )
        await runner.run()
        results = runner.results

        animal = next((r for r in results if r.get("kind") == "node" and r.get("label") == "Animal"), None)
        assert animal is not None
        assert animal["sample"] is not None
        assert "id" not in animal["sample"]
        assert "species" in animal["sample"]
        assert "legs" in animal["sample"]

        chases = next((r for r in results if r.get("kind") == "relationship" and r.get("type") == "CHASES"), None)
        assert chases is not None
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