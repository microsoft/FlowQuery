"""Tests for the FlowQuery extensibility API."""

import pytest
from typing import TypedDict, Optional, List, Any
from flowquery.parsing.functions.function import Function
from flowquery.parsing.functions.aggregate_function import AggregateFunction
from flowquery.parsing.functions.async_function import AsyncFunction
from flowquery.parsing.functions.predicate_function import PredicateFunction
from flowquery.parsing.functions.reducer_element import ReducerElement
from flowquery.parsing.functions.function_metadata import (
    FunctionDef,
    FunctionMetadata,
    FunctionCategory,
    ParameterSchema,
    OutputSchema,
    FunctionDefOptions,
    get_function_metadata,
    get_registered_function_factory,
)


class TestExtensibilityExports:
    """Test cases for the extensibility API."""

    def test_function_class_can_be_extended(self):
        """Function class is exported and can be extended."""
        class CustomFunction(Function):
            def __init__(self):
                super().__init__("customFunc")
                self._expected_parameter_count = 1

            def value(self) -> str:
                return "custom value"

        func = CustomFunction()
        assert func.name == "customFunc"
        assert str(func) == "Function (customFunc)"
        assert func.value() == "custom value"

    def test_function_validates_parameter_count(self):
        """Function validates parameter count when set."""
        class TwoParamFunction(Function):
            def __init__(self):
                super().__init__("twoParam")
                self._expected_parameter_count = 2

        func = TwoParamFunction()

        # Should throw when wrong number of parameters
        with pytest.raises(ValueError, match="Function twoParam expected 2 parameters, but got 0"):
            func.parameters = []

    def test_function_without_expected_count_accepts_any(self):
        """Function without expected parameter count accepts any number."""
        class FlexibleFunction(Function):
            def __init__(self):
                super().__init__("flexible")
                # _expected_parameter_count is None by default

        func = FlexibleFunction()
        # Should not throw
        func.parameters = []
        assert len(func.get_children()) == 0


class TestAggregateFunctionExtension:
    """Test cases for AggregateFunction extension."""

    def test_aggregate_function_can_be_extended(self):
        """AggregateFunction class is exported and can be extended."""
        class SumElement(ReducerElement):
            def __init__(self):
                self._value: float = 0

            @property
            def value(self) -> float:
                return self._value

            @value.setter
            def value(self, v: float) -> None:
                self._value = v

        class CustomSum(AggregateFunction):
            def __init__(self):
                super().__init__("customSum")
                self._total: float = 0

            def reduce(self, element: ReducerElement) -> None:
                self._total += element.value

            def element(self) -> ReducerElement:
                el = SumElement()
                el.value = self._total
                return el

            def value(self) -> float:
                return self._total

        func = CustomSum()
        assert func.name == "customSum"


class TestFunctionDefDecorator:
    """Test cases for the FunctionDef decorator."""

    def test_function_def_decorator_registers_metadata(self):
        """FunctionDef decorator registers function metadata."""
        @FunctionDef({
            "description": "Test function for unit testing",
            "category": "scalar",
            "parameters": [
                {"name": "value", "description": "Input value", "type": "any"}
            ],
            "output": {"description": "Result", "type": "any"},
            "examples": ["WITH test(1) AS x RETURN x"]
        })
        class TestFunction(Function):
            def __init__(self):
                super().__init__("testFunc")
                self._expected_parameter_count = 1

            def value(self):
                return self.get_children()[0].value()

        # Get the registered metadata using the function name (as registered by @FunctionDef)
        metadata = get_function_metadata("testFunc", "scalar")
        assert metadata is not None
        assert metadata.description == "Test function for unit testing"
        assert metadata.category == "scalar"
        assert len(metadata.parameters) == 1
        assert metadata.parameters[0]["name"] == "value"

    def test_function_def_decorator_for_aggregate_function(self):
        """FunctionDef decorator can be applied to an aggregate function."""
        @FunctionDef({
            "description": "Test aggregate function",
            "category": "aggregate",
            "parameters": [{"name": "value", "description": "Numeric value", "type": "number"}],
            "output": {"description": "Aggregated result", "type": "number"},
        })
        class TestAggExt(AggregateFunction):
            def __init__(self):
                super().__init__("testAggExt")
                self._sum = 0

            def value(self):
                return self._sum

        instance = TestAggExt()
        assert instance.name == "testAggExt"
        assert instance.value() == 0

    def test_function_def_decorator_for_predicate_function(self):
        """FunctionDef decorator can be applied to a predicate function."""
        @FunctionDef({
            "description": "Test predicate function",
            "category": "predicate",
            "parameters": [{"name": "list", "description": "List to check", "type": "array"}],
            "output": {"description": "Boolean result", "type": "boolean"},
        })
        class TestPredExt(PredicateFunction):
            def __init__(self):
                super().__init__("testPredExt")

            def value(self):
                return True

        instance = TestPredExt()
        assert instance.name == "testPredExt"
        assert instance.value() is True

    @pytest.mark.asyncio
    async def test_function_def_decorator_for_async_provider(self):
        """FunctionDef decorator can be applied to an async provider."""
        from flowquery.parsing.functions.function_metadata import (
            get_function_metadata,
            get_registered_function_factory,
        )

        @FunctionDef({
            "description": "Test async provider for extensibility",
            "category": "async",
            "parameters": [
                {
                    "name": "count",
                    "description": "Number of items",
                    "type": "number",
                    "required": False,
                    "default": 1,
                },
            ],
            "output": {"description": "Data object", "type": "object"},
        })
        class Simple(AsyncFunction):
            async def generate(self, count: int = 1):
                for i in range(count):
                    yield {"id": i, "data": f"item{i}"}

        # Verify the decorated class still works correctly
        loader = Simple("simple")
        results = []
        async for item in loader.generate(2):
            results.append(item)
        assert len(results) == 2
        assert results[0] == {"id": 0, "data": "item0"}
        assert results[1] == {"id": 1, "data": "item1"}

        # Verify the async provider was registered (using class name)
        provider = get_registered_function_factory("simple", "async")
        assert provider is not None
        assert callable(provider)

        # Verify the metadata was registered
        metadata = get_function_metadata("simple", "async")
        assert metadata is not None
        assert metadata.name == "simple"
        assert metadata.category == "async"
        assert metadata.description == "Test async provider for extensibility"


class TestPredicateFunctionExtension:
    """Test cases for PredicateFunction extension."""

    def test_predicate_function_can_be_extended(self):
        """PredicateFunction class is exported and can be extended."""
        class CustomPredicate(PredicateFunction):
            def __init__(self):
                super().__init__("customPredicate")

            def value(self):
                return True

        pred = CustomPredicate()
        assert pred.name == "customPredicate"
        assert str(pred) == "PredicateFunction (customPredicate)"
        assert pred.value() is True


class TestAsyncFunctionExtension:
    """Test cases for AsyncFunction extension."""

    def test_async_function_can_be_instantiated(self):
        """AsyncFunction class is exported and can be instantiated."""
        async_func = AsyncFunction("testAsync")
        assert async_func.name == "testAsync"


class TestReducerElementExtension:
    """Test cases for ReducerElement extension."""

    def test_reducer_element_can_be_extended(self):
        """ReducerElement class is exported and can be extended."""
        class NumberElement(ReducerElement):
            def __init__(self):
                self._num = 0

            @property
            def value(self):
                return self._num

            @value.setter
            def value(self, v):
                self._num = v

        elem = NumberElement()
        elem.value = 42
        assert elem.value == 42


class TestTypeExports:
    """Test cases for type exports."""

    def test_function_metadata_type(self):
        """FunctionMetadata type can be used."""
        meta = FunctionMetadata(
            name="typeTest",
            description="Testing type exports",
            category="scalar",
            parameters=[],
            output={"description": "Output", "type": "string"},
        )
        assert meta.name == "typeTest"
        assert meta.description == "Testing type exports"

    def test_function_category_accepts_standard_and_custom(self):
        """FunctionCategory type accepts standard and custom categories."""
        scalar: FunctionCategory = "scalar"
        aggregate: FunctionCategory = "aggregate"
        predicate: FunctionCategory = "predicate"
        async_cat: FunctionCategory = "async"
        custom: FunctionCategory = "myCustomCategory"

        assert scalar == "scalar"
        assert aggregate == "aggregate"
        assert predicate == "predicate"
        assert async_cat == "async"
        assert custom == "myCustomCategory"


class TestPluginFunctionsIntegration:
    """Test cases for plugin functions integration with FlowQuery."""

    @pytest.mark.asyncio
    async def test_custom_scalar_function_in_query(self):
        """Custom scalar function can be used in a FlowQuery statement."""
        from flowquery.compute.runner import Runner

        @FunctionDef({
            "description": "Doubles a number",
            "category": "scalar",
            "parameters": [{"name": "value", "description": "Number to double", "type": "number"}],
            "output": {"description": "Doubled value", "type": "number"},
        })
        class Double(Function):
            def __init__(self):
                super().__init__("double")
                self._expected_parameter_count = 1

            def value(self):
                return self.get_children()[0].value() * 2

        runner = Runner("WITH 5 AS num RETURN double(num) AS result")
        await runner.run()

        assert len(runner.results) == 1
        assert runner.results[0] == {"result": 10}

    @pytest.mark.asyncio
    async def test_custom_string_function_in_query(self):
        """Custom string function can be used in a FlowQuery statement."""
        from flowquery.compute.runner import Runner

        @FunctionDef({
            "description": "Reverses a string",
            "category": "scalar",
            "parameters": [{"name": "text", "description": "String to reverse", "type": "string"}],
            "output": {"description": "Reversed string", "type": "string"},
        })
        class StrReverse(Function):
            def __init__(self):
                super().__init__("strreverse")
                self._expected_parameter_count = 1

            def value(self):
                input_str = str(self.get_children()[0].value())
                return input_str[::-1]

        runner = Runner("WITH 'hello' AS s RETURN strreverse(s) AS reversed")
        await runner.run()

        assert len(runner.results) == 1
        assert runner.results[0] == {"reversed": "olleh"}

    @pytest.mark.asyncio
    async def test_custom_function_with_expressions(self):
        """Custom function works with expressions and other functions."""
        from flowquery.compute.runner import Runner

        @FunctionDef({
            "description": "Adds 100 to a number",
            "category": "scalar",
            "parameters": [{"name": "value", "description": "Number", "type": "number"}],
            "output": {"description": "Number plus 100", "type": "number"},
        })
        class AddHundred(Function):
            def __init__(self):
                super().__init__("addhundred")
                self._expected_parameter_count = 1

            def value(self):
                return self.get_children()[0].value() + 100

        runner = Runner("WITH 5 * 3 AS num RETURN addhundred(num) + 1 AS result")
        await runner.run()

        assert len(runner.results) == 1
        assert runner.results[0] == {"result": 116}  # (5*3) + 100 + 1 = 116

    @pytest.mark.asyncio
    async def test_multiple_custom_functions_together(self):
        """Multiple custom functions can be used together."""
        from flowquery.compute.runner import Runner

        @FunctionDef({
            "description": "Triples a number",
            "category": "scalar",
            "parameters": [{"name": "value", "description": "Number to triple", "type": "number"}],
            "output": {"description": "Tripled value", "type": "number"},
        })
        class Triple(Function):
            def __init__(self):
                super().__init__("triple")
                self._expected_parameter_count = 1

            def value(self):
                return self.get_children()[0].value() * 3

        @FunctionDef({
            "description": "Squares a number",
            "category": "scalar",
            "parameters": [{"name": "value", "description": "Number to square", "type": "number"}],
            "output": {"description": "Squared value", "type": "number"},
        })
        class Square(Function):
            def __init__(self):
                super().__init__("square")
                self._expected_parameter_count = 1

            def value(self):
                v = self.get_children()[0].value()
                return v * v

        runner = Runner("WITH 2 AS num RETURN triple(num) AS tripled, square(num) AS squared")
        await runner.run()

        assert len(runner.results) == 1
        assert runner.results[0] == {"tripled": 6, "squared": 4}

    @pytest.mark.asyncio
    async def test_custom_aggregate_function_in_query(self):
        """Custom aggregate function can be used in a FlowQuery statement."""
        from flowquery.compute.runner import Runner

        # Custom reducer element for MinValue
        class MinReducerElement(ReducerElement):
            def __init__(self):
                self._value = None

            @property
            def value(self):
                return self._value

            @value.setter
            def value(self, val):
                self._value = val

        @FunctionDef({
            "description": "Collects the minimum value",
            "category": "aggregate",
            "parameters": [{"name": "value", "description": "Value to compare", "type": "number"}],
            "output": {"description": "Minimum value", "type": "number"},
        })
        class MinValue(AggregateFunction):
            def __init__(self):
                super().__init__("minvalue")
                self._expected_parameter_count = 1

            def reduce(self, element):
                current = self.first_child().value()
                if element.value is None or current < element.value:
                    element.value = current

            def element(self):
                return MinReducerElement()

        runner = Runner("unwind [5, 2, 8, 1, 9] AS num RETURN minvalue(num) AS min")
        await runner.run()

        assert len(runner.results) == 1
        assert runner.results[0] == {"min": 1}

    @pytest.mark.asyncio
    async def test_custom_async_provider_in_load_json_from_statement(self):
        """Custom async provider can be used in LOAD JSON FROM statement."""
        from flowquery.compute.runner import Runner

        @FunctionDef({
            "description": "Provides example data for testing",
            "category": "async",
            "parameters": [],
            "output": {"description": "Example data object", "type": "object"},
        })
        class _GetExampleData(AsyncFunction):
            def __init__(self):
                super().__init__("getexampledata")
                self._expected_parameter_count = 0

            async def generate(self):
                yield {"id": 1, "name": "Alice"}
                yield {"id": 2, "name": "Bob"}

        runner = Runner("LOAD JSON FROM getexampledata() AS data RETURN data.id AS id, data.name AS name")
        await runner.run()

        assert len(runner.results) == 2
        assert runner.results[0] == {"id": 1, "name": "Alice"}
        assert runner.results[1] == {"id": 2, "name": "Bob"}

    @pytest.mark.asyncio
    async def test_function_names_are_case_insensitive(self):
        """Function names are case-insensitive."""
        from flowquery.compute.runner import Runner

        @FunctionDef({
            "description": "Test function for case insensitivity",
            "category": "async",
            "parameters": [],
            "output": {"description": "Test data", "type": "object"},
        })
        class _MixedCaseFunc(AsyncFunction):
            def __init__(self):
                super().__init__("mixedcasefunc")
                self._expected_parameter_count = 0

            async def generate(self):
                yield {"value": 42}

        # Test using different casings in FlowQuery statements
        runner1 = Runner("LOAD JSON FROM mixedcasefunc() AS d RETURN d.value AS v")
        await runner1.run()
        assert runner1.results[0] == {"v": 42}

        runner2 = Runner("LOAD JSON FROM MIXEDCASEFUNC() AS d RETURN d.value AS v")
        await runner2.run()
        assert runner2.results[0] == {"v": 42}

    def test_parameter_schema_type_can_be_used(self):
        """ParameterSchema type can be used."""
        param: ParameterSchema = {
            "name": "testParam",
            "description": "A test parameter",
            "type": "string",
            "required": True,
            "default": "default value",
            "example": "example value",
        }

        assert param["name"] == "testParam"
        assert param["required"] is True

    def test_parameter_schema_with_nested_types(self):
        """ParameterSchema with nested types."""
        array_param: ParameterSchema = {
            "name": "items",
            "description": "Array of items",
            "type": "array",
        }

        object_param: ParameterSchema = {
            "name": "config",
            "description": "Configuration object",
            "type": "object",
        }

        assert array_param["type"] == "array"
        assert object_param["type"] == "object"

    def test_output_schema_type_can_be_used(self):
        """OutputSchema type can be used."""
        output: OutputSchema = {
            "description": "Result output",
            "type": "object",
            "example": {"success": True, "data": []},
        }

        assert output["type"] == "object"
        assert output["example"]["success"] is True

    def test_function_def_options_type_can_be_used(self):
        """FunctionDefOptions type can be used."""
        options: FunctionDefOptions = {
            "description": "Function options test",
            "category": "scalar",
            "parameters": [],
            "output": {"description": "Output", "type": "string"},
            "notes": "Some additional notes",
        }

        assert options["description"] == "Function options test"
        assert options["notes"] == "Some additional notes"

    @pytest.mark.asyncio
    async def test_custom_function_retrieved_via_functions(self):
        """Custom function can be retrieved via functions() in a FlowQuery statement."""
        from flowquery.extensibility import FunctionDef
        from flowquery.parsing.functions.function import Function
        from flowquery.parsing.functions.function_metadata import get_function_metadata
        from flowquery.compute.runner import Runner

        @FunctionDef({
            "description": "A unique test function for introspection",
            "category": "scalar",
            "parameters": [{"name": "x", "description": "Input value", "type": "number"}],
            "output": {"description": "Output value", "type": "number"},
        })
        class IntrospectTestFunc(Function):
            def __init__(self):
                super().__init__("introspectTestFunc")
                self._expected_parameter_count = 1

            def value(self):
                return self.get_children()[0].value() + 42

        # First verify the function is registered
        metadata = get_function_metadata("introspectTestFunc")
        assert metadata is not None
        assert metadata.name == "introspecttestfunc"

        # Use functions() with UNWIND to find the registered function
        runner = Runner("""
            WITH functions() AS funcs
            UNWIND funcs AS f
            WITH f WHERE f.name = 'introspecttestfunc'
            RETURN f.name AS name, f.description AS description, f.category AS category
        """)
        await runner.run()

        assert len(runner.results) == 1
        assert runner.results[0]["name"] == "introspecttestfunc"
        assert runner.results[0]["description"] == "A unique test function for introspection"
        assert runner.results[0]["category"] == "scalar"
