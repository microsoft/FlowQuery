/**
 * FlowQuery System Prompt Generator
 * 
 * Generates a system prompt that instructs the LLM to create FlowQuery statements
 * based on natural language queries, with awareness of available loader plugins.
 * 
 * Uses FlowQuery's built-in functions() introspection to dynamically discover
 * available async data loaders and their metadata.
 */

import { PluginMetadata, ParameterSchema, OutputSchema } from '../plugins/types';
import { pluginRegistry } from '../plugins/PluginRegistry';

/**
 * FlowQuery language reference documentation.
 */
const FLOWQUERY_LANGUAGE_REFERENCE = `
## FlowQuery Language Reference

FlowQuery is a declarative query language for data processing pipelines. It uses SQL-like syntax with additional constructs for working with APIs and data transformations.

### Core Clauses

1. **WITH** - Define variables and expressions
   \`\`\`
   WITH 'value' AS myVariable
   WITH 1 + 2 AS result
   WITH expression1 AS var1, expression2 AS var2
   \`\`\`

2. **LOAD JSON FROM** - Load data from a URL or async data provider
   \`\`\`
   LOAD JSON FROM 'https://api.example.com/data' AS item
   LOAD JSON FROM myFunction(arg1, arg2) AS item
   \`\`\`

3. **LOAD JSON FROM ... HEADERS ... POST** - Make HTTP requests with headers and body
   \`\`\`
   LOAD JSON FROM 'https://api.example.com/data'
   HEADERS {
       \`Content-Type\`: 'application/json',
       Authorization: f'Bearer {apiKey}'
   }
   POST {
       field1: 'value1',
       field2: variable
   } AS response
   \`\`\`

4. **UNWIND** - Expand arrays into individual rows
   \`\`\`
   UNWIND [1, 2, 3] AS number
   UNWIND myArray AS item
   UNWIND range(0, 10) AS index
   \`\`\`

5. **WHERE** - Filter results
   \`\`\`
   WHERE item.active = true
   WHERE user.age > 18 AND user.name CONTAINS 'John'
   \`\`\`

6. **RETURN** - Specify output columns
   \`\`\`
   RETURN item.name, item.value
   RETURN item.name AS Name, item.price AS Price
   RETURN *  -- Return all fields
   \`\`\`

7. **ORDER BY** - Sort results
   \`\`\`
   ORDER BY item.name ASC
   ORDER BY item.price DESC, item.name ASC
   \`\`\`

8. **LIMIT** - Limit number of results
   \`\`\`
   LIMIT 10
   \`\`\`

9. **SKIP** - Skip a number of results
   \`\`\`
   SKIP 5
   \`\`\`

### Built-in Functions

- **String Functions**: \`size()\`, \`substring()\`, \`trim()\`, \`toLower()\`, \`toUpper()\`, \`split()\`, \`join()\`, \`replace()\`, \`startsWith()\`, \`endsWith()\`, \`contains()\`
- **Math Functions**: \`abs()\`, \`ceil()\`, \`floor()\`, \`round()\`, \`sqrt()\`, \`pow()\`, \`min()\`, \`max()\`
- **Aggregate Functions**: \`sum()\`, \`avg()\`, \`count()\`, \`collect()\`, \`min()\`, \`max()\`
- **List Functions**: \`range()\`, \`head()\`, \`tail()\`, \`last()\`, \`size()\`, \`reverse()\`
- **Type Functions**: \`type()\`, \`toInteger()\`, \`toFloat()\`, \`toString()\`, \`toBoolean()\`
- **Utility Functions**: \`coalesce()\`, \`keys()\`, \`properties()\`, \`stringify()\`

### F-Strings (Template Literals)

Use \`f"..."\` for string interpolation:
\`\`\`
WITH f"Hello, {name}!" AS greeting
WITH f"The result is {value * 2}" AS message
\`\`\`

### Object and Array Literals

\`\`\`
WITH { name: 'John', age: 30 } AS person
WITH [1, 2, 3] AS numbers
WITH { items: [{ id: 1 }, { id: 2 }] } AS data
\`\`\`

### Property Access

\`\`\`
item.propertyName
item['property-with-dashes']
item.nested.property
array[0]
\`\`\`

### Comparison Operators

- \`=\`, \`<>\` (not equal), \`<\`, \`>\`, \`<=\`, \`>=\`
- \`AND\`, \`OR\`, \`NOT\`
- \`IN\`, \`CONTAINS\`, \`STARTS WITH\`, \`ENDS WITH\`
- \`IS NULL\`, \`IS NOT NULL\`

### Comments

\`\`\`
// Single line comment
/* Multi-line
   comment */
\`\`\`
`;

/**
 * FlowQuery System Prompt Generator class.
 * Provides methods to generate various system prompts for LLM interactions.
 */
export class FlowQuerySystemPrompt {
    /**
     * Format a parameter schema into a readable string.
     */
    private static formatParameter(param: ParameterSchema): string {
        const required = param.required ? ' (required)' : ' (optional)';
        const defaultVal = param.default !== undefined ? `, default: ${JSON.stringify(param.default)}` : '';
        const enumVals = param.enum ? `, values: [${param.enum.map(v => JSON.stringify(v)).join(', ')}]` : '';
        return `  - \`${param.name}\`: ${param.type}${required}${defaultVal}${enumVals} - ${param.description}`;
    }

    /**
     * Format output schema into a readable string.
     */
    private static formatOutput(output: OutputSchema): string {
        let result = `  Returns: ${output.type} - ${output.description}`;
        
        if (output.properties) {
            result += '\n  Output properties:';
            for (const [key, prop] of Object.entries(output.properties)) {
                result += `\n    - \`${key}\`: ${prop.type} - ${prop.description}`;
            }
        }
        
        if (output.example) {
            result += `\n  Example output: ${JSON.stringify(output.example, null, 2)}`;
        }
        
        return result;
    }

    /**
     * Format a plugin metadata into a readable documentation block.
     */
    private static formatPluginDocumentation(plugin: PluginMetadata): string {
        const lines: string[] = [];
        
        lines.push(`### \`${plugin.name}\``);
        lines.push(`**Description**: ${plugin.description}`);
        
        if (plugin.category) {
            lines.push(`**Category**: ${plugin.category}`);
        }
        
        if (plugin.parameters.length > 0) {
            lines.push('\n**Parameters**:');
            for (const param of plugin.parameters) {
                lines.push(this.formatParameter(param));
            }
        } else {
            lines.push('\n**Parameters**: None');
        }
        
        lines.push('\n**Output**:');
        lines.push(this.formatOutput(plugin.output));
        
        if (plugin.examples && plugin.examples.length > 0) {
            lines.push('\n**Usage Examples**:');
            for (const example of plugin.examples) {
                lines.push(`\`\`\`\n${example}\n\`\`\``);
            }
        }
        
        if (plugin.notes) {
            lines.push(`\n**Notes**: ${plugin.notes}`);
        }
        
        return lines.join('\n');
    }

    /**
     * Generate documentation for all available plugins.
     */
    private static generatePluginDocumentation(plugins: PluginMetadata[]): string {
        if (plugins.length === 0) {
            return 'No data loader plugins are currently available.';
        }
        
        const sections: string[] = [];
        
        // Group plugins by category
        const byCategory = new Map<string, PluginMetadata[]>();
        for (const plugin of plugins) {
            const category = plugin.category || 'general';
            if (!byCategory.has(category)) {
                byCategory.set(category, []);
            }
            byCategory.get(category)!.push(plugin);
        }
        
        sections.push('## Available Data Loader Plugins\n');
        sections.push('The following async data loader functions are available for use with `LOAD JSON FROM`:\n');
        
        for (const [category, categoryPlugins] of byCategory) {
            sections.push(`\n### Category: ${category.charAt(0).toUpperCase() + category.slice(1)}\n`);
            for (const plugin of categoryPlugins) {
                sections.push(this.formatPluginDocumentation(plugin));
                sections.push('---');
            }
        }
        
        return sections.join('\n');
    }

    /**
     * Internal helper to build the system prompt from plugin documentation.
     */
    private static buildSystemPrompt(pluginDocs: string, additionalContext?: string): string {
        return `You are a FlowQuery assistant. Your primary role is to help users by creating and executing FlowQuery statements based on their natural language requests.

## How You Work

You operate in a multi-step process:
1. **Analyze** the user's natural language request
2. **Generate** a FlowQuery statement that fulfills the request using available plugins
3. The system will **execute** your FlowQuery and provide you with the results
4. You will then **interpret** the results and present them to the user in a helpful way

## Response Format for Query Generation

When the user makes a request that requires fetching or processing data:
1. Generate a FlowQuery statement wrapped in a code block with \`\`\`flowquery language tag
2. Keep any explanation brief - the main focus should be the query
3. The query will be automatically executed and you'll receive the results

When the user asks a question that doesn't require data fetching (e.g., asking about FlowQuery syntax or general questions):
1. Start your response with [NO_QUERY_NEEDED]
2. Then provide your direct answer

## Important Guidelines

- Only use the available data loader plugins documented below
- Use proper FlowQuery syntax as documented in the language reference
- For API calls, prefer using the registered loader plugins over raw HTTP calls when possible
- Always alias loaded items with \`AS\` for clarity
- Use meaningful aliases in RETURN statements for better readability
- Generate the simplest query that fulfills the user's request
- If you cannot determine what the user needs, ask clarifying questions (with [NO_QUERY_NEEDED])

${FLOWQUERY_LANGUAGE_REFERENCE}

${pluginDocs}

${additionalContext ? `## Additional Context\n\n${additionalContext}` : ''}

## Example Response Format

**When a query is needed**:
\`\`\`flowquery
LOAD JSON FROM pluginName(args) AS item
WHERE item.field = 'value'
RETURN item.name AS Name, item.value AS Value
\`\`\`

**When no query is needed** (e.g., general questions about FlowQuery):
[NO_QUERY_NEEDED]
Your direct answer here...

Now help the user with their request.`;
    }

    /**
     * Generate the complete FlowQuery system prompt.
     * Uses FlowQuery's introspection via functions() as the single source of truth.
     * 
     * @param additionalContext - Optional additional context to include in the prompt
     * @returns The complete system prompt string
     */
    public static generate(additionalContext?: string): string {
        // Uses FlowQuery's introspection to get available async providers
        const plugins = pluginRegistry.getAllPluginMetadata();
        const pluginDocs = this.generatePluginDocumentation(plugins);
        
        return this.buildSystemPrompt(pluginDocs, additionalContext);
    }

    /**
     * Generate a system prompt for the interpretation phase.
     * Used after FlowQuery execution to interpret results.
     * 
     * @returns The interpretation system prompt string
     */
    public static generateInterpretationPrompt(): string {
        return `You are a helpful assistant interpreting FlowQuery execution results.

## Your Role

The user made a natural language request, which was converted to a FlowQuery statement and executed.
You are now receiving the execution results. Your job is to:

1. **Summarize** the results in a clear, user-friendly way
2. **Highlight** key insights or patterns in the data
3. **Format** the data appropriately (tables, lists, or prose depending on the data)
4. **Answer** the user's original question using the data

## Guidelines

- Be concise but thorough
- If the results contain many items, summarize rather than listing all
- If there's an error, explain what went wrong in user-friendly terms
- Use markdown formatting for better readability
- If the data doesn't fully answer the user's question, note what's missing`;
    }

    /**
     * Get a minimal system prompt without full documentation.
     * Useful for contexts where token count is a concern.
     */
    public static getMinimalPrompt(): string {
        const plugins = pluginRegistry.getAllPluginMetadata();
        const pluginList = plugins.map(p => `- \`${p.name}\`: ${p.description}`).join('\n');
        
        return `You are a FlowQuery assistant. Generate FlowQuery statements based on user requests.

Available data loader plugins:
${pluginList}

FlowQuery uses SQL-like syntax: WITH, LOAD JSON FROM, UNWIND, WHERE, RETURN, ORDER BY, LIMIT, SKIP.
Use f"..." for string interpolation. Access properties with dot notation or brackets.

Always wrap FlowQuery code in \`\`\`flowquery code blocks.`;
    }

    /**
     * Generate the FlowQuery system prompt asynchronously using functions() introspection.
     * This is the preferred method that uses FlowQuery's built-in introspection.
     * 
     * @param additionalContext - Optional additional context to include in the prompt
     * @returns Promise resolving to the complete system prompt string
     */
    public static async generateAsync(additionalContext?: string): Promise<string> {
        // Use FlowQuery's functions() introspection to discover available loaders
        const plugins = await pluginRegistry.getAvailableLoadersAsync();
        const pluginDocs = this.generatePluginDocumentation(plugins);
        
        return this.buildSystemPrompt(pluginDocs, additionalContext);
    }
}

// Export functions for backward compatibility
export const generateFlowQuerySystemPrompt = FlowQuerySystemPrompt.generate.bind(FlowQuerySystemPrompt);
export const generateInterpretationPrompt = FlowQuerySystemPrompt.generateInterpretationPrompt.bind(FlowQuerySystemPrompt);
export const getMinimalFlowQueryPrompt = FlowQuerySystemPrompt.getMinimalPrompt.bind(FlowQuerySystemPrompt);
export const generateFlowQuerySystemPromptAsync = FlowQuerySystemPrompt.generateAsync.bind(FlowQuerySystemPrompt);

export default FlowQuerySystemPrompt;
