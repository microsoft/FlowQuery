/**
 * Example plugin: Fetch random cat facts from the Cat Facts API.
 *
 * Usage in FlowQuery:
 *   CALL catFacts(5) YIELD text, length
 */
import { AsyncFunction, FunctionDef } from "flowquery/extensibility";

const CAT_FACTS_API = "https://catfact.ninja/facts";

/**
 * CatFacts class - fetches random cat facts from the Cat Facts API.
 */
@FunctionDef({
    description: "Fetches random cat facts from the Cat Facts API (catfact.ninja)",
    category: "async",
    parameters: [
        {
            name: "count",
            description: "Number of cat facts to fetch",
            type: "number",
            required: false,
            default: 1,
        },
    ],
    output: {
        description: "Cat fact object",
        type: "object",
        properties: {
            text: { description: "The cat fact text", type: "string" },
            length: { description: "Length of the fact text", type: "number" },
        },
    },
    examples: ["CALL catFacts() YIELD text", "CALL catFacts(5) YIELD text, length"],
})
export class CatFacts extends AsyncFunction {
    private readonly apiUrl: string;

    constructor(apiUrl: string = CAT_FACTS_API) {
        super();
        this.apiUrl = apiUrl;
    }

    /**
     * Fetches random cat facts from the Cat Facts API.
     *
     * @param count - Number of cat facts to fetch (default: 1)
     */
    async *generate(count: number = 1): AsyncGenerator<any, void, unknown> {
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
                length: item.length,
            };
        }
    }
}

export default CatFacts;
