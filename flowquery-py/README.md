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
_structure_ the query touches - independent of execution.

`StatementInfo` captures:

- The node labels and relationship types referenced.
- The data sources backing the underlying virtual definitions.
- The node/relationship properties **consumed** by the query -
  `alias.prop` accesses anywhere in `MATCH`, `WHERE`, `WITH`, `RETURN`,
  `ORDER BY`, or function arguments, plus inline pattern properties
  like `(u:User {id: 'rick.o'})`.
- The properties **declared** by each virtual's `RETURN` clause via
  `info.declared`, so you can validate that a query references only
  declared properties.
- Literal values supplied for properties at the call site via
  `info.nodes[label].literal_values` - collected from inline pattern
  properties and from equality / `IN` predicates such as
  `WHERE u.id = 'rick.o'` or `WHERE u.id IN ['a', 'b']`.

The per-entity `nodes` and `relationships` maps give end-to-end lineage
from a property to its data source:

```python
from flowquery import Runner

runner = Runner("""
    CREATE VIRTUAL (:City) AS {
        LOAD JSON FROM "https://example.com/cities" AS c
        RETURN c.id AS id, c.name AS name, c.country AS country
    };
    CREATE VIRTUAL (:City)-[:FLIGHT]-(:City) AS {
        LOAD JSON FROM "https://example.com/flights" AS f
        RETURN f.left_id AS left_id, f.right_id AS right_id, f.airline AS airline
    };
    MATCH (a:City {name: 'NYC'})-[r:FLIGHT]->(b:City)
    WHERE b.country IN ['US', 'CA']
    RETURN a.name AS origin, b.name AS destination, r.airline AS airline
""")
info = runner.metadata.info

print(info.nodes)
# {'City': NodeInfo(
#     properties=['country', 'name'],
#     sources=['https://example.com/cities'],
#     literal_values={'country': ['US', 'CA'], 'name': ['NYC']},
# )}
print(info.relationships)
# {'FLIGHT': RelationshipInfo(
#     properties=['airline'],
#     sources=['https://example.com/flights'],
#     literal_values={},
# )}
print(info.declared.nodes['City'])
# DeclaredEntityInfo(
#     properties=['country', 'id', 'name'],
#     sources=['https://example.com/cities'],
# )
print(info.sources)
# ['https://example.com/cities', 'https://example.com/flights']
```

`StatementInfo` resolves sources and declared schemas for **any** virtual
the query touches - both inline `CREATE VIRTUAL` clauses and
previously-registered virtuals reached via `MATCH` or `DELETE`. The flat
`node_labels`, `relationship_types`, `sources`, `node_properties`, and
`relationship_properties` fields stay in sync with the per-entity `nodes`
and `relationships` maps. Only purely literal AST subtrees end up in
`literal_values` - values that depend on parameters, references,
f-strings, or subqueries are skipped.

The same `StatementInfoCrawler` can be used directly on any parsed AST
without going through a `Runner`:

```python
from flowquery import StatementInfoCrawler
crawler = StatementInfoCrawler()
info = crawler.crawl(parsed_ast)
```

## Lineage and Provenance

FlowQuery exposes two complementary lineage APIs that combine to trace
every result cell back to the records, properties, and data sources
that produced it.

### Statement Info (always on)

`Runner.metadata.info` returns a `StatementInfo` snapshot derived from
the parsed AST. It lists the labels and types touched by the
statement, the properties read off each, the upstream data sources
(URLs, file URIs, async function names, `let://` references), any
literal property filters present in `WHERE`, and per-output-column
lineage in `info.returns`:

```python
from flowquery import Runner

runner = Runner("""
    MATCH (c:City)
    WHERE c.country = 'US'
    RETURN c.name AS origin, c.country AS region
""")
info = runner.metadata.info
print(info.node_labels)              # ['City']
print(info.node_properties)          # {'City': ['country', 'name']}
print(info.nodes['City'].literal_values)  # {'country': ['US']}
print(info.returns['origin'].kind)   # 'property'
print(info.returns['origin'].references[0].alias)     # 'c'
print(info.returns['origin'].references[0].property)  # 'name'
```

`info.returns` is keyed by output column name and describes how each
column was computed (`literal`, `property`, `expression`, or
`aggregate`) plus every `alias.property` access that fed it.

### Row-Level Provenance (opt in)

Pass `RunnerOptions(provenance=True)` to capture per-row lineage in
`runner.provenance`, aligned by index with `runner.results`:

```python
from flowquery import Runner, RunnerOptions

runner = Runner(
    "MATCH (a:City {name: 'New York'})-[r:FLIGHT]->(b:City) "
    "RETURN a.name AS origin, b.name AS destination",
    options=RunnerOptions(provenance=True),
)
await runner.run()

for row, prov in zip(runner.results, runner.provenance):
    print(row, "<-", [n.id for n in prov.nodes])
    for rel in prov.relationships:
        print(" ", rel.type, rel.path)  # full node-id path
```

Each `RowProvenance` carries the `NodeBinding`s and
`RelationshipBinding`s active when the row was projected. Hops carry
the matched relationship properties; nodes carry the matched node
properties. For aggregate rows, `prov.rows` lists one
`RowSegment` per contributing input row so `collect()`-style outputs
align positionally with their lineage.

### `trace_row(i)` and `lineage()`

`Runner.trace_row(i)` and `Runner.lineage()` bundle the structural
column lineage with the runtime row provenance:

```python
runner = Runner(
    "MATCH (c:City) WHERE c.country = 'US' RETURN c.name AS origin",
    options=RunnerOptions(provenance=True),
)
await runner.run()

trace = runner.trace_row(0)
print(trace['origin'].value)                          # 'New York'
print(trace['origin'].lineage.kind)                   # 'property'
print(trace['origin'].bindings[0].node.id)            # 'nyc'
print(trace['origin'].bindings[0].value)              # 'New York'

report = runner.lineage()
# report.columns -> column lineage map (deep copy of info.returns)
# report.rows    -> per-row {column: CellTrace} maps
```

For aggregate columns (e.g. `collect(c.id)`), `bindings` lists one
entry per contributing input row, paired with the matched value at
that row.

### Threading Lineage Through Virtual Sub-Queries

When a `MATCH` reads from a `CREATE VIRTUAL` definition, the inner
sub-query is itself executed with provenance, and the resulting
`RowProvenance` is threaded onto the outer binding's `source` field:

```python
await Runner("""
    CREATE VIRTUAL (:DerivedCity) AS {
        MATCH (s:SrcCity) WHERE s.country = 'US' RETURN s.id AS id
    }
""").run()

runner = Runner(
    "MATCH (d:DerivedCity) RETURN d.id AS id",
    options=RunnerOptions(provenance=True),
)
await runner.run()

d = runner.provenance[0].nodes[0]    # outer NodeBinding
inner = d.source                      # inner RowProvenance
print(inner.nodes[0].alias, inner.nodes[0].id)  # 's', 'nyc'
```

Recursion is unbounded: a virtual built atop another virtual produces
nested `source` chains all the way down.

### Data Sources and `LET` Chaining

`LOAD JSON FROM <url>` operations add a `DataSourceBinding` to the
row's provenance segment. When the `LOAD` reads from a `LET`-bound
sub-query, the binding's `source` is `let://<name>` and
`source_provenance` carries the inner `LET` provenance, which in
turn lists its own `data_sources`:

```python
await Runner('LET cities = { LOAD JSON FROM "file://..." AS c '
             'RETURN c.id AS id, c.name AS name }').run()
await Runner("""
    CREATE VIRTUAL (:Mirror) AS {
        LOAD JSON FROM cities AS c RETURN c.id AS id, c.name AS name
    }
""").run()

runner = Runner(
    "MATCH (m:Mirror) RETURN m.name AS name",
    options=RunnerOptions(provenance=True),
)
await runner.run()

inner = runner.provenance[0].nodes[0].source
let_ds = next(d for d in inner.data_sources
              if d.source == 'let://cities')
file_ds = next(d for d in let_ds.source_provenance.data_sources
               if d.source.startswith('file://'))
```

The same chain is reflected statically in `info.sources` so callers
can introspect the upstream dependency graph without running the
query.

## Documentation

- [Language Reference](https://github.com/microsoft/FlowQuery#language-reference) (clauses, expressions, functions, graph operations, and more)
- [Quick Cheat Sheet](https://github.com/microsoft/FlowQuery#quick-cheat-sheet)
- [Full Documentation](https://github.com/microsoft/FlowQuery)
- [Contributing Guide](https://github.com/microsoft/FlowQuery/blob/main/flowquery-py/CONTRIBUTING.md)
- [Virtual Graph Demo Notebook](notebooks/TestFlowQuery.ipynb) - a demo of virtual graph capabilities and custom function extensibility

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
