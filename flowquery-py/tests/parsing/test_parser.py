"""Tests for the FlowQuery parser."""

import pytest
from typing import AsyncIterator
from flowquery.parsing.parser import Parser
from flowquery.parsing.functions.async_function import AsyncFunction
from flowquery.parsing.functions.function_metadata import FunctionDef
from flowquery.parsing.operations.match import Match
from flowquery.graph.node import Node
from flowquery.graph.relationship import Relationship


# Test async function for CALL operation parsing test
# Named with underscore prefix to prevent pytest from trying to collect it as a test class
@FunctionDef({
    "description": "Asynchronous function for testing CALL operation",
    "category": "async",
    "parameters": [],
    "output": {"description": "Yields test values", "type": "any"},
})
class _Test(AsyncFunction):
    """Async function for CALL operation testing, registered as 'test'."""
    
    def __init__(self):
        super().__init__("test")  # Register as 'test'
        self._expected_parameter_count = 0
    
    async def generate(self) -> AsyncIterator:
        yield 1
        yield 2
        yield 3


class TestParser:
    """Test cases for the Parser class."""

    def test_parser_basic(self):
        """Test basic parser functionality."""
        parser = Parser()
        ast = parser.parse("RETURN 1, 2, 3")
        expected = (
            "ASTNode\n"
            "- Return\n"
            "-- Expression\n"
            "--- Number (1)\n"
            "-- Expression\n"
            "--- Number (2)\n"
            "-- Expression\n"
            "--- Number (3)"
        )
        assert ast.print() == expected

    def test_parser_with_function(self):
        """Test parser with function."""
        parser = Parser()
        ast = parser.parse("RETURN rand()")
        expected = (
            "ASTNode\n"
            "- Return\n"
            "-- Expression\n"
            "--- Function (rand)"
        )
        assert ast.print() == expected

    def test_parser_with_associative_array(self):
        """Test parser with associative array."""
        parser = Parser()
        ast = parser.parse("RETURN {a: 1, b: 2}")
        expected = (
            "ASTNode\n"
            "- Return\n"
            "-- Expression\n"
            "--- AssociativeArray\n"
            "---- KeyValuePair\n"
            "----- String (a)\n"
            "----- Expression\n"
            "------ Number (1)\n"
            "---- KeyValuePair\n"
            "----- String (b)\n"
            "----- Expression\n"
            "------ Number (2)"
        )
        assert ast.print() == expected

    def test_parser_with_json_array(self):
        """Test parser with JSON array."""
        parser = Parser()
        ast = parser.parse("RETURN [1, 2]")
        expected = (
            "ASTNode\n"
            "- Return\n"
            "-- Expression\n"
            "--- JSONArray\n"
            "---- Expression\n"
            "----- Number (1)\n"
            "---- Expression\n"
            "----- Number (2)"
        )
        assert ast.print() == expected

    def test_parser_with_nested_associative_array(self):
        """Test parser with nested associative array."""
        parser = Parser()
        ast = parser.parse("RETURN {a:{}}")
        expected = (
            "ASTNode\n"
            "- Return\n"
            "-- Expression\n"
            "--- AssociativeArray\n"
            "---- KeyValuePair\n"
            "----- String (a)\n"
            "----- Expression\n"
            "------ AssociativeArray"
        )
        assert ast.print() == expected

    def test_parser_with_multiple_operations(self):
        """Test parser with multiple operations."""
        parser = Parser()
        ast = parser.parse("WITH 1 AS n RETURN n")
        expected = (
            "ASTNode\n"
            "- With\n"
            "-- Expression (n)\n"
            "--- Number (1)\n"
            "- Return\n"
            "-- Expression (n)\n"
            "--- Reference (n)"
        )
        assert ast.print() == expected

    def test_parser_with_comments(self):
        """Test parser with comments."""
        parser = Parser()
        ast = parser.parse("WITH 1 AS n /* comment */ RETURN n")
        expected = (
            "ASTNode\n"
            "- With\n"
            "-- Expression (n)\n"
            "--- Number (1)\n"
            "- Return\n"
            "-- Expression (n)\n"
            "--- Reference (n)"
        )
        assert ast.print() == expected

    def test_parser_with_unwind(self):
        """Test parser with UNWIND."""
        parser = Parser()
        ast = parser.parse("UNWIND [1, 2, 3] AS n RETURN n")
        expected = (
            "ASTNode\n"
            "- Unwind\n"
            "-- Expression (n)\n"
            "--- JSONArray\n"
            "---- Expression\n"
            "----- Number (1)\n"
            "---- Expression\n"
            "----- Number (2)\n"
            "---- Expression\n"
            "----- Number (3)\n"
            "- Return\n"
            "-- Expression (n)\n"
            "--- Reference (n)"
        )
        assert ast.print() == expected

    def test_unwind_with_invalid_expression(self):
        """Test Unwind with invalid expression."""
        parser = Parser()
        with pytest.raises(Exception, match="Expected array, function, reference, or lookup"):
            parser.parse("UNWIND 1 AS n RETURN n")

    def test_unwind_with_invalid_alias(self):
        """Test Unwind with invalid alias."""
        parser = Parser()
        with pytest.raises(Exception, match="Expected identifier"):
            parser.parse("UNWIND [1, 2, 3] AS 1 RETURN n")

    def test_unwind_with_missing_alias(self):
        """Test Unwind with missing alias."""
        parser = Parser()
        with pytest.raises(Exception, match="Expected alias"):
            parser.parse("UNWIND [1, 2, 3] RETURN n")

    def test_statement_with_where_clause(self):
        """Test statement with where clause."""
        parser = Parser()
        ast = parser.parse("with 1 as n where n > 0 return n")
        expected = (
            "ASTNode\n"
            "- With\n"
            "-- Expression (n)\n"
            "--- Number (1)\n"
            "- Where\n"
            "-- Expression\n"
            "--- GreaterThan\n"
            "---- Reference (n)\n"
            "---- Number (0)\n"
            "- Return\n"
            "-- Expression (n)\n"
            "--- Reference (n)"
        )
        assert ast.print() == expected

    def test_lookup(self):
        """Test lookup expression."""
        parser = Parser()
        ast = parser.parse("return {a: 1}.a")
        expected = (
            "ASTNode\n"
            "- Return\n"
            "-- Expression\n"
            "--- Lookup\n"
            "---- Identifier (a)\n"
            "---- AssociativeArray\n"
            "----- KeyValuePair\n"
            "------ String (a)\n"
            "------ Expression\n"
            "------- Number (1)"
        )
        assert ast.print() == expected

    def test_lookup_as_part_of_expression(self):
        """Test lookup as part of expression."""
        parser = Parser()
        ast = parser.parse("return {a: 1}.a + 1")
        expected = (
            "ASTNode\n"
            "- Return\n"
            "-- Expression\n"
            "--- Add\n"
            "---- Lookup\n"
            "----- Identifier (a)\n"
            "----- AssociativeArray\n"
            "------ KeyValuePair\n"
            "------- String (a)\n"
            "------- Expression\n"
            "-------- Number (1)\n"
            "---- Number (1)"
        )
        assert ast.print() == expected

    def test_lookup_with_nested_associative_array(self):
        """Test lookup with nested associative array."""
        parser = Parser()
        ast = parser.parse("return {a: {b: 1}}.a.b")
        expected = (
            "ASTNode\n"
            "- Return\n"
            "-- Expression\n"
            "--- Lookup\n"
            "---- Identifier (b)\n"
            "---- Lookup\n"
            "----- Identifier (a)\n"
            "----- AssociativeArray\n"
            "------ KeyValuePair\n"
            "------- String (a)\n"
            "------- Expression\n"
            "-------- AssociativeArray\n"
            "--------- KeyValuePair\n"
            "---------- String (b)\n"
            "---------- Expression\n"
            "----------- Number (1)"
        )
        assert ast.print() == expected
        _return = ast.first_child()
        assert _return.first_child().value() == 1

    def test_lookup_with_json_array(self):
        """Test lookup with JSON array."""
        parser = Parser()
        ast = parser.parse("return [1, 2][1]")
        expected = (
            "ASTNode\n"
            "- Return\n"
            "-- Expression\n"
            "--- Lookup\n"
            "---- Expression\n"
            "----- Number (1)\n"
            "---- JSONArray\n"
            "----- Expression\n"
            "------ Number (1)\n"
            "----- Expression\n"
            "------ Number (2)"
        )
        assert ast.print() == expected
        _return = ast.first_child()
        assert _return.first_child().value() == 2

    def test_lookup_with_reserved_keyword_property_names(self):
        """Test lookup with reserved keyword property names like end, null, case."""
        parser = Parser()
        ast = parser.parse("with {end: 1, null: 2, case: 3} as x return x.end, x.null, x.case")
        expected = (
            "ASTNode\n"
            "- With\n"
            "-- Expression (x)\n"
            "--- AssociativeArray\n"
            "---- KeyValuePair\n"
            "----- String (end)\n"
            "----- Expression\n"
            "------ Number (1)\n"
            "---- KeyValuePair\n"
            "----- String (null)\n"
            "----- Expression\n"
            "------ Number (2)\n"
            "---- KeyValuePair\n"
            "----- String (case)\n"
            "----- Expression\n"
            "------ Number (3)\n"
            "- Return\n"
            "-- Expression\n"
            "--- Lookup\n"
            "---- Identifier (end)\n"
            "---- Reference (x)\n"
            "-- Expression\n"
            "--- Lookup\n"
            "---- Identifier (null)\n"
            "---- Reference (x)\n"
            "-- Expression\n"
            "--- Lookup\n"
            "---- Identifier (case)\n"
            "---- Reference (x)"
        )
        assert ast.print() == expected

    def test_lookup_with_from_keyword_as_property_name(self):
        """Test lookup with from and to keywords as property names."""
        parser = Parser()
        ast = parser.parse("with {from: 1, to: 2} as x return x.from, x.to")
        expected = (
            "ASTNode\n"
            "- With\n"
            "-- Expression (x)\n"
            "--- AssociativeArray\n"
            "---- KeyValuePair\n"
            "----- String (from)\n"
            "----- Expression\n"
            "------ Number (1)\n"
            "---- KeyValuePair\n"
            "----- String (to)\n"
            "----- Expression\n"
            "------ Number (2)\n"
            "- Return\n"
            "-- Expression\n"
            "--- Lookup\n"
            "---- Identifier (from)\n"
            "---- Reference (x)\n"
            "-- Expression\n"
            "--- Lookup\n"
            "---- Identifier (to)\n"
            "---- Reference (x)"
        )
        assert ast.print() == expected

    def test_camel_case_alias_starting_with_keyword(self):
        """Test that camelCase identifiers starting with a keyword (e.g. fromUser) are tokenized correctly."""
        parser = Parser()
        ast = parser.parse("LOAD JSON FROM '/data.json' AS x RETURN x.from AS fromUser")
        output = ast.print()
        assert "Lookup" in output
        assert "Identifier (from)" in output

    def test_from_keyword_property_in_create_virtual_subquery(self):
        """Test that email.from parses correctly inside a CREATE VIRTUAL subquery."""
        parser = Parser()
        # Should not raise - email.from should be parsed correctly even with FROM being a keyword
        parser.parse(
            "CREATE VIRTUAL (:Email) AS { LOAD JSON FROM '/data/emails.json' AS email "
            "RETURN email.id AS id, email.from AS fromUser }"
        )

    def test_load_with_post(self):
        """Test load with post."""
        parser = Parser()
        ast = parser.parse(
            'load json from "https://jsonplaceholder.typicode.com/posts" post {userId: 1} as data return data'
        )
        expected = (
            "ASTNode\n"
            "- Load\n"
            "-- JSON\n"
            "-- From\n"
            "--- Expression\n"
            "---- String (https://jsonplaceholder.typicode.com/posts)\n"
            "-- Post\n"
            "--- Expression\n"
            "---- AssociativeArray\n"
            "----- KeyValuePair\n"
            "------ String (userId)\n"
            "------ Expression\n"
            "------- Number (1)\n"
            "-- Alias (data)\n"
            "- Return\n"
            "-- Expression (data)\n"
            "--- Reference (data)"
        )
        assert ast.print() == expected

    def test_nested_aggregate_functions(self):
        """Test nested aggregate functions."""
        parser = Parser()
        with pytest.raises(Exception, match="Aggregate functions cannot be nested"):
            parser.parse("RETURN sum(sum(1))")

    def test_with_and_return_with_renamed_variable(self):
        """Test with and return with renamed variable."""
        parser = Parser()
        ast = parser.parse("WITH 1 AS n RETURN n AS m")
        expected = (
            "ASTNode\n"
            "- With\n"
            "-- Expression (n)\n"
            "--- Number (1)\n"
            "- Return\n"
            "-- Expression (m)\n"
            "--- Reference (n)"
        )
        assert ast.print() == expected

    def test_with_and_return_with_variable_lookup(self):
        """Test with and return with variable lookup."""
        parser = Parser()
        ast = parser.parse("WITH {a: n} AS obj RETURN obj.a")
        expected = (
            "ASTNode\n"
            "- With\n"
            "-- Expression (obj)\n"
            "--- AssociativeArray\n"
            "---- KeyValuePair\n"
            "----- String (a)\n"
            "----- Expression\n"
            "------ Reference (n)\n"
            "- Return\n"
            "-- Expression\n"
            "--- Lookup\n"
            "---- Identifier (a)\n"
            "---- Reference (obj)"
        )
        assert ast.print() == expected

    def test_unwind(self):
        """Test unwind."""
        parser = Parser()
        ast = parser.parse("WITH [1, 2, 4] as n unwind n as i return i")
        expected = (
            "ASTNode\n"
            "- With\n"
            "-- Expression (n)\n"
            "--- JSONArray\n"
            "---- Expression\n"
            "----- Number (1)\n"
            "---- Expression\n"
            "----- Number (2)\n"
            "---- Expression\n"
            "----- Number (4)\n"
            "- Unwind\n"
            "-- Expression (i)\n"
            "--- Reference (n)\n"
            "- Return\n"
            "-- Expression (i)\n"
            "--- Reference (i)"
        )
        assert ast.print() == expected

    def test_predicate_function(self):
        """Test predicate function."""
        parser = Parser()
        ast = parser.parse("RETURN sum(n in [1, 2, 3] | n where n > 1)")
        expected = (
            "ASTNode\n"
            "- Return\n"
            "-- Expression\n"
            "--- PredicateFunction (sum)\n"
            "---- Reference (n)\n"
            "---- Expression\n"
            "----- JSONArray\n"
            "------ Expression\n"
            "------- Number (1)\n"
            "------ Expression\n"
            "------- Number (2)\n"
            "------ Expression\n"
            "------- Number (3)\n"
            "---- Expression\n"
            "----- Reference (n)\n"
            "---- Where\n"
            "----- Expression\n"
            "------ GreaterThan\n"
            "------- Reference (n)\n"
            "------- Number (1)"
        )
        assert ast.print() == expected

    def test_case_statement(self):
        """Test case statement."""
        parser = Parser()
        ast = parser.parse("RETURN CASE WHEN 1 THEN 2 ELSE 3 END")
        expected = (
            "ASTNode\n"
            "- Return\n"
            "-- Expression\n"
            "--- Case\n"
            "---- When\n"
            "----- Expression\n"
            "------ Number (1)\n"
            "---- Then\n"
            "----- Expression\n"
            "------ Number (2)\n"
            "---- Else\n"
            "----- Expression\n"
            "------ Number (3)"
        )
        assert ast.print() == expected

    def test_functions_with_wrong_number_of_arguments(self):
        """Test functions with wrong number of arguments."""
        parser = Parser()
        with pytest.raises(Exception, match="Function range expected 2 parameters, but got 1"):
            parser.parse("RETURN range(1)")
        with pytest.raises(Exception, match="Function range expected 2 parameters, but got 3"):
            parser.parse("RETURN range(1, 2, 3)")
        with pytest.raises(Exception, match="Function avg expected 1 parameters, but got 3"):
            parser.parse("RETURN avg(1, 2, 3)")
        with pytest.raises(Exception, match="Function size expected 1 parameters, but got 2"):
            parser.parse("RETURN size(1, 2)")
        with pytest.raises(Exception, match="Function round expected 1 parameters, but got 2"):
            parser.parse("RETURN round(1, 2)")

    def test_non_well_formed_statements(self):
        """Test non-well formed statements."""
        parser = Parser()
        with pytest.raises(Exception, match="Only one RETURN statement is allowed"):
            parser.parse("return 1 return 1")
        # Note: Python implementation throws "Only one RETURN" for this case too
        with pytest.raises(Exception, match="Only one RETURN statement is allowed"):
            parser.parse("return 1 with 1 as n")

    def test_associative_array_with_backtick_string(self):
        """Test associative array with backtick string."""
        parser = Parser()
        ast = parser.parse("RETURN {`key`: `value`}")
        expected = (
            "ASTNode\n"
            "- Return\n"
            "-- Expression\n"
            "--- AssociativeArray\n"
            "---- KeyValuePair\n"
            "----- String (key)\n"
            "----- Expression\n"
            "------ Reference (value)"
        )
        assert ast.print() == expected

    def test_limit(self):
        """Test limit."""
        parser = Parser()
        ast = parser.parse("unwind range(1, 10) as n limit 5 return n")
        expected = (
            "ASTNode\n"
            "- Unwind\n"
            "-- Expression (n)\n"
            "--- Function (range)\n"
            "---- Expression\n"
            "----- Number (1)\n"
            "---- Expression\n"
            "----- Number (10)\n"
            "- Limit\n"
            "- Return\n"
            "-- Expression (n)\n"
            "--- Reference (n)"
        )
        assert ast.print() == expected

    def test_return_negative_number(self):
        """Test return -2."""
        parser = Parser()
        ast = parser.parse("return -2")
        expected = (
            "ASTNode\n"
            "- Return\n"
            "-- Expression\n"
            "--- Number (-2)"
        )
        assert ast.print() == expected

    def test_call_operation(self):
        """Test call operation."""
        parser = Parser()
        ast = parser.parse("CALL test() YIELD result RETURN result")
        expected = (
            "ASTNode\n"
            "- Call\n"
            "-- Expression (result)\n"
            "--- Reference (result)\n"
            "- Return\n"
            "-- Expression (result)\n"
            "--- Reference (result)"
        )
        assert ast.print() == expected

    def test_f_string(self):
        """Test f-string."""
        parser = Parser()
        ast = parser.parse("with 1 as value RETURN f'Value is: {value}.'")
        expected = (
            "ASTNode\n"
            "- With\n"
            "-- Expression (value)\n"
            "--- Number (1)\n"
            "- Return\n"
            "-- Expression\n"
            "--- FString\n"
            "---- String (Value is: )\n"
            "---- Expression\n"
            "----- Reference (value)\n"
            "---- String (.)"
        )
        assert ast.print() == expected

    def test_not_equal_operator(self):
        """Test not equal operator."""
        parser = Parser()
        ast = parser.parse("RETURN 1 <> 2")
        expected = (
            "ASTNode\n"
            "- Return\n"
            "-- Expression\n"
            "--- NotEquals\n"
            "---- Number (1)\n"
            "---- Number (2)"
        )
        assert ast.print() == expected

    def test_equal_operator(self):
        """Test equal operator."""
        parser = Parser()
        ast = parser.parse("RETURN 1 = 2")
        expected = (
            "ASTNode\n"
            "- Return\n"
            "-- Expression\n"
            "--- Equals\n"
            "---- Number (1)\n"
            "---- Number (2)"
        )
        assert ast.print() == expected

    def test_not_operator(self):
        """Test not operator."""
        parser = Parser()
        ast = parser.parse("RETURN NOT true")
        expected = (
            "ASTNode\n"
            "- Return\n"
            "-- Expression\n"
            "--- Not\n"
            "---- Expression\n"
            "----- Boolean"
        )
        assert ast.print() == expected

    def test_create_node_operation(self):
        """Test create node operation."""
        parser = Parser()
        ast = parser.parse(
            """
            CREATE VIRTUAL (:Person) AS {
                unwind range(1, 3) AS id
                return id, f'Person {id}' AS name
            }
            """
        )
        expected = (
            "ASTNode\n"
            "- CreateNode"
        )
        assert ast.print() == expected

    def test_match_operation(self):
        """Test match operation."""
        parser = Parser()
        ast = parser.parse("MATCH (n:Person) RETURN n")
        expected = (
            "ASTNode\n"
            "- Match\n"
            "- Return\n"
            "-- Expression (n)\n"
            "--- Reference (n)"
        )
        assert ast.print() == expected

    def test_create_relationship_operation(self):
        """Test create relationship operation."""
        parser = Parser()
        ast = parser.parse(
            """
            CREATE VIRTUAL (:Person)-[:KNOWS]-(:Person) AS {
                unwind [
                    {from_id: 1, to_id: 2, since: '2020-01-01'},
                    {from_id: 2, to_id: 3, since: '2021-01-01'}
                ] AS pair
                return pair.from_id AS left_id, pair.to_id AS right_id
            }
            """
        )
        expected = (
            "ASTNode\n"
            "- CreateRelationship"
        )
        assert ast.print() == expected

    def test_match_with_graph_pattern_including_relationships(self):
        """Test match with graph pattern including relationships."""
        parser = Parser()
        ast = parser.parse("MATCH (a:Person)-[:KNOWS]->(b:Person) RETURN a, b")
        expected = (
            "ASTNode\n"
            "- Match\n"
            "- Return\n"
            "-- Expression (a)\n"
            "--- Reference (a)\n"
            "-- Expression (b)\n"
            "--- Reference (b)"
        )
        assert ast.print() == expected

    def test_parse_relationship_with_hops(self):
        """Test parse relationship with hops."""
        parser = Parser()
        ast = parser.parse("MATCH (a:Test)-[:KNOWS*1..3]->(b:Test) RETURN a, b")
        expected = (
            "ASTNode\n"
            "- Match\n"
            "- Return\n"
            "-- Expression (a)\n"
            "--- Reference (a)\n"
            "-- Expression (b)\n"
            "--- Reference (b)"
        )
        assert ast.print() == expected

    def test_parse_statement_with_graph_pattern_in_where_clause(self):
        """Test parse statement with graph pattern in where clause."""
        parser = Parser()
        ast = parser.parse("MATCH (a:Person) WHERE (a)-[:KNOWS]->(:Person) RETURN a")
        expected = (
            "ASTNode\n"
            "- Match\n"
            "- Where\n"
            "-- Expression\n"
            "--- PatternExpression\n"
            "---- NodeReference\n"
            "---- Relationship\n"
            "---- Node\n"
            "- Return\n"
            "-- Expression (a)\n"
            "--- Reference (a)"
        )
        assert ast.print() == expected

    def test_check_pattern_expression_without_noderef(self):
        """Test check pattern expression without NodeReference."""
        parser = Parser()
        with pytest.raises(Exception, match="PatternExpression must contain at least one NodeReference"):
            parser.parse("MATCH (a:Person) WHERE (:Person)-[:KNOWS]->(:Person) RETURN a")

    def test_node_with_properties(self):
        """Test node with properties."""
        parser = Parser()
        ast = parser.parse("MATCH (a:Person{value: 'hello'}) return a")
        expected = (
            "ASTNode\n"
            "- Match\n"
            "- Return\n"
            "-- Expression (a)\n"
            "--- Reference (a)"
        )
        assert ast.print() == expected
        match_op = ast.first_child()
        assert isinstance(match_op, Match)
        node = match_op.patterns[0].chain[0]
        assert isinstance(node, Node)
        assert node.properties.get("value") is not None
        assert node.properties["value"].value() == "hello"

    def test_relationship_with_properties(self):
        """Test relationship with properties."""
        parser = Parser()
        ast = parser.parse("MATCH (:Person)-[r:LIKES{since: 2022}]->(:Food) return a")
        expected = (
            "ASTNode\n"
            "- Match\n"
            "- Return\n"
            "-- Expression (a)\n"
            "--- Reference (a)"
        )
        assert ast.print() == expected
        match_op = ast.first_child()
        assert isinstance(match_op, Match)
        relationship = match_op.patterns[0].chain[1]
        assert isinstance(relationship, Relationship)
        assert relationship.properties.get("since") is not None
        assert relationship.properties["since"].value() == 2022

    def test_case_statement_with_keywords_as_identifiers(self):
        """Test that CASE/WHEN/THEN/ELSE/END are not treated as identifiers."""
        parser = Parser()
        ast = parser.parse("RETURN CASE WHEN 1 THEN 2 ELSE 3 END")
        assert "Case" in ast.print()
        assert "When" in ast.print()
        assert "Then" in ast.print()
        assert "Else" in ast.print()
