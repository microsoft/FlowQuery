/**
 * FlowQuery System Prompt Generator
 *
 * Generates a system prompt that instructs the LLM to create FlowQuery statements
 * based on natural language queries, with awareness of the graph schema.
 *
 * Uses FlowQuery's built-in schema() introspection to dynamically discover
 * available nodes and relationships in the graph.
 */
import { getGraphSchema } from "../graph";

/**
 * FlowQuery language reference documentation.
 */
const FLOWQUERY_LANGUAGE_REFERENCE = `
## FlowQuery Language Reference

FlowQuery is a Cypher-inspired declarative query language for querying graph data. It uses pattern matching to traverse nodes and relationships.

### Graph Query Clauses

1. **MATCH** - Match patterns in the graph
   \`\`\`
   MATCH (n:Person)
   MATCH (a:User)-[:KNOWS]-(b:User)
   MATCH (user:User)-[:SENT]->(email:Email)
   MATCH p=(a:Person)-[:KNOWS*1..3]-(b:Person)
   \`\`\`

2. **WHERE** - Filter matched patterns
   \`\`\`
   MATCH (n:Person)
   WHERE n.age > 30
   
   MATCH (a:User)-[:SENT]-(email:Email)
   WHERE email.subject CONTAINS 'urgent'
   \`\`\`

3. **RETURN** - Specify output columns
   \`\`\`
   RETURN n.name, n.email
   RETURN n.name AS Name, n.email AS Email
   RETURN n  -- Return full node
   RETURN *  -- Return all matched variables
   \`\`\`

4. **WITH** - Define intermediate variables or chain queries
   \`\`\`
   MATCH (n:User)
   WITH n, size((n)-[:SENT]->()) AS emailCount
   WHERE emailCount > 5
   RETURN n.name, emailCount
   \`\`\`

5. **UNWIND** - Expand arrays into individual rows
   \`\`\`
   UNWIND [1, 2, 3] AS number
   UNWIND n.tags AS tag
   \`\`\`

### Pattern Syntax

- **Nodes**: \`(variable:Label)\` or \`(variable)\` or \`(:Label)\`
- **Relationships**: \`-[:TYPE]-\` (undirected), \`-[:TYPE]->\` (outgoing), \`<-[:TYPE]-\` (incoming)
- **Variable-length paths**: \`-[:TYPE*1..3]-\` (1 to 3 hops), \`-[:TYPE*]-\` (any number)
- **Named paths**: \`p=(a)-[:KNOWS]-(b)\`

### Examples

\`\`\`
// Find all users
MATCH (u:User)
RETURN u.name, u.email

// Find users and their managers
MATCH (user:User)-[:MANAGES]-(manager:User)
RETURN user.name AS Employee, manager.name AS Manager

// Find emails sent by a specific user
MATCH (u:User)-[:SENT]->(e:Email)
WHERE u.name = 'Alice'
RETURN e.subject, e.sentDate

// Find chain of relationships
MATCH (a:User)-[:KNOWS*1..2]-(b:User)
WHERE a.name = 'Bob'
RETURN b.name AS Connection
\`\`\`

### Built-in Functions

- **Aggregation**: \`count()\`, \`sum()\`, \`avg()\`, \`min()\`, \`max()\`, \`collect()\`
- **String**: \`size()\`, \`trim()\`, \`toLower()\`, \`toUpper()\`, \`split()\`, \`join()\`, \`replace()\`
- **List**: \`range()\`, \`head()\`, \`tail()\`, \`last()\`, \`size()\`, \`reverse()\`
- **Type**: \`type()\`, \`toInteger()\`, \`toFloat()\`, \`toString()\`
- **Utility**: \`keys()\`, \`properties()\`

### F-Strings (Template Literals)

Use \`f"..."\` for string interpolation:
\`\`\`
MATCH (u:User)
RETURN f"Name: {u.name}, Email: {u.email}" AS info
\`\`\`

### Comparison Operators

- \`=\`, \`<>\` (not equal), \`<\`, \`>\`, \`<=\`, \`>=\`
- \`AND\`, \`OR\`, \`NOT\`
- \`IN\`, \`CONTAINS\`, \`STARTS WITH\`, \`ENDS WITH\`
- \`IS NULL\`, \`IS NOT NULL\`
`;

/**
 * FlowQuery System Prompt Generator class.
 * Provides methods to generate various system prompts for LLM interactions.
 */
export class FlowQuerySystemPrompt {
    /**
     * Format the graph schema into readable documentation.
     * Accepts raw schema() results: array of { kind, label, type, sample }
     */
    private static formatSchemaDocumentation(schema: any[]): string {
        const sections: string[] = [];

        sections.push("## Graph Schema\n");
        sections.push(
            "The following nodes and relationships are available in the graph for use with `MATCH` queries:\n"
        );

        // Filter nodes and relationships from raw schema results
        const nodes = schema.filter((r) => r.kind === "node");
        const relationships = schema.filter((r) => r.kind === "relationship");

        // Document nodes
        sections.push("### Node Labels\n");
        if (nodes.length > 0) {
            for (const node of nodes) {
                sections.push(`#### \`${node.label}\``);
                // Extract properties from sample data
                if (node.sample && typeof node.sample === "object") {
                    const props = Object.entries(node.sample);
                    if (props.length > 0) {
                        sections.push("**Properties**:");
                        for (const [name, value] of props) {
                            const propType = Array.isArray(value) ? "array" : typeof value;
                            sections.push(`  - \`${name}\`: ${propType}`);
                        }
                    }
                    sections.push(`**Sample**: \`${JSON.stringify(node.sample)}\``);
                }
                sections.push("");
            }
        } else {
            sections.push("No nodes defined.\n");
        }

        // Document relationships
        sections.push("### Relationship Types\n");
        if (relationships.length > 0) {
            for (const rel of relationships) {
                sections.push(`#### \`[:${rel.type}]\``);
                // Extract properties from sample data
                if (rel.sample && typeof rel.sample === "object") {
                    const props = Object.entries(rel.sample);
                    if (props.length > 0) {
                        sections.push("**Properties**:");
                        for (const [name, value] of props) {
                            const propType = Array.isArray(value) ? "array" : typeof value;
                            sections.push(`  - \`${name}\`: ${propType}`);
                        }
                    }
                }
                sections.push("");
            }
        } else {
            sections.push("No relationships defined.\n");
        }

        return sections.join("\n");
    }

    /**
     * Internal helper to build the system prompt from schema documentation.
     */
    private static buildSystemPrompt(schemaDocs: string, additionalContext?: string): string {
        return `You are a FlowQuery assistant. Your primary role is to help users by creating and executing FlowQuery statements based on their natural language requests.

## How You Work

You operate in a multi-step process:
1. **Analyze** the user's natural language request
2. **Generate** a FlowQuery statement that fulfills the request using the graph schema
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

- Only use the nodes and relationships documented in the graph schema below
- Use proper FlowQuery syntax as documented in the language reference
- Use MATCH patterns to query the graph
- Always alias loaded items with \`AS\` for clarity
- Use meaningful aliases in RETURN statements for better readability
- Generate the simplest query that fulfills the user's request
- If you cannot determine what the user needs, ask clarifying questions (with [NO_QUERY_NEEDED])
- Do not use order by or coalesce
- Do not use list comprehension [i for i in ...]
- Do not use substring function
- Do not use limit or skip

${FLOWQUERY_LANGUAGE_REFERENCE}

${schemaDocs}

${additionalContext ? `## Additional Context\n\n${additionalContext}` : ""}

## Example Response Format

**When a query is needed**:
\`\`\`flowquery
MATCH (n:NodeLabel)-[:RELATIONSHIP]-(m:OtherLabel)
WHERE n.property = 'value'
RETURN n.name AS Name, m.value AS Value
\`\`\`

**When no query is needed** (e.g., general questions about FlowQuery):
[NO_QUERY_NEEDED]
Your direct answer here...

Now help the user with their request.`;
    }

    /**
     * Generate the complete FlowQuery system prompt.
     * Uses FlowQuery's schema() introspection to discover the graph structure.
     *
     * @param additionalContext - Optional additional context to include in the prompt
     * @returns Promise resolving to the complete system prompt string
     */
    public static async generate(additionalContext?: string): Promise<string> {
        const schema = await getGraphSchema();
        const schemaDocs = this.formatSchemaDocumentation(schema);

        return this.buildSystemPrompt(schemaDocs, additionalContext);
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
     *
     * @returns Promise resolving to minimal prompt string
     */
    public static async getMinimalPrompt(): Promise<string> {
        const schema = await getGraphSchema();
        const nodes = schema.filter((r: any) => r.kind === "node");
        const relationships = schema.filter((r: any) => r.kind === "relationship");

        const nodeList =
            nodes.length > 0 ? nodes.map((n: any) => `- \`${n.label}\``).join("\n") : "None";
        const relList =
            relationships.length > 0
                ? relationships.map((r: any) => `- \`[:${r.type}]\``).join("\n")
                : "None";

        return `You are a FlowQuery assistant. Generate FlowQuery statements based on user requests.

Available node labels:
${nodeList}

Available relationships:
${relList}

FlowQuery uses Cypher-like syntax: MATCH, WITH, UNWIND, WHERE, RETURN.
Use f"..." for string interpolation. Access properties with dot notation or brackets.

Always wrap FlowQuery code in \`\`\`flowquery code blocks.`;
    }
}

// Convenience function exports
export const generateFlowQuerySystemPrompt =
    FlowQuerySystemPrompt.generate.bind(FlowQuerySystemPrompt);
export const generateInterpretationPrompt =
    FlowQuerySystemPrompt.generateInterpretationPrompt.bind(FlowQuerySystemPrompt);
export const getMinimalFlowQueryPrompt =
    FlowQuerySystemPrompt.getMinimalPrompt.bind(FlowQuerySystemPrompt);

export default FlowQuerySystemPrompt;
