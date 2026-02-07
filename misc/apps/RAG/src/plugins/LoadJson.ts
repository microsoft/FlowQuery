/**
 * Plugin: Load JSON data from a file.
 *
 * Usage in FlowQuery:
 *   CALL loadJson('path/to/file.json') YIELD name, value
 */
import { AsyncFunction, FunctionDef } from "flowquery/extensibility";

// Base path for data files - served from the web server's /data/ directory
const DATA_BASE_PATH = "/data";

/**
 * LoadJson class - loads JSON data from a file and yields items.
 * Uses fetch API for browser compatibility.
 */
@FunctionDef({
    description:
        "Loads JSON data from a file. If the data is an array, yields each item individually. " +
        "File paths are relative to the data folder.",
    category: "async",
    parameters: [
        {
            name: "filename",
            description: "The filename to load (relative to data folder, e.g., 'users.json')",
            type: "string",
            required: true,
        },
    ],
    output: {
        description: "JSON data items",
        type: "object",
    },
    examples: [
        "CALL loadJson('users.json') YIELD id, displayName, mail",
        "CALL loadJson('emails.json') YIELD subject, from, to WHERE importance = 'high'",
    ],
})
export class LoadJson extends AsyncFunction {
    constructor() {
        super("loadJson");
    }

    /**
     * Loads JSON data from a file and yields each item if array, or the object itself.
     * Uses fetch API for browser compatibility.
     *
     * @param filename - The filename to load (relative to data folder)
     */
    async *generate(filename: string): AsyncGenerator<any, void, unknown> {
        // Sanitize filename to prevent directory traversal
        const sanitizedFilename = filename.replace(/^[./\\]+/, "").replace(/\.\./g, "");
        const url = `${DATA_BASE_PATH}/${sanitizedFilename}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`File not found: ${sanitizedFilename} (HTTP ${response.status})`);
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

export default LoadJson;
