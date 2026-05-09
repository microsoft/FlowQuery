# FlowQuery (Python)

A pure Python implementation of [FlowQuery](../README.md), a declarative OpenCypher-based query language for virtual graphs and data processing pipelines. This package has full functional fidelity with the TypeScript version.

## Installation

```bash
pip install flowquery
```

## Quick Start

### Command Line Interface

Start the interactive REPL:

```bash
flowquery
```

### Programmatic Usage

```python
import asyncio
from flowquery import Runner

runner = Runner("WITH 1 as x RETURN x + 1 as result")
asyncio.run(runner.run())
print(runner.results)  # [{'result': 2}]
```

In Jupyter notebooks, you can use `await` directly:

```python
from flowquery import Runner

runner = Runner("WITH 1 as x RETURN x + 1 as result")
await runner.run()
print(runner.results)  # [{'result': 2}]
```

### Statement Info: Labels, Properties, and Source Lineage

The `Runner` exposes a `metadata` property that mirrors the TypeScript
implementation. It reports counts of virtual nodes and relationships
created/deleted plus an optional `info: StatementInfo` describing the
_structure_ the query touches — independent of execution.

`StatementInfo` captures the node labels and relationship types referenced,
the data sources backing the underlying virtual definitions, and the
node/relationship properties accessed by the query (e.g. `n.name`, not the
columns produced by the virtual definition's inner sub-query). The
per-entity `nodes` and `relationships` maps give end-to-end lineage from a
property to its data source:

```python
from flowquery import Runner

runner = Runner("""
    CREATE VIRTUAL (:City) AS {
        LOAD JSON FROM "https://example.com/cities" AS c
        RETURN c.id AS id, c.name AS name
    };
    CREATE VIRTUAL (:City)-[:FLIGHT]-(:City) AS {
        LOAD JSON FROM "https://example.com/flights" AS f
        RETURN f.left_id AS left_id, f.right_id AS right_id, f.airline AS airline
    };
    MATCH (a:City)-[r:FLIGHT]->(b:City)
    RETURN a.name AS origin, b.name AS destination, r.airline AS airline
""")
info = runner.metadata.info
print(info.nodes)
# {'City': NodeInfo(properties=['name'], sources=['https://example.com/cities'])}
print(info.relationships)
# {'FLIGHT': RelationshipInfo(properties=['airline'], sources=['https://example.com/flights'])}
print(info.sources)
# ['https://example.com/cities', 'https://example.com/flights']
```

`StatementInfo` resolves sources for **any** virtual the query touches —
both inline `CREATE VIRTUAL` clauses and previously-registered virtuals
reached via `MATCH` or `DELETE`. The flat `node_labels`,
`relationship_types`, `sources`, `node_properties`, and
`relationship_properties` fields stay in sync with the per-entity `nodes`
and `relationships` maps.

The same `StatementInfoCrawler` can be used directly on any parsed AST
without going through a `Runner`:

```python
from flowquery import StatementInfoCrawler
crawler = StatementInfoCrawler()
info = crawler.crawl(parsed_ast)
```

## Documentation

- [Language Reference](https://github.com/microsoft/FlowQuery#language-reference) (clauses, expressions, functions, graph operations, and more)
- [Quick Cheat Sheet](https://github.com/microsoft/FlowQuery#quick-cheat-sheet)
- [Full Documentation](https://github.com/microsoft/FlowQuery)
- [Contributing Guide](https://github.com/microsoft/FlowQuery/blob/main/flowquery-py/CONTRIBUTING.md)
- [Virtual Graph Demo Notebook](notebooks/TestFlowQuery.ipynb) — a demo of virtual graph capabilities and custom function extensibility

## Extending FlowQuery with Custom Functions

The query language itself is identical between the TypeScript and Python versions. The only difference is that custom functions are written in Python here instead of TypeScript.

### Creating a Custom Scalar Function

Scalar functions operate on individual values and return a result:

```python
from flowquery.extensibility import Function, FunctionDef

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
```

Once defined, use it in your queries:

```cypher
WITH 5 AS num RETURN double(num) AS result
// Returns: [{"result": 10}]
```

### Creating a Custom String Function

```python
from flowquery.extensibility import Function, FunctionDef

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

    def value(self) -> str:
        return str(self.get_children()[0].value())[::-1]
```

Usage:

```cypher
WITH 'hello' AS s RETURN strreverse(s) AS reversed
// Returns: [{"reversed": "olleh"}]
```

### Creating a Custom Aggregate Function

Aggregate functions process multiple values and return a single result. They require a `ReducerElement` to track state:

```python
from flowquery.extensibility import AggregateFunction, FunctionDef, ReducerElement

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
```

Usage:

```cypher
UNWIND [5, 2, 8, 1, 9] AS num RETURN minvalue(num) AS min
// Returns: [{"min": 1}]
```

### Creating a Custom Async Data Provider

Async providers allow you to create custom data sources that can be used with `LOAD JSON FROM`:

```python
from flowquery.extensibility import AsyncFunction, FunctionDef

@FunctionDef({
    "description": "Provides example data for testing",
    "category": "async",
    "parameters": [],
    "output": {"description": "Example data object", "type": "object"},
})
class GetExampleData(AsyncFunction):
    def __init__(self):
        super().__init__("getexampledata")
        self._expected_parameter_count = 0

    async def generate(self):
        yield {"id": 1, "name": "Alice"}
        yield {"id": 2, "name": "Bob"}
```

Usage:

```cypher
LOAD JSON FROM getexampledata() AS data RETURN data.id AS id, data.name AS name
// Returns: [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]
```

### Using Custom Functions with Expressions

Custom functions integrate seamlessly with FlowQuery expressions and can be combined with other functions:

```cypher
// Using custom function with expressions
WITH 5 * 3 AS num RETURN addhundred(num) + 1 AS result

// Using multiple custom functions together
WITH 2 AS num RETURN triple(num) AS tripled, square(num) AS squared
```

### Introspecting Registered Functions

You can use the built-in `functions()` function to discover registered functions including your custom ones:

```cypher
WITH functions() AS funcs
UNWIND funcs AS f
WITH f WHERE f.name = 'double'
RETURN f.name AS name, f.description AS description, f.category AS category
```

## License

MIT License - see [LICENSE](https://github.com/microsoft/FlowQuery/blob/main/LICENSE) for details.

## Links

- [Homepage](https://github.com/microsoft/FlowQuery)
- [Repository](https://github.com/microsoft/FlowQuery)
- [Issues](https://github.com/microsoft/FlowQuery/issues)
