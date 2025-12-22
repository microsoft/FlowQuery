/**
 * Plugin loader - automatically discovers and loads all plugins.
 * 
 * To add a new plugin:
 * 1. Create a new file in the `loaders/` directory
 * 2. Export your plugin(s) following the AsyncLoaderPlugin interface
 * 3. Import and add to the plugins array in this file
 */

import pluginRegistry from './PluginRegistry';
import { AsyncLoaderPlugin, PluginMetadata } from './types';

// Import individual plugins
import fetchJsonPlugin from './loaders/FetchJson';
import catFactsPlugin from './loaders/CatFacts';
import mockDataPlugins from './loaders/MockData';
import llmPlugin from './loaders/Llm';

/**
 * All plugins to be loaded on startup.
 * Add new plugins here as they are created.
 */
const allPlugins: AsyncLoaderPlugin[] = [
    fetchJsonPlugin,
    catFactsPlugin,
    ...mockDataPlugins,
    llmPlugin,
];

/**
 * Initialize and load all plugins.
 * Call this function once on app startup.
 */
export function initializePlugins(): void {
    console.log('Initializing FlowQuery plugins...');
    pluginRegistry.registerAll(allPlugins);
    console.log(`Loaded ${pluginRegistry.getLoadedPlugins().length} plugins`);
}

/**
 * Get the list of loaded plugin names.
 * Uses FlowQuery's introspection to discover registered async providers.
 */
export function getLoadedPluginNames(): string[] {
    return pluginRegistry.getLoadedPlugins();
}

/**
 * Get metadata for all loaded plugins.
 * Uses FlowQuery's functions() introspection as the single source of truth.
 */
export function getAllPluginMetadata(): PluginMetadata[] {
    return pluginRegistry.getAllPluginMetadata();
}

/**
 * Get all available async loader plugins by querying FlowQuery directly.
 * This is the preferred async method that uses functions() introspection.
 * 
 * @returns Promise resolving to array of plugin metadata
 */
export async function getAvailableLoaders(): Promise<PluginMetadata[]> {
    return pluginRegistry.getAvailableLoadersAsync();
}

// Re-export types and registry for external use
export { pluginRegistry } from './PluginRegistry';
export type { AsyncLoaderPlugin, PluginModule, PluginMetadata, AsyncDataProvider, ParameterSchema, OutputSchema, FunctionMetadata } from './types';

// Re-export standalone loader functions for use outside of FlowQuery
export { llm, llmStream, extractContent } from './loaders/Llm';
export type { LlmOptions, LlmResponse } from './loaders/Llm';
