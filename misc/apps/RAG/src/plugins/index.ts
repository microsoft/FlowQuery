/**
 * Plugin loader - automatically discovers and loads all plugins.
 * 
 * To add a new plugin:
 * 1. Create a new file in the `loaders/` directory
 * 2. Add the @FunctionDef decorator with category: 'async' to your loader class
 * 3. Import the class in this file (the decorator auto-registers with FlowQuery)
 */

import FlowQuery from 'flowquery';
import { FunctionMetadata } from 'flowquery/extensibility';

// Import plugin classes - the @FunctionDef decorator auto-registers them with FlowQuery
// This step is essential to ensure decorators are executed so that plugins are registered with FlowQuery
import './loaders/FetchJson';
import './loaders/CatFacts';
import './loaders/MockData';
import './loaders/Llm';
import './loaders/Table';
import './loaders/Form';
import './loaders/Weather';

/**
 * Initialize plugins.
 * Plugins are auto-registered via @FunctionDef decorators when imported.
 * This function just logs the registered plugins for debugging.
 */
export function initializePlugins(): void {
    const plugins = getLoadedPluginNames();
    console.log(`FlowQuery plugins loaded: ${plugins.join(', ')}`);
}

/**
 * Get the list of loaded plugin names.
 * Uses FlowQuery's introspection to discover registered async providers.
 */
export function getLoadedPluginNames(): string[] {
    return FlowQuery.listFunctions({ asyncOnly: true }).map(f => f.name);
}

/**
 * Get metadata for all loaded plugins.
 * Uses FlowQuery's functions() introspection as the single source of truth.
 */
export function getAllPluginMetadata(): FunctionMetadata[] {
    return FlowQuery.listFunctions({ asyncOnly: true });
}

/**
 * Get all available async loader plugins by querying FlowQuery directly.
 * This is the preferred async method that uses functions() introspection.
 * 
 * @returns Promise resolving to array of plugin metadata
 */
export async function getAvailableLoaders(): Promise<FunctionMetadata[]> {
    const runner = new FlowQuery(`
        WITH functions() AS funcs 
        UNWIND funcs AS f 
        WHERE f.isAsyncProvider = true
        RETURN f
    `);
    await runner.run();
    return runner.results.map((r: any) => r.expr0 as FunctionMetadata);
}

// Re-export types for external use
export type { FunctionMetadata, FunctionDefOptions, ParameterSchema, OutputSchema } from 'flowquery/extensibility';
export { FunctionDef } from 'flowquery/extensibility';

// Re-export standalone loader functions for use outside of FlowQuery
export { llm, llmStream, extractContent } from './loaders/Llm';
export type { LlmOptions, LlmResponse } from './loaders/Llm';
