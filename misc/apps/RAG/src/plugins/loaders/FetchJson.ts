/**
 * Example plugin: Fetch JSON data from a URL.
 *
 * Usage in FlowQuery:
 *   CALL fetchJson('https://api.example.com/data') YIELD name, value
 */
import { AsyncFunction, FunctionDef } from "flowquery/extensibility";

/**
 * FetchJson class - fetches JSON data from a URL and yields items.
 */
@FunctionDef({
    description:
        "Fetches JSON data from a URL. If the response is an array, yields each item individually.",
    category: "async",
    parameters: [
        {
            name: "url",
            description: "The URL to fetch JSON from",
            type: "string",
            required: true,
        },
        {
            name: "options",
            description: "Optional fetch options (headers, method, etc.)",
            type: "object",
            required: false,
        },
    ],
    output: {
        description: "JSON data items",
        type: "object",
    },
    examples: [
        "CALL fetchJson('https://api.example.com/users') YIELD name",
        "CALL fetchJson('https://api.example.com/data') YIELD name, active WHERE active = true",
    ],
})
export class FetchJson extends AsyncFunction {
    /**
     * Fetches JSON data from a URL and yields each item if array, or the object itself.
     *
     * @param url - The URL to fetch JSON from
     * @param options - Optional fetch options
     */
    async *generate(url: string, options?: RequestInit): AsyncGenerator<any, void, unknown> {
        const response = await fetch(url, options);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (Array.isArray(data)) {
            for (const item of data) {
                yield item;
            }
        } else {
            yield data;
        }
    }
}

export default FetchJson;
