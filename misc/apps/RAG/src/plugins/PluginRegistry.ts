/**
 * Plugin registry for loading and managing FlowQuery async data loader plugins.
 * 
 * This registry uses FlowQuery's built-in function introspection via the functions()
 * function as the single source of truth for available loaders and their metadata.
 */

import FlowQuery from 'flowquery';
import { AsyncLoaderPlugin, PluginMetadata, PluginModule } from './types';

/**
 * Registry for managing FlowQuery plugins.
 * 
 * Uses FlowQuery's `functions()` introspection as the source of truth,
 * eliminating duplicate tracking of registered plugins.
 */
class PluginRegistry {
    /**
     * Register a single plugin with FlowQuery.
     * 
     * @param plugin - The plugin to register
     */
    public register(plugin: AsyncLoaderPlugin): void {
        // Register with FlowQuery - it becomes the source of truth
        if (plugin.metadata) {
            FlowQuery.registerAsyncProvider(plugin.name, {
                provider: plugin.provider,
                metadata: {
                    name: plugin.name,
                    ...plugin.metadata
                }
            });
        } else {
            FlowQuery.registerAsyncProvider(plugin.name, plugin.provider);
        }

        console.log(`Registered plugin: ${plugin.name}`);
    }

    /**
     * Register multiple plugins at once.
     * 
     * @param plugins - Array of plugins to register
     */
    public registerAll(plugins: AsyncLoaderPlugin[]): void {
        for (const plugin of plugins) {
            this.register(plugin);
        }
    }

    /**
     * Load plugins from a plugin module.
     * 
     * @param module - The plugin module to load
     */
    public loadModule(module: PluginModule): void {
        this.registerAll(module.plugins);
    }

    /**
     * Unregister a plugin by name.
     * 
     * @param name - The plugin name to unregister
     */
    public unregister(name: string): void {
        FlowQuery.unregisterAsyncProvider(name);
        console.log(`Unregistered plugin: ${name}`);
    }

    /**
     * Get all loaded async provider names by querying FlowQuery directly.
     * 
     * @returns Array of registered async provider names
     */
    public getLoadedPlugins(): string[] {
        // Use FlowQuery's FunctionFactory to get async provider names
        const allFunctions = FlowQuery.listFunctions({ asyncOnly: true });
        return allFunctions.map(f => f.name);
    }

    /**
     * Check if a plugin is registered by querying FlowQuery.
     * 
     * @param name - The plugin name to check
     * @returns True if the plugin is registered
     */
    public isRegistered(name: string): boolean {
        const plugins = this.getLoadedPlugins();
        return plugins.some(p => p.toLowerCase() === name.toLowerCase());
    }

    /**
     * Get all plugin metadata for registered async providers.
     * Uses FlowQuery's functions() introspection as the single source of truth.
     * 
     * @returns Array of plugin metadata objects
     */
    public getAllPluginMetadata(): PluginMetadata[] {
        // Query FlowQuery directly for all async providers with their metadata
        const asyncFunctions = FlowQuery.listFunctions({ asyncOnly: true });
        
        return asyncFunctions.map(f => ({
            name: f.name,
            description: f.description,
            category: f.category,
            parameters: f.parameters || [],
            output: f.output || { description: 'Data items', type: 'object' },
            examples: f.examples,
            notes: f.notes
        }));
    }

    /**
     * Get all plugin metadata asynchronously using a FlowQuery statement.
     * This demonstrates the functions() approach for dynamic discovery.
     * 
     * @returns Promise resolving to array of plugin metadata
     */
    public async getAvailableLoadersAsync(): Promise<PluginMetadata[]> {
        const runner = new FlowQuery(`
            WITH functions() AS funcs 
            UNWIND funcs AS f 
            WHERE f.isAsyncProvider = true
            RETURN f
        `);
        await runner.run();
        return runner.results.map((r: any) => r.expr0 as PluginMetadata);
    }
}

/**
 * Global plugin registry instance.
 */
export const pluginRegistry = new PluginRegistry();

export default pluginRegistry;
