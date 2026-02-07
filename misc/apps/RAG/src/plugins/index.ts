/**
 * Plugin loader - automatically discovers and loads all plugins.
 *
 * To add a new plugin:
 * 1. Create a new file in the `plugins/` directory
 * 2. Add the @FunctionDef decorator with category: 'async' to your loader class
 * 3. Import the class in this file (the decorator auto-registers with FlowQuery)
 */
import FlowQuery from "flowquery";

// Import plugin classes explicitly to prevent webpack tree-shaking
// The @FunctionDef decorator registers them with FlowQuery when the class is loaded
import LoadJson from "./LoadJson";

// Reference to prevent tree-shaking (webpack removes side-effect-only imports)
const _plugins = [LoadJson];

/**
 * Initialize plugins.
 * Plugins are auto-registered via @FunctionDef decorators when imported.
 * This function just logs the registered plugins for debugging.
 */
export function initializePlugins(): void {
    // Force plugins to be retained by webpack
    if (_plugins.length === 0) throw new Error("No plugins loaded");

    const plugins = FlowQuery.listFunctions({ asyncOnly: true }).map((f) => f.name);
    console.log(`FlowQuery plugins loaded: ${plugins.join(", ")}`);
}

/**
 * Get the graph schema including all node labels and relationship types.
 *
 * @returns Promise resolving to the graph schema
 */
export async function getGraphSchema(): Promise<any> {
    const runner = new FlowQuery(
        `CALL schema() YIELD kind, label, type, sample RETURN kind, label, type, sample`
    );
    await runner.run();
    console.log("Graph schema retrieved successfully.");
    console.table(runner.results);
    return runner.results;
}
