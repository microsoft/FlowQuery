# FlowQuery

**Author:** Niclas Kjäll-Ohlsson

A declarative OpenCypher-based query language for virtual graphs and data processing pipelines.

FlowQuery is a declarative query language aiming to fully support OpenCypher, extended with capabilities such as **virtual graphs**, HTTP data loading, f-strings, and **custom function extensibility**. Virtual nodes and relationships are backed by sub-queries that can fetch data dynamically (e.g., from REST APIs), and FlowQuery's graph engine supports pattern matching, variable-length traversals, optional matches, relationship direction, and filter pass-down, enabling you to model and explore complex data relationships without a traditional graph database.

Beyond graphs, FlowQuery provides a full data processing pipeline language with features like `LOAD JSON FROM` for HTTP calls (GET/POST with headers), f-strings, list comprehensions, inline predicate aggregation, temporal functions, and a rich library of scalar and aggregate functions.

### Graph RAG with FlowQuery

The combination of graph querying and pipeline processing makes FlowQuery ideal for the retrieval stage of Retrieval Augmented Generation (RAG). A typical graph RAG flow works as follows:

1. **User query** — The user asks a question in natural language.
2. **Query generation** — The LLM, with knowledge of the virtual graph schema, generates a precise OpenCypher query to retrieve the grounding data needed to answer the question.
3. **Query execution** — The FlowQuery engine executes the generated OpenCypher query against the virtual graph and returns the results as grounding data.
4. **Response formulation** — The LLM formulates a final response informed by the grounding data.

```
┌──────────┐     ┌───────────────┐     ┌─────────────────┐     ┌───────────────┐
│   User   │────>│      LLM      │────>│    FlowQuery    │────>│      LLM      │
│ Question │     │ Generate Query│     │ Execute Query   │     │  Formulate    │
│          │     │ (OpenCypher)  │     │ (Virtual Graph) │     │  Response     │
└──────────┘     └───────────────┘     └─────────────────┘     └───────┬───────┘
                                                                       │
                                                                       v
                                                                 ┌──────────┐
                                                                 │  Answer  │
                                                                 └──────────┘
```

See the [Language Reference](#language-reference) and [Quick Cheat Sheet](#quick-cheat-sheet) for full syntax documentation. For a complete worked example, see [Virtual Org Chart](#virtual-org-chart).

FlowQuery is written in TypeScript and runs both in the browser and in Node.js as a self-contained single-file JavaScript library. A pure Python implementation of FlowQuery with full functional fidelity is also available in the [flowquery-py](./flowquery-py) sub-folder (`pip install flowquery`).

- Test live at <a href="https://microsoft.github.io/FlowQuery/" target="_blank">https://microsoft.github.io/FlowQuery/</a>.
- Try as a VSCode plugin from https://marketplace.visualstudio.com/items?itemName=FlowQuery.flowquery-vscode.

## Howto

- Dev: `npm start`
    - This will start a FlowQuery command line where you can run statements.
- Test: `npm test`
    - This will run all unit tests.
- Build: `npm run build` (builds for both Node and web)

## Installation & Usage

### Node.js

Install FlowQuery from npm:

```bash
npm install flowquery
```

Then use it in your code:

```javascript
const FlowQuery = require("flowquery").default;
// Or with ES modules:
// import FlowQuery from 'flowquery';

async function main() {
    const query = new FlowQuery("WITH 1 AS x RETURN x + 1");
    await query.run();
    console.log(query.results); // [ { expr0: 2 } ]
}

main();
```

### Browser

Include the minified bundle in your HTML:

```html
<script src="https://microsoft.github.io/FlowQuery/flowquery.min.js"></script>
<script>
    async function main() {
        const query = new FlowQuery("WITH 1 AS x RETURN x + 1");
        await query.run();
        console.log(query.results); // [ { expr0: 2 } ]
    }

    main();
</script>
```

Or import from the browser-specific entry point:

```javascript
import FlowQuery from "flowquery/browser";

const query = new FlowQuery('WITH "Hello" AS greeting RETURN greeting');
await query.run();
console.log(query.results);
```

### Python

Install FlowQuery from PyPI:

```bash
pip install flowquery
```

Then use it in your code:

```python
import asyncio
from flowquery import Runner

runner = Runner("WITH 1 AS x RETURN x + 1 AS result")
asyncio.run(runner.run())
print(runner.results)  # [{'result': 2}]
```

Or start the interactive REPL:

```bash
flowquery
```

See [flowquery-py](./flowquery-py) for more details, including custom function extensibility in Python.

## Language Reference

### Clauses

#### RETURN

Returns results. Expressions can be aliased with `AS`.

```cypher
RETURN 1 + 2 AS sum, 3 + 4 AS sum2
// [{ sum: 3, sum2: 7 }]
```

#### WITH

Introduces variables into scope. Works like `RETURN` but continues the pipeline.

```cypher
WITH 1 AS a RETURN a
// [{ a: 1 }]
```

#### UNWIND

Expands a list into individual rows.

```cypher
UNWIND [1, 2, 3] AS num RETURN num
// [{ num: 1 }, { num: 2 }, { num: 3 }]
```

Unwinding `null` produces zero rows.

#### LOAD JSON FROM

Fetches JSON data from a URL. Supports GET (default) and POST with headers.

```cypher
LOAD JSON FROM "https://api.example.com/data" AS data RETURN data

// With POST body and custom headers
LOAD JSON FROM 'https://api.example.com/endpoint'
HEADERS { `Content-Type`: 'application/json', Authorization: f'Bearer {token}' }
POST { key: 'value' } AS response
RETURN response
```

#### LIMIT

Restricts the number of rows. Can appear mid-pipeline or after `RETURN`.

```cypher
UNWIND range(1, 100) AS i RETURN i LIMIT 5
```

#### CALL ... YIELD

Invokes an async function and yields named fields into scope.

```cypher
CALL myAsyncFunction() YIELD result RETURN result
// If last operation, YIELD is optional
CALL myAsyncFunction()
```

#### UNION / UNION ALL

Combines results from multiple queries. `UNION` removes duplicates; `UNION ALL` keeps them. Column names must match.

```cypher
WITH 1 AS x RETURN x UNION WITH 2 AS x RETURN x
// [{ x: 1 }, { x: 2 }]

WITH 1 AS x RETURN x UNION ALL WITH 1 AS x RETURN x
// [{ x: 1 }, { x: 1 }]
```

#### Multi-Statement Queries

Multiple statements can be separated by semicolons. Only `CREATE VIRTUAL` and `DELETE VIRTUAL` statements may appear before the last statement. The last statement can be any valid query.

```cypher
CREATE VIRTUAL (:Person) AS {
    UNWIND [{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}] AS r
    RETURN r.id AS id, r.name AS name
};
CREATE VIRTUAL (:Person)-[:KNOWS]-(:Person) AS {
    UNWIND [{left_id: 1, right_id: 2}] AS r
    RETURN r.left_id AS left_id, r.right_id AS right_id
};
MATCH (a:Person)-[:KNOWS]->(b:Person)
RETURN a.name AS from, b.name AS to
```

The `Runner` also exposes a `metadata` property with counts of virtual nodes/relationships created and deleted:

```javascript
const runner = new FlowQuery("CREATE VIRTUAL (:X) AS { RETURN 1 AS id }; MATCH (n:X) RETURN n");
await runner.run();
console.log(runner.metadata);
// { virtual_nodes_created: 1, virtual_relationships_created: 0,
//   virtual_nodes_deleted: 0, virtual_relationships_deleted: 0 }
```

### WHERE Clause

Filters rows based on conditions. Supports the following operators:

| Operator             | Example                                                        |
| -------------------- | -------------------------------------------------------------- |
| Comparison           | `=`, `<>`, `>`, `>=`, `<`, `<=`                                |
| Logical              | `AND`, `OR`, `NOT`                                             |
| Null checks          | `IS NULL`, `IS NOT NULL`                                       |
| List membership      | `IN [...]`, `NOT IN [...]`                                     |
| String matching      | `CONTAINS`, `NOT CONTAINS`                                     |
| String prefix/suffix | `STARTS WITH`, `NOT STARTS WITH`, `ENDS WITH`, `NOT ENDS WITH` |

```cypher
UNWIND range(1,100) AS n WITH n WHERE n >= 20 AND n <= 30 RETURN n

UNWIND ['apple', 'banana', 'grape'] AS fruit
WITH fruit WHERE fruit CONTAINS 'ap' RETURN fruit
// [{ fruit: 'apple' }, { fruit: 'grape' }]

UNWIND ['apple', 'apricot', 'banana'] AS fruit
WITH fruit WHERE fruit STARTS WITH 'ap' RETURN fruit

WITH fruit WHERE fruit IN ['banana', 'date'] RETURN fruit

WHERE age IS NOT NULL
```

### ORDER BY

Sorts results. Supports `ASC` (default) and `DESC`. Can use aliases, property access, function expressions, or arithmetic.

```cypher
UNWIND [3, 1, 2] AS x RETURN x ORDER BY x DESC
// [{ x: 3 }, { x: 2 }, { x: 1 }]

// Multiple sort keys
RETURN person.name AS name, person.age AS age ORDER BY name ASC, age DESC

// Sort by expression (expression values are not leaked into results)
UNWIND ['BANANA', 'apple', 'Cherry'] AS fruit
RETURN fruit ORDER BY toLower(fruit)

// Sort by arithmetic expression
RETURN item.a AS a, item.b AS b ORDER BY item.a + item.b ASC
```

#### DISTINCT

Removes duplicate rows from `RETURN` or `WITH`.

```cypher
UNWIND [1, 1, 2, 2] AS i RETURN DISTINCT i
// [{ i: 1 }, { i: 2 }]
```

### Expressions

#### Arithmetic

`+`, `-`, `*`, `/`, `^` (power), `%` (modulo). Standard precedence applies; use parentheses to override.

```cypher
RETURN 2 + 3 * 4 AS result   // 14
RETURN (2 + 3) * 4 AS result // 20
```

#### String Concatenation

The `+` operator concatenates strings.

```cypher
RETURN "hello" + " world" AS result  // "hello world"
```

#### List Concatenation

The `+` operator concatenates lists.

```cypher
RETURN [1, 2] + [3, 4] AS result  // [1, 2, 3, 4]
```

#### Negative Numbers

```cypher
RETURN -1 AS num  // -1
```

#### Associative Arrays (Maps)

Create inline maps. Keys can be reserved keywords.

```cypher
RETURN {name: "Alice", age: 30} AS person
RETURN {return: 1}.return AS aa  // 1
```

#### Property Access

Dot notation or bracket notation for nested lookups. Bracket notation supports range slicing.

```cypher
person.name
person["name"]
numbers[0:3]     // first 3 elements
numbers[:-2]     // all but last 2
numbers[2:-2]    // slice from index 2, excluding last 2
numbers[:]       // full copy
```

#### F-Strings

Python-style formatted strings with embedded expressions.

```cypher
WITH "world" AS w RETURN f"hello {w}" AS greeting
// Escape braces with double braces: {{ and }}
RETURN f"literal {{braces}}" AS result  // "literal {braces}"
```

#### CASE Expression

```cypher
RETURN CASE WHEN num > 1 THEN num ELSE null END AS ret
```

#### Equality as Expression

`=` and `<>` return `1` (true) or `0` (false) when used in RETURN.

```cypher
RETURN i=5 AS isEqual, i<>5 AS isNotEqual
```

### List Comprehensions

Filter and/or transform lists inline.

```cypher
// Map: [variable IN list | expression]
RETURN [n IN [1, 2, 3] | n * 2] AS doubled   // [2, 4, 6]

// Filter: [variable IN list WHERE condition]
RETURN [n IN [1, 2, 3, 4, 5] WHERE n > 2] AS filtered  // [3, 4, 5]

// Filter + Map: [variable IN list WHERE condition | expression]
RETURN [n IN [1, 2, 3, 4] WHERE n > 1 | n ^ 2] AS result  // [4, 9, 16]

// Identity (copy): [variable IN list]
RETURN [n IN [10, 20, 30]] AS result  // [10, 20, 30]
```

### Predicate Functions (Inline Aggregation)

Aggregate over a list expression with optional filtering.

```cypher
// sum(variable IN list | expression WHERE condition)
RETURN sum(n IN [1, 2, 3] | n WHERE n > 1) AS sum   // 5
RETURN sum(n IN [1, 2, 3] | n) AS sum                // 6
RETURN sum(n IN [1+2+3, 2, 3] | n^2) AS sum          // 49
```

### Aggregate Functions

Used in `RETURN` or `WITH` to group and reduce rows. Non-aggregated expressions define grouping keys. Aggregate functions cannot be nested.

| Function                 | Description                                                         |
| ------------------------ | ------------------------------------------------------------------- |
| `sum(expr)`              | Sum of values. Returns `0` for empty input, `null` for null input.  |
| `avg(expr)`              | Average. Returns `null` for null input.                             |
| `count(expr)`            | Count of rows.                                                      |
| `count(DISTINCT expr)`   | Count of unique values.                                             |
| `min(expr)`              | Minimum value (numbers or strings).                                 |
| `max(expr)`              | Maximum value (numbers or strings).                                 |
| `collect(expr)`          | Collects values into a list.                                        |
| `collect(DISTINCT expr)` | Collects unique values. Works with primitives, arrays, and objects. |

```cypher
UNWIND [1, 1, 2, 2] AS i UNWIND [1, 2, 3, 4] AS j
RETURN i, sum(j) AS sum, avg(j) AS avg
// [{ i: 1, sum: 20, avg: 2.5 }, { i: 2, sum: 20, avg: 2.5 }]

UNWIND ["a", "b", "a", "c"] AS s RETURN count(DISTINCT s) AS cnt  // 3
```

### Scalar Functions

| Function                       | Description                            | Example                                |
| ------------------------------ | -------------------------------------- | -------------------------------------- |
| `size(list)`                   | Length of list or string               | `size([1,2,3])` → `3`                  |
| `range(start, end)`            | Inclusive integer range                | `range(1,3)` → `[1,2,3]`               |
| `round(n)`                     | Round to nearest integer               | `round(3.7)` → `4`                     |
| `rand()`                       | Random float 0–1                       | `round(rand()*10)`                     |
| `split(str, delim)`            | Split string into list                 | `split("a,b",",")` → `["a","b"]`       |
| `join(list, delim)`            | Join list into string                  | `join(["a","b"],",")` → `"a,b"`        |
| `replace(str, from, to)`       | Replace all occurrences                | `replace("hello","l","x")` → `"hexxo"` |
| `toLower(str)`                 | Lowercase                              | `toLower("Hello")` → `"hello"`         |
| `trim(str)`                    | Strip whitespace                       | `trim("  hi  ")` → `"hi"`              |
| `substring(str, start[, len])` | Extract substring                      | `substring("hello",1,3)` → `"ell"`     |
| `toString(val)`                | Convert to string                      | `toString(42)` → `"42"`                |
| `toInteger(val)`               | Convert to integer                     | `toInteger("42")` → `42`               |
| `toFloat(val)`                 | Convert to float                       | `toFloat("3.14")` → `3.14`             |
| `tojson(str)`                  | Parse JSON string to object            | `tojson('{"a":1}')` → `{a: 1}`         |
| `stringify(obj)`               | Pretty-print object as JSON            | `stringify({a:1})`                     |
| `string_distance(a, b)`        | Normalized Levenshtein distance (0–1)  | `string_distance("kitten","sitting")`  |
| `keys(obj)`                    | Keys of a map                          | `keys({a:1,b:2})` → `["a","b"]`        |
| `properties(node_or_map)`      | Properties of a node or map            | `properties(n)`                        |
| `type(val)`                    | Type name string                       | `type(123)` → `"number"`               |
| `coalesce(val, ...)`           | First non-null argument                | `coalesce(null, 42)` → `42`            |
| `head(list)`                   | First element                          | `head([1,2,3])` → `1`                  |
| `tail(list)`                   | All but first element                  | `tail([1,2,3])` → `[2,3]`              |
| `last(list)`                   | Last element                           | `last([1,2,3])` → `3`                  |
| `id(node_or_rel)`              | ID of a node or type of a relationship | `id(n)`                                |
| `elementId(node)`              | String ID of a node                    | `elementId(n)` → `"1"`                 |

All scalar functions propagate `null`: if the primary input is `null`, the result is `null`.

### Temporal Functions

| Function                                          | Description                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| `datetime()`                                      | Current UTC datetime object                                        |
| `datetime(str)`                                   | Parse ISO 8601 string (e.g. `'2025-06-15T12:30:45.123Z'`)          |
| `datetime({year, month, day, hour, minute, ...})` | Construct from map                                                 |
| `date()` / `date(str)` / `date({...})`            | Date only (no time fields)                                         |
| `time()`                                          | Current UTC time                                                   |
| `localtime()`                                     | Current local time                                                 |
| `localdatetime()` / `localdatetime(str)`          | Current or parsed local datetime                                   |
| `timestamp()`                                     | Current epoch milliseconds (number)                                |
| `duration(str)`                                   | Parse ISO 8601 duration (`'P1Y2M3DT4H5M6S'`, `'P2W'`, `'PT2H30M'`) |
| `duration({days, hours, ...})`                    | Construct duration from map                                        |

**Datetime properties:** `year`, `month`, `day`, `hour`, `minute`, `second`, `millisecond`, `epochMillis`, `epochSeconds`, `dayOfWeek` (1=Mon, 7=Sun), `dayOfYear`, `quarter`, `formatted`.

**Date properties:** `year`, `month`, `day`, `epochMillis`, `dayOfWeek`, `dayOfYear`, `quarter`, `formatted`.

**Duration properties:** `years`, `months`, `weeks`, `days`, `hours`, `minutes`, `seconds`, `totalMonths`, `totalDays`, `totalSeconds`, `formatted`.

```cypher
WITH datetime() AS now RETURN now.year AS year, now.quarter AS q
RETURN date('2025-06-15').dayOfWeek AS dow  // 7 (Sunday)
RETURN duration('P2W').days AS d            // 14
```

### Graph Operations

#### CREATE VIRTUAL (Nodes)

Defines a virtual node label backed by a sub-query.

```cypher
CREATE VIRTUAL (:Person) AS {
    UNWIND [{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}] AS record
    RETURN record.id AS id, record.name AS name
}
```

#### CREATE VIRTUAL (Relationships)

Defines a virtual relationship type between two node labels. Must return `left_id` and `right_id`.

```cypher
CREATE VIRTUAL (:Person)-[:KNOWS]-(:Person) AS {
    UNWIND [{left_id: 1, right_id: 2}] AS record
    RETURN record.left_id AS left_id, record.right_id AS right_id
}
```

#### DELETE VIRTUAL

Removes a virtual node or relationship definition.

```cypher
DELETE VIRTUAL (:Person)
DELETE VIRTUAL (:Person)-[:KNOWS]-(:Person)
```

#### MATCH

Queries virtual graph data. Supports property constraints, `WHERE` clauses, and relationship traversal.

```cypher
MATCH (n:Person) RETURN n.name AS name
MATCH (n:Person {name: 'Alice'}) RETURN n
MATCH (a:Person)-[:KNOWS]->(b:Person) RETURN a.name, b.name
```

**Leftward direction:** `<-[:TYPE]-` reverses traversal direction.

```cypher
MATCH (m:Person)<-[:REPORTS_TO]-(e:Person)
RETURN m.name AS manager, e.name AS employee
```

**Variable-length relationships:** `*`, `*0..3`, `*1..`, `*2..`

```cypher
MATCH (a:Person)-[:KNOWS*]->(b:Person) RETURN a.name, b.name     // 0+ hops
MATCH (a:Person)-[:KNOWS*1..]->(b:Person) RETURN a.name, b.name  // 1+ hops
MATCH (a:Person)-[:KNOWS*0..3]->(b:Person) RETURN a.name, b.name // 0–3 hops
```

**ORed relationship types:**

```cypher
MATCH (a)-[:KNOWS|FOLLOWS]->(b) RETURN a.name, b.name
```

**Pattern variable:** Capture the full path as a variable.

```cypher
MATCH p=(:Person)-[:KNOWS]-(:Person) RETURN p AS pattern
```

**Pattern in WHERE:** Check existence of a relationship in a WHERE clause.

```cypher
MATCH (a:Person), (b:Person) WHERE (a)-[:KNOWS]->(b) RETURN a.name, b.name
MATCH (a:Person) WHERE NOT (a)-[:KNOWS]->(:Person) RETURN a.name
```

**Node reference reuse across MATCH clauses:**

```cypher
MATCH (a:Person)-[:KNOWS]-(b:Person)
MATCH (b)-[:KNOWS]-(c:Person)
RETURN a.name, b.name, c.name
```

#### OPTIONAL MATCH

Like `MATCH` but returns `null` for unmatched nodes instead of dropping the row. Property access on `null` nodes returns `null`.

```cypher
MATCH (a:Person)
OPTIONAL MATCH (a)-[:KNOWS]->(b:Person)
RETURN a.name AS name, b.name AS friend
// Persons without KNOWS relationships get friend=null
```

Chained optional matches propagate `null`:

```cypher
OPTIONAL MATCH (u)-[:REPORTS_TO]->(m1:Employee)
OPTIONAL MATCH (m1)-[:REPORTS_TO]->(m2:Employee)
// If m1 is null, m2 is also null
```

#### Graph Utility Functions

| Function                  | Description                                                                      |
| ------------------------- | -------------------------------------------------------------------------------- |
| `nodes(path)`             | List of nodes in a path                                                          |
| `relationships(path)`     | List of relationships in a path                                                  |
| `properties(node_or_rel)` | Properties map (excludes `id` for nodes, `left_id`/`right_id` for relationships) |
| `schema()`                | Introspect registered virtual node labels and relationship types                 |

```cypher
MATCH p=(:City)-[:CONNECTED_TO]-(:City)
RETURN nodes(p) AS cities, relationships(p) AS rels

CALL schema() YIELD kind, label, type, from_label, to_label, properties, sample
RETURN kind, label, properties
```

#### Filter Pass-Down (Parameter References)

Virtual node/relationship definitions can reference `$paramName` or `$args.paramName` to receive filter values from `MATCH` constraints and `WHERE` equality predicates. This enables dynamic data loading (e.g., API calls parameterized by match constraints).

```cypher
CREATE VIRTUAL (:Todo) AS {
    LOAD JSON FROM f"https://api.example.com/todos/{coalesce($id, 1)}" AS todo
    RETURN todo.id AS id, todo.title AS title
}

// $id receives the value 3 from the constraint
MATCH (t:Todo {id: 3}) RETURN t.title

// Also extracted from WHERE equality
MATCH (t:Todo) WHERE t.id = 3 RETURN t.title
```

`$`-prefixed identifiers are **only** allowed inside virtual definitions. Non-equality operators in `WHERE` (`>`, `<`, `CONTAINS`, etc.) are **not** extracted as pass-down parameters. `OR` predicates are also not extracted.

### Reserved Keywords as Identifiers

Reserved words (`return`, `with`, `from`, `to`, etc.) can be used as:

- Variable aliases: `WITH 1 AS return RETURN return`
- Property keys: `data.from`, `data.to`
- Map keys: `{return: 1}`
- Node labels and relationship types: `(:Return)-[:With]->()`

### Introspection

Discover all registered functions (built-in and custom):

```cypher
WITH functions() AS funcs UNWIND funcs AS f
RETURN f.name, f.description, f.category
```

---

## Quick Cheat Sheet

```
┌─────────────────────────────────────────────────────────────┐
│  CLAUSE SYNTAX                                              │
├─────────────────────────────────────────────────────────────┤
│  RETURN expr [AS alias], ...  [WHERE cond]                  │
│  │     [ORDER BY expr [ASC|DESC], ...]  [LIMIT n]           │
│  WITH expr [AS alias], ...    [WHERE cond]                  │
│  UNWIND list AS var                                         │
│  LOAD JSON FROM url [HEADERS {...}] [POST {...}] AS alias   │
│  CALL func() [YIELD field, ...]                             │
│  query1 UNION [ALL] query2                                  │
│  stmt1; stmt2; ... stmtN             -- multi-statement     │
│  LIMIT n                                                    │
├─────────────────────────────────────────────────────────────┤
│  GRAPH OPERATIONS                                           │
├─────────────────────────────────────────────────────────────┤
│  CREATE VIRTUAL (:Label) AS { subquery }                    │
│  CREATE VIRTUAL (:L1)-[:TYPE]-(:L2) AS { subquery }         │
│  DELETE VIRTUAL (:Label)                                    │
│  DELETE VIRTUAL (:L1)-[:TYPE]-(:L2)                         │
│  MATCH (n:Label {prop: val}), ...  [WHERE cond]             │
│  MATCH (a)-[:TYPE]->(b)              -- rightward           │
│  MATCH (a)<-[:TYPE]-(b)              -- leftward            │
│  MATCH (a)-[:TYPE*0..3]->(b)         -- variable length     │
│  MATCH (a)-[:T1|T2]->(b)             -- ORed types          │
│  MATCH p=(a)-[:TYPE]->(b)            -- pattern variable    │
│  OPTIONAL MATCH (a)-[:TYPE]->(b)     -- null if no match    │
├─────────────────────────────────────────────────────────────┤
│  WHERE OPERATORS                                            │
├─────────────────────────────────────────────────────────────┤
│  =  <>  >  >=  <  <=                                        │
│  AND  OR  NOT                                               │
│  IS NULL  ·  IS NOT NULL                                    │
│  IN [...]  ·  NOT IN [...]                                  │
│  CONTAINS  ·  NOT CONTAINS                                  │
│  STARTS WITH  ·  NOT STARTS WITH                            │
│  ENDS WITH  ·  NOT ENDS WITH                                │
├─────────────────────────────────────────────────────────────┤
│  EXPRESSIONS                                                │
├─────────────────────────────────────────────────────────────┤
│  +  -  *  /  ^  %                    -- arithmetic          │
│  "str" + "str"                       -- string concat       │
│  [1,2] + [3,4]                       -- list concat         │
│  f"hello {expr}"                     -- f-string            │
│  {key: val, ...}                     -- map literal         │
│  obj.key  ·  obj["key"]              -- property access     │
│  list[0:3]  ·  list[:-2]             -- slicing             │
│  CASE WHEN cond THEN v ELSE v END    -- conditional         │
│  DISTINCT                            -- deduplicate         │
├─────────────────────────────────────────────────────────────┤
│  LIST COMPREHENSIONS                                        │
├─────────────────────────────────────────────────────────────┤
│  [x IN list | expr]                  -- map                 │
│  [x IN list WHERE cond]              -- filter              │
│  [x IN list WHERE cond | expr]       -- filter + map        │
├─────────────────────────────────────────────────────────────┤
│  AGGREGATE FUNCTIONS                                        │
├─────────────────────────────────────────────────────────────┤
│  sum(x)  avg(x)  count(x)  min(x)  max(x)  collect(x)       │
│  count(DISTINCT x)  ·  collect(DISTINCT x)                  │
│  sum(v IN list | expr [WHERE cond])  -- inline predicate    │
├─────────────────────────────────────────────────────────────┤
│  SCALAR FUNCTIONS                                           │
├─────────────────────────────────────────────────────────────┤
│  size  range  round  rand  split  join  replace             │
│  toLower  trim  substring  toString  toInteger  toFloat     │
│  tojson  stringify  string_distance  keys  properties       │
│  type  coalesce  head  tail  last  id  elementId            │
├─────────────────────────────────────────────────────────────┤
│  TEMPORAL FUNCTIONS                                         │
├─────────────────────────────────────────────────────────────┤
│  datetime()  date()  time()  localtime()  localdatetime()   │
│  timestamp()  duration()                                    │
│  Properties: .year .month .day .hour .minute .second        │
│    .millisecond .epochMillis .dayOfWeek .quarter .formatted │
├─────────────────────────────────────────────────────────────┤
│  GRAPH FUNCTIONS                                            │
├─────────────────────────────────────────────────────────────┤
│  nodes(path)  relationships(path)  properties(node)         │
│  schema()  functions()                                      │
├─────────────────────────────────────────────────────────────┤
│  PARAMETER PASS-DOWN (inside virtual definitions only)      │
├─────────────────────────────────────────────────────────────┤
│  $paramName  ·  $args.paramName                             │
│  coalesce($id, defaultValue)         -- with fallback       │
└─────────────────────────────────────────────────────────────┘
```

---

## Extending FlowQuery with Custom Functions

FlowQuery supports extending its functionality with custom functions using the `@FunctionDef` decorator. You can create scalar functions, aggregate functions, predicate functions, and async data providers.

### Creating a Custom Scalar Function

Scalar functions operate on individual values and return a result:

```typescript
import { Function, FunctionDef } from "flowquery/extensibility";

@FunctionDef({
    description: "Doubles a number",
    category: "scalar",
    parameters: [{ name: "value", description: "Number to double", type: "number" }],
    output: { description: "Doubled value", type: "number" },
})
class Double extends Function {
    constructor() {
        super("double");
        this._expectedParameterCount = 1;
    }

    public value(): number {
        return this.getChildren()[0].value() * 2;
    }
}
```

Once defined, use it in your queries:

```cypher
WITH 5 AS num RETURN double(num) AS result
// Returns: [{ result: 10 }]
```

### Creating a Custom String Function

```typescript
import { Function, FunctionDef } from "flowquery/extensibility";

@FunctionDef({
    description: "Reverses a string",
    category: "scalar",
    parameters: [{ name: "text", description: "String to reverse", type: "string" }],
    output: { description: "Reversed string", type: "string" },
})
class StrReverse extends Function {
    constructor() {
        super("strreverse");
        this._expectedParameterCount = 1;
    }

    public value(): string {
        const input = String(this.getChildren()[0].value());
        return input.split("").reverse().join("");
    }
}
```

Usage:

```cypher
WITH 'hello' AS s RETURN strreverse(s) AS reversed
// Returns: [{ reversed: 'olleh' }]
```

### Creating a Custom Aggregate Function

Aggregate functions process multiple values and return a single result. They require a `ReducerElement` to track state:

```typescript
import { AggregateFunction, FunctionDef, ReducerElement } from "flowquery/extensibility";

class ProductElement extends ReducerElement {
    private _value: number = 1;
    public get value(): number {
        return this._value;
    }
    public set value(v: number) {
        this._value *= v;
    }
}

@FunctionDef({
    description: "Calculates the product of values",
    category: "aggregate",
    parameters: [{ name: "value", description: "Number to multiply", type: "number" }],
    output: { description: "Product of all values", type: "number" },
})
class Product extends AggregateFunction {
    constructor() {
        super("product");
        this._expectedParameterCount = 1;
    }

    public reduce(element: ReducerElement): void {
        element.value = this.firstChild().value();
    }

    public element(): ReducerElement {
        return new ProductElement();
    }
}
```

Usage:

```cypher
UNWIND [2, 3, 4] AS num RETURN product(num) AS result
// Returns: [{ result: 24 }]
```

### Creating a Custom Async Data Provider

Async providers allow you to create custom data sources that can be used with `LOAD JSON FROM`:

```typescript
import { AsyncFunction, FunctionDef } from "flowquery/extensibility";

@FunctionDef({
    description: "Provides example data for testing",
    category: "async",
    parameters: [],
    output: { description: "Example data object", type: "object" },
})
class GetExampleData extends AsyncFunction {
    async *generate(): AsyncGenerator<any> {
        yield { id: 1, name: "Alice" };
        yield { id: 2, name: "Bob" };
    }
}
```

Usage:

```cypher
LOAD JSON FROM getExampleData() AS data RETURN data.id AS id, data.name AS name
// Returns: [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]
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

## Examples

### Virtual Org Chart

This single multi-statement query creates a virtual graph for a fictitious company — complete with employees, skills, phone numbers, and a management chain — then queries it to produce an org chart. [Try live!](https://microsoft.github.io/FlowQuery/?rZXPbtNAEMbFhUMOReXAeW4OwkH521ZBQgolrVQlSogDQlRVtdjTeKm9a603Bavqw_AAPEVfDO16s_EmEVElfPHuzGf7N9-M7UN4BfX-MM0SXiC-hkEA9zUAgJdwqc_quKdRH1o-MJJiH7yACAKnMTLP1-kf_PucykSlTocTE6weEWZEyBSZ7IM3_IXhUtI71MIs5kxd-KbV6PV6jWar2fR8yG9pkuR9uPQCKYjEReH54I2QRCjymGZqd0YZYSF6Vw--C9q2oGMiwmUOM3qHgnh-FfTLFPgNDNmCMkRB2ULTuKBOchO03Ww5oAMRxlRiKJdCVeadJnwZqcUYmeT6JlukHUs6FbQgMCUSEw2yRToVPFqG0prrkLrJTdLOBumMkyglWVbW5Q0YSQpJw1xtPn_dpuxayguSYg4fBOe3Sl2lDJBRLqyhBuVJfrYdynmRYRAKmqmyvGkhY67mzTsXJIs_jbYxexZzRBl8i4np6f_G7LhmLnMNGBS5xFR7-BHvJlm-DXhkAQepeoMueMxyXVQF0LQSxoSRxW7Afd12fQxCsUw1FpEEdLNzqjkDSW4x5kmEAsaLVG4TH1viOU8ff-dwTkT4-Ids9p7fyJ9EoGvrk0ztuqYi0fVtDMEcc7nzPTqxnGdE0pTAIGkEpMDI9XYX55Moew7leibHI2vwlGaYUIaq_xrySn1SBYZcRHp_YDZvaaQyNPJXAVWCCqmzDa7wVWK1XlcPsNKt61DK9c7eSFejcnphw2U5Kl6uag_vaofuP6Fx2Z8Np5PZPLieT64a-_8WCd7Ia_MlFnQRl5tWtWtW0tkv6VYl7Z2S3n7JUVXS2Sk5rkq6OyUnruTfHTZXqbRZWttXN9GXmrWy_gXUce1v7RnUt_x_X08XoqI50A_FcnzWxyAANBrfKOwsWYVcjxNWR8ikK2NkNOUUVR9SjpNJm2mqpMtImU8XwqXUvmVcyHzOa88dBN9U9Bc)

```cypher
CREATE VIRTUAL (:Employee) AS {
    UNWIND [
        {id: 1, name: 'Sara Chen',     jobTitle: 'CEO',                 department: 'Executive',   phone: '+1-555-0100', skills: ['Strategy', 'Leadership', 'Finance']},
        {id: 2, name: 'Marcus Rivera', jobTitle: 'VP of Engineering',   department: 'Engineering', phone: '+1-555-0201', skills: ['Architecture', 'Cloud', 'Mentoring']},
        {id: 3, name: 'Priya Patel',   jobTitle: 'VP of Product',       department: 'Product',     phone: '+1-555-0301', skills: ['Roadmapping', 'Analytics', 'UX']},
        {id: 4, name: 'James Brooks',  jobTitle: 'Senior Engineer',     department: 'Engineering', phone: '+1-555-0202', skills: ['TypeScript', 'Python', 'GraphQL']},
        {id: 5, name: 'Lin Zhang',     jobTitle: 'Senior Engineer',     department: 'Engineering', phone: '+1-555-0203', skills: ['Rust', 'Systems', 'DevOps']},
        {id: 6, name: 'Amara Johnson', jobTitle: 'Product Manager',     department: 'Product',     phone: '+1-555-0302', skills: ['Scrum', 'Data Analysis', 'Stakeholder Mgmt']},
        {id: 7, name: 'Tomás García',  jobTitle: 'Software Engineer',   department: 'Engineering', phone: '+1-555-0204', skills: ['React', 'TypeScript', 'Testing']},
        {id: 8, name: 'Fatima Al-Sayed', jobTitle: 'Software Engineer', department: 'Engineering', phone: '+1-555-0205', skills: ['Python', 'ML', 'Data Pipelines']}
    ] AS record
    RETURN record.id AS id, record.name AS name, record.jobTitle AS jobTitle,
           record.department AS department, record.phone AS phone, record.skills AS skills
};
CREATE VIRTUAL (:Employee)-[:REPORTS_TO]-(:Employee) AS {
    UNWIND [
        {left_id: 2, right_id: 1},
        {left_id: 3, right_id: 1},
        {left_id: 4, right_id: 2},
        {left_id: 5, right_id: 2},
        {left_id: 6, right_id: 3},
        {left_id: 7, right_id: 4},
        {left_id: 8, right_id: 4}
    ] AS record
    RETURN record.left_id AS left_id, record.right_id AS right_id
};
MATCH (e:Employee)
OPTIONAL MATCH (e)-[:REPORTS_TO]->(mgr:Employee)
RETURN
    e.name           AS employee,
    e.jobTitle       AS title,
    e.department     AS department,
    e.phone          AS phone,
    e.skills         AS skills,
    mgr.name         AS reportsTo
ORDER BY e.department, e.name
```

Output:

| employee        | title             | department  | phone       | skills                                   | reportsTo     |
| --------------- | ----------------- | ----------- | ----------- | ---------------------------------------- | ------------- |
| Fatima Al-Sayed | Software Engineer | Engineering | +1-555-0205 | [Python, ML, Data Pipelines]             | James Brooks  |
| James Brooks    | Senior Engineer   | Engineering | +1-555-0202 | [TypeScript, Python, GraphQL]            | Marcus Rivera |
| Lin Zhang       | Senior Engineer   | Engineering | +1-555-0203 | [Rust, Systems, DevOps]                  | Marcus Rivera |
| Marcus Rivera   | VP of Engineering | Engineering | +1-555-0201 | [Architecture, Cloud, Mentoring]         | Sara Chen     |
| Tomás García    | Software Engineer | Engineering | +1-555-0204 | [React, TypeScript, Testing]             | James Brooks  |
| Sara Chen       | CEO               | Executive   | +1-555-0100 | [Strategy, Leadership, Finance]          | null          |
| Amara Johnson   | Product Manager   | Product     | +1-555-0302 | [Scrum, Data Analysis, Stakeholder Mgmt] | Priya Patel   |
| Priya Patel     | VP of Product     | Product     | +1-555-0301 | [Roadmapping, Analytics, UX]             | Sara Chen     |

You can further explore the graph — for example, find the full management chain from any employee up to the CEO:

```cypher
MATCH (e:Employee)-[:REPORTS_TO*1..]->(mgr:Employee)
WHERE e.name = 'Tomás García'
RETURN e.name AS employee, collect(mgr.name) AS managementChain
// [{ employee: "Tomás García", managementChain: ["James Brooks", "Marcus Rivera", "Sara Chen"] }]
```

Or find each manager's direct reports:

```cypher
MATCH (dr:Employee)-[:REPORTS_TO]->(mgr:Employee)
RETURN mgr.name AS manager, collect(dr.name) AS directReports
ORDER BY manager
```

Or find all employees who share a skill:

```cypher
MATCH (a:Employee), (b:Employee)
WHERE a.id < b.id
WITH a, b, [s IN a.skills WHERE s IN b.skills] AS shared
WHERE size(shared) > 0
RETURN a.name AS employee1, b.name AS employee2, shared AS sharedSkills
ORDER BY size(shared) DESC
```

## Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit [Contributor License Agreements](https://cla.opensource.microsoft.com).

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
