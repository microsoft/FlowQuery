/**
 * Example plugin: Fetch random cat facts from the Cat Facts API.
 * 
 * Usage in FlowQuery:
 *   LOAD JSON FROM catFacts(5) AS fact
 *   RETURN fact.text
 */

import { FunctionDef } from 'flowquery/extensibility';

const CAT_FACTS_API = 'https://catfact.ninja/facts';

/**
 * CatFacts loader class - fetches random cat facts from the Cat Facts API.
 */
@FunctionDef({
    isAsyncProvider: true,
    description: 'Fetches random cat facts from the Cat Facts API (catfact.ninja)',
    category: 'examples',
    parameters: [
        {
            name: 'count',
            description: 'Number of cat facts to fetch',
            type: 'number',
            required: false,
            default: 1
        }
    ],
    output: {
        description: 'Cat fact object',
        type: 'object',
        properties: {
            text: { description: 'The cat fact text', type: 'string' },
            length: { description: 'Length of the fact text', type: 'number' }
        }
    },
    examples: [
        "LOAD JSON FROM catFacts() AS fact RETURN fact.text",
        "LOAD JSON FROM catFacts(5) AS fact RETURN fact.text, fact.length AS length"
    ]
})
export class CatFactsLoader {
    private readonly apiUrl: string;

    constructor(apiUrl: string = CAT_FACTS_API) {
        this.apiUrl = apiUrl;
    }

    /**
     * Fetches random cat facts from the Cat Facts API.
     * 
     * @param count - Number of cat facts to fetch (default: 1)
     */
    async *fetch(count: number = 1): AsyncGenerator<any, void, unknown> {
        const url = `${this.apiUrl}?limit=${count}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch cat facts: ${response.statusText}`);
        }

        const json = await response.json();
        const data = json.data || [];
        
        for (const item of data) {
            // Map 'fact' to 'text' for backwards compatibility with existing queries
            yield {
                text: item.fact,
                length: item.length
            };
        }
    }
}

export default CatFactsLoader;
