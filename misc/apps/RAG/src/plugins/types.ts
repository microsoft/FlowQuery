/**
 * Plugin type definitions for FlowQuery async data loaders.
 * 
 * Re-exports core types from FlowQuery library for consistency.
 */

import {
    ParameterSchema,
    OutputSchema,
    FunctionMetadata,
    AsyncDataProvider
} from 'flowquery';

// Re-export core types from FlowQuery
export { ParameterSchema, OutputSchema, FunctionMetadata, AsyncDataProvider };

/**
 * Alias for FunctionMetadata - used for plugin definitions.
 * This type is identical to FunctionMetadata from FlowQuery.
 */
export type PluginMetadata = FunctionMetadata;

/**
 * A plugin definition for an async data loader.
 */
export interface AsyncLoaderPlugin {
    /**
     * The name of the function as it will be used in FlowQuery.
     * Will be lowercased when registered.
     */
    name: string;

    /**
     * The async data provider function.
     */
    provider: AsyncDataProvider;

    /**
     * Optional metadata describing the function for LLM consumption.
     */
    metadata?: Omit<PluginMetadata, 'name'>;
}

/**
 * Interface that plugin modules should export.
 */
export interface PluginModule {
    /**
     * Array of plugins defined in this module.
     */
    plugins: AsyncLoaderPlugin[];
}
