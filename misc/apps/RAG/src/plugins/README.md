# FlowQuery Plugin System

This folder contains the plugin system for adding async data loader functions to FlowQuery.

## Quick Start

1. Create a new file in `loaders/` (e.g., `my-api.ts`)
2. Define your plugin following the `AsyncLoaderPlugin` interface
3. Import and add it to the `allPlugins` array in `index.ts`

## Creating a Plugin

### Basic Plugin Structure

```typescript
import { AsyncLoaderPlugin } from '../types';

// Your async data provider function
async function* myDataProvider(arg1: string, arg2?: number): AsyncGenerator<any, void, unknown> {
    const response = await fetch(`https://api.example.com/${arg1}`);
    const data = await response.json();
    
    // Yield items one at a time (for arrays)
    if (Array.isArray(data)) {
        for (const item of data) {
            yield item;
        }
    } else {
        yield data;
    }
}

// Export the plugin definition
export const myPlugin: AsyncLoaderPlugin = {
    name: 'myData',  // Function name in FlowQuery
    provider: myDataProvider,
    metadata: {
        description: 'Fetches data from My API',
        category: 'data',
        parameters: [
            { name: 'arg1', description: 'First argument', type: 'string', required: true },
            { name: 'arg2', description: 'Optional second arg', type: 'number', required: false }
        ],
        output: {
            description: 'Data item',
            type: 'object',
            properties: {
                id: { description: 'Item ID', type: 'number' },
                value: { description: 'Item value', type: 'string' }
            }
        },
        examples: [
            "LOAD JSON FROM myData('users') AS item RETURN item.id, item.value"
        ]
    }
};

export default myPlugin;
```

### Register the Plugin

Add your plugin to `index.ts`:

```typescript
import myPlugin from './loaders/my-api';

const allPlugins: AsyncLoaderPlugin[] = [
    // ... existing plugins
    myPlugin,
];
```

## Using Plugins in FlowQuery

Once registered, use your plugin in FlowQuery queries:

```sql
-- Fetch data from your custom source
LOAD JSON FROM myData('users') AS user
WHERE user.active = true
RETURN user.name, user.email

-- Combine with filtering and ordering
LOAD JSON FROM myData('products', 50) AS product
WHERE product.price > 10
ORDER BY product.name ASC
RETURN product.name, product.price
```

## Available Built-in Plugins

| Plugin | Description | Example |
|--------|-------------|---------|
| `fetchJson` | Fetch JSON from any URL | `fetchJson('https://api.example.com/data')` |

> **Note**: Additional plugins may be registered. Check `index.ts` for the current list of available plugins.

## Plugin Types

### AsyncLoaderPlugin

```typescript
interface AsyncLoaderPlugin {
    name: string;                    // Function name (lowercased when registered)
    provider: AsyncDataProvider;     // The async generator/function
    metadata?: PluginMetadata;       // Optional metadata for LLM consumption
}
```

### AsyncDataProvider

```typescript
type AsyncDataProvider = (...args: any[]) => AsyncGenerator<any, void, unknown> | Promise<any>;
```

Plugins can return either:
- An `AsyncGenerator` that yields items one at a time
- A `Promise` that resolves to an array or single value

### PluginMetadata

```typescript
interface PluginMetadata {
    name: string;
    description: string;
    category?: string;
    parameters?: ParameterSchema[];
    output?: OutputSchema;
    examples?: string[];
}
```

## Tips

1. **Use generators for large datasets** - Yield items one at a time to avoid memory issues
2. **Add comprehensive metadata** - This helps LLMs understand and use your functions
3. **Handle errors gracefully** - Throw descriptive errors for API failures
4. **Include examples** - Show users how to use your plugin in FlowQuery
