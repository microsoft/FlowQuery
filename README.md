![FlowQuery](./FlowQueryLogoIcon.png)

A declarative query language for data processing pipelines.

FlowQuery is a declarative query language for defining and executing data processing pipelines involving (but not limited to) API calls over http. The language is very well suited for prototyping of for example LLM chain-of-thought pipelines involving fetching grounding data from APIs, and processing that grounding data in multiple successive LLM calls where the next call builds on previous results. FlowQuery is based on many of the core language constructs in the OpenCypher query language except (currently) concepts related to graphs. Additionally, FlowQuery implements its own language constructs, such as Python-style f-strings, and special predicate functions operating over lists. FlowQuery is not limited to its current capabilities and may evolve beyond this in the future to include language constructs such as variables and/or other language concepts from OpenCypher.

The main motivation of FlowQuery is rapid prototyping of fixed step data processing pipelines involving LLMs (for example chain-of-thought) and as such drastically shorten the work needed to create such data processing pipelines. A core business outcome of this is faster product value experimentation loops, which leads to shorter time-to-market for product ideas involving LLMs.

FlowQuery is written in TypeScript (https://www.typescriptlang.org/) and built/compiled runs both in browser or in Node as a self-contained one-file Javascript library.

- Test live at <a href="https://microsoft.github.io/FlowQuery/" target="_blank">https://microsoft.github.io/FlowQuery/</a>.
- Try as a VSCode plugin from https://marketplace.visualstudio.com/items?itemName=FlowQuery.flowquery-vscode.

## Howto
- Dev: ```npm start```
  - This will start a FlowQuery command line where you can run statements.
- Test: ```npm test```
  - This will run all unit tests.
- Build: ```npm run build``` (builds for both Node and web)

## Installation & Usage

### Node.js

Install FlowQuery from npm:

```bash
npm install flowquery
```

Then use it in your code:

```javascript
const FlowQuery = require('flowquery').default;
// Or with ES modules:
// import FlowQuery from 'flowquery';

async function main() {
    const query = new FlowQuery('WITH 1 AS x RETURN x + 1');
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
    const query = new FlowQuery('WITH 1 AS x RETURN x + 1');
    await query.run();
    console.log(query.results); // [ { expr0: 2 } ]
}

main();
</script>
```

Or import from the browser-specific entry point:

```javascript
import FlowQuery from 'flowquery/browser';

const query = new FlowQuery('WITH "Hello" AS greeting RETURN greeting');
await query.run();
console.log(query.results);
```

## Examples
See also ./misc/queries and ./tests/compute/runner.test.ts for more examples.
```cypher
/*
Collect 10 random pieces of wisdom and create a letter histogram.
*/
unwind range(0,10) as i
load json from "https://api.adviceslip.com/advice" as item
with join(collect(item.slip.advice),"") as wisdom
unwind split(wisdom,"") as letter
return letter, sum(1) as lettercount
```
```cypher
/*
  This query fetches 10 cat facts from the Cat Facts API (https://catfact.ninja/fact)
  and then uses the OpenAI API to analyze those cat facts and return a short summary
  of the most interesting facts and what they imply about cats as pets.
  
  To run this query, you need to set the OPENAI_API_KEY variable to your OpenAI API key.
  You also need to set the OpenAI-Organization header to your organization ID.
    You can find your organization ID in the OpenAI dashboard.
    See https://platform.openai.com/docs/guides/chat for more information.
*/
// Setup OpenAI API key and organization ID
with
    'YOUR_OPENAI_API_KEY' as OPENAI_API_KEY,
    'YOUR_OPENAI_ORGANIZATION_ID' as OPENAI_ORGANIZATION_ID

// Get 10 cat facts and collect them into a list
unwind range(0,10) as i
load json from "https://catfact.ninja/fact" as item
with collect(item.fact) as catfacts

// Create prompt to analyze cat facts
with f"
Analyze the following cat facts and answer with a short summary of the most interesting facts, and what they imply about cats as pets:
{join(catfacts, '\n')}
" as catfacts_analysis_prompt

// Call OpenAI API to analyze cat facts
load json from 'https://api.openai.com/v1/chat/completions'
headers {
    `Content-Type`: 'application/json',
    Authorization: f'Bearer {OPENAI_API_KEY}',
    `OpenAI-Organization`: OPENAI_ORGANIZATION_ID
}
post {
    model: 'gpt-4o-mini',
    messages: [{role: 'user', content: catfacts_analysis_prompt}],
    temperature: 0.7
} as openai_response
with openai_response.choices[0].message.content as catfacts_analysis

// Return the analysis
return catfacts_analysis
```
```cypher
// Test completion from Azure OpenAI API
with
    'YOUR_AZURE_OPENAI_API_KEY' as AZURE_OPENAI_API_KEY
load json from 'https://YOUR_DEPLOYMENT_NAME.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-08-01-preview'
headers {
    `Content-Type`: 'application/json',
    `api-key`: AZURE_OPENAI_API_KEY,
}
post {
    messages: [{role: 'user', content: 'Answer with this is a test!'}],
    temperature: 0.7
} as data
return data
```

## Extending FlowQuery with Custom Functions

FlowQuery provides a plugin system that allows you to register custom functions. You can create scalar functions for synchronous operations or async providers for data loading.

### Creating a Custom Scalar Function

To create a custom function, extend the `Function` base class and register it with FlowQuery:

```javascript
const FlowQuery = require('flowquery').default;
const { Function } = require('flowquery');

// Create a custom function class
class UpperCase extends Function {
    constructor() {
        super("uppercase");  // Function name used in queries
        this._expectedParameterCount = 1;  // Number of required parameters
    }
    
    // Implement the value() method to define the function's behavior
    value() {
        const input = this.getChildren()[0].value();  // Get first parameter
        return String(input).toUpperCase();
    }
}

// Register the function with FlowQuery
FlowQuery.registerFunction("uppercase", () => new UpperCase());

// Now use it in queries!
async function main() {
    const query = new FlowQuery("WITH 'hello world' AS greeting RETURN uppercase(greeting)");
    await query.run();
    console.log(query.results);  // [ { expr0: 'HELLO WORLD' } ]
}
```

### Registering Functions with Metadata

For better documentation and LLM integration, you can register functions with full metadata using the `@FunctionDef` decorator pattern:

```javascript
FlowQuery.registerFunction("uppercase", {
    factory: () => new UpperCase(),
    metadata: {
        name: "uppercase",
        description: "Converts a string to uppercase",
        category: "string",
        parameters: [
            { name: "text", description: "String to convert", type: "string" }
        ],
        output: { 
            description: "Uppercase string", 
            type: "string",
            example: "HELLO WORLD"
        },
        examples: ["WITH 'hello' AS s RETURN uppercase(s)"]
    }
});
```

### TypeScript: Using the @FunctionDef Decorator

In TypeScript projects, you can use the `@FunctionDef` decorator directly on your function class. Import from the extensibility module for a clean API:

```typescript
import { Function, FunctionDef } from "flowquery/extensibility";

@FunctionDef({
    description: "Converts a string to uppercase",
    category: "string",
    parameters: [
        { name: "text", description: "String to convert", type: "string" }
    ],
    output: { 
        description: "Uppercase string", 
        type: "string",
        example: "HELLO WORLD"
    },
    examples: ["WITH 'hello' AS s RETURN uppercase(s)"]
})
class UpperCase extends Function {
    constructor() {
        super("uppercase");
        this._expectedParameterCount = 1;
    }
    
    public value(): string {
        const input = this.getChildren()[0].value();
        return String(input).toUpperCase();
    }
}
```

The decorator automatically registers the function with the FlowQuery function factory.

The extensibility module (`flowquery/extensibility`) exports:
- `Function` - Base class for scalar functions
- `AggregateFunction` - Base class for aggregate functions (like `sum`, `avg`, `collect`)
- `PredicateFunction` - Base class for predicate functions (like list comprehensions)
- `FunctionDef` - Decorator for registering functions with metadata
- `ReducerElement` - Helper class for aggregate function state
- `FunctionFactory` - Direct access to the function factory for advanced usage

### Creating Async Data Providers

For functions that fetch data asynchronously (used with `LOAD ... FROM`), register an async provider:

```javascript
FlowQuery.registerAsyncProvider("fetchUsers", {
    provider: async function* (endpoint) {
        const response = await fetch(endpoint);
        const data = await response.json();
        for (const user of data) {
            yield user;  // Yield each item individually
        }
    },
    metadata: {
        name: "fetchUsers",
        description: "Fetches user data from an API endpoint",
        category: "data",
        parameters: [
            { name: "endpoint", description: "API URL to fetch users from", type: "string" }
        ],
        output: {
            description: "User object",
            type: "object",
            properties: {
                id: { description: "User ID", type: "number" },
                name: { description: "User name", type: "string" }
            }
        },
        examples: ["LOAD JSON FROM fetchUsers('https://api.example.com/users') AS user"]
    }
});

// Use in a query
const query = new FlowQuery(`
    LOAD JSON FROM fetchUsers('https://api.example.com/users') AS user
    RETURN user.name, user.id
`);
await query.run();
```

### Listing and Querying Functions

You can discover available functions programmatically:

```javascript
// List all functions
const allFunctions = FlowQuery.listFunctions();

// Filter by category
const stringFunctions = FlowQuery.listFunctions({ category: "string" });
const asyncFunctions = FlowQuery.listFunctions({ asyncOnly: true });

// Get metadata for a specific function
const sumMetadata = FlowQuery.getFunctionMetadata("sum");
console.log(sumMetadata.description);  // "Calculates the sum of numeric values..."
```

You can also query functions from within FlowQuery itself:

```cypher
// List all available functions
WITH functions() AS funcs
UNWIND funcs AS f
RETURN f.name, f.description, f.category
```

### Unregistering Functions

To remove a registered function:

```javascript
// Unregister a sync function
FlowQuery.unregisterFunction("uppercase");

// Unregister an async provider
FlowQuery.unregisterAsyncProvider("fetchUsers");
```

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
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
