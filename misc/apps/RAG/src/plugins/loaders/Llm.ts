/**
 * OpenAI LLM Plugin: Call OpenAI-compatible APIs for chat completions.
 * 
 * Usage in FlowQuery:
 *   LOAD JSON FROM llm('What is the capital of France?') AS response
 *   RETURN response.choices[0].message.content
 * 
 * With custom options:
 *   LOAD JSON FROM llm('Translate to French: Hello', { model: 'gpt-4o', temperature: 0.3 }) AS response
 *   RETURN response.choices[0].message.content
 * 
 * This loader can also be used standalone outside of FlowQuery:
 *   import { LlmLoader } from './plugins/loaders/Llm';
 *   const loader = new LlmLoader();
 *   const response = await loader.complete('What is 2+2?');
 *   console.log(response.choices[0].message.content);
 */

import { FunctionDef } from 'flowquery/extensibility';

// Default configuration - can be overridden via options
const DEFAULT_CONFIG = {
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: undefined as number | undefined,
};

/**
 * Options for LLM requests.
 */
export interface LlmOptions {
    /** OpenAI API key. Configure in Settings or pass as option. */
    apiKey?: string;
    /** API endpoint URL. Defaults to OpenAI's chat completions endpoint. */
    apiUrl?: string;
    /** Model to use. Defaults to 'gpt-4o-mini'. */
    model?: string;
    /** Sampling temperature (0-2). Defaults to 0.7. */
    temperature?: number;
    /** Maximum tokens to generate. */
    maxTokens?: number;
    /** System prompt to set context for the conversation. */
    systemPrompt?: string;
    /** Additional messages to include in the conversation. */
    messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    /** Organization ID for OpenAI API. */
    organizationId?: string;
    /** Additional headers to include in the request. */
    headers?: Record<string, string>;
    /** Enable streaming response. */
    stream?: boolean;
    /** Additional body parameters to pass to the API. */
    additionalParams?: Record<string, any>;
}

/**
 * OpenAI-compatible chat completion response.
 */
export interface LlmResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

/**
 * LLM Loader class - calls OpenAI-compatible APIs for chat completions.
 */
@FunctionDef({
    isAsyncProvider: true,
    description: 'Calls OpenAI-compatible chat completion APIs. Supports GPT models and any OpenAI-compatible endpoint.',
    category: 'ai',
    parameters: [
        {
            name: 'prompt',
            description: 'The user prompt to send to the LLM',
            type: 'string',
            required: true,
            example: 'What is the capital of France?'
        },
        {
            name: 'options',
            description: 'Optional configuration for the LLM request',
            type: 'object',
            required: false,
            properties: {
                apiKey: { description: 'OpenAI API key', type: 'string' },
                apiUrl: { description: 'API endpoint URL (defaults to OpenAI chat completions)', type: 'string' },
                model: { description: 'Model to use (defaults to gpt-4o-mini)', type: 'string' },
                temperature: { description: 'Sampling temperature 0-2 (defaults to 0.7)', type: 'number' },
                maxTokens: { description: 'Maximum tokens to generate', type: 'number' },
                systemPrompt: { description: 'System prompt to set context', type: 'string' },
                messages: { description: 'Additional conversation messages', type: 'array' },
                organizationId: { description: 'OpenAI organization ID', type: 'string' },
                headers: { description: 'Additional request headers', type: 'object' },
                stream: { description: 'Enable streaming response', type: 'boolean' },
                additionalParams: { description: 'Additional API parameters', type: 'object' }
            }
        }
    ],
    output: {
        description: 'OpenAI chat completion response',
        type: 'object',
        properties: {
            id: { description: 'Unique identifier for the completion', type: 'string' },
            model: { description: 'Model used for completion', type: 'string' },
            choices: { 
                description: 'Array of completion choices', 
                type: 'array',
                example: [{ message: { role: 'assistant', content: 'Paris is the capital of France.' } }]
            },
            usage: { description: 'Token usage statistics', type: 'object' }
        }
    },
    examples: [
        "LOAD JSON FROM llm('What is 2+2?') AS response RETURN response.choices[0].message.content",
        "LOAD JSON FROM llm('Translate to French: Hello', { model: 'gpt-4o', temperature: 0.3 }) AS response RETURN response.choices[0].message.content",
        "LOAD JSON FROM llm('Write a haiku', { systemPrompt: 'You are a poet' }) AS response RETURN response.choices[0].message.content"
    ],
    notes: 'Requires API key configured in Settings or passed as apiKey option. Works with any OpenAI-compatible API by setting the apiUrl option.'
})
export class LlmLoader {
    private readonly defaultOptions: Partial<LlmOptions>;

    constructor(defaultOptions: Partial<LlmOptions> = {}) {
        this.defaultOptions = defaultOptions;
    }

    /**
     * Get API key from options or localStorage (browser).
     */
    private getApiKey(options?: LlmOptions): string {
        // First check options
        if (options?.apiKey) {
            return options.apiKey;
        }
        
        // Check default options
        if (this.defaultOptions.apiKey) {
            return this.defaultOptions.apiKey;
        }
        
        // In browser, check localStorage
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            const storedKey = localStorage.getItem('flowquery_openai_api_key');
            if (storedKey) {
                return storedKey;
            }
        }
        
        throw new Error(
            'OpenAI API key is required. Configure it in Settings or pass apiKey in options.'
        );
    }

    /**
     * Get stored configuration from localStorage (browser only).
     */
    private getStoredConfig(): Partial<LlmOptions> {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
            return {};
        }
        
        return {
            organizationId: localStorage.getItem('flowquery_openai_org_id') || undefined,
            model: localStorage.getItem('flowquery_openai_model') || undefined,
        };
    }

    /**
     * Build the request body for the API call.
     */
    private buildRequestBody(prompt: string, options?: LlmOptions): Record<string, any> {
        const messages: Array<{ role: string; content: string }> = [];

        // Add system prompt if provided
        if (options?.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
        }

        // Add any additional messages
        if (options?.messages) {
            messages.push(...options.messages);
        }

        // Add the user prompt
        messages.push({ role: 'user', content: prompt });

        const body: Record<string, any> = {
            model: options?.model || this.defaultOptions.model || DEFAULT_CONFIG.model,
            messages,
            temperature: options?.temperature ?? this.defaultOptions.temperature ?? DEFAULT_CONFIG.temperature,
            ...(options?.additionalParams || {}),
        };

        if (options?.maxTokens || this.defaultOptions.maxTokens || DEFAULT_CONFIG.maxTokens) {
            body.max_tokens = options?.maxTokens || this.defaultOptions.maxTokens || DEFAULT_CONFIG.maxTokens;
        }

        if (options?.stream) {
            body.stream = true;
        }

        return body;
    }

    /**
     * Build request headers.
     */
    private buildHeaders(apiKey: string, options?: LlmOptions): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            ...(options?.headers || {}),
        };

        if (options?.organizationId) {
            headers['OpenAI-Organization'] = options.organizationId;
        }

        return headers;
    }

    /**
     * Call the OpenAI-compatible API and return the full response.
     * 
     * @param prompt - The user prompt to send to the LLM
     * @param options - Optional configuration for the request
     * @returns The full API response
     * 
     * @example
     * ```typescript
     * const loader = new LlmLoader();
     * const response = await loader.complete('What is the capital of France?');
     * console.log(response.choices[0].message.content);
     * ```
     */
    async complete(prompt: string, options?: LlmOptions): Promise<LlmResponse> {
        // Merge stored config with provided options (options take precedence)
        const storedConfig = this.getStoredConfig();
        const mergedOptions = { ...this.defaultOptions, ...storedConfig, ...options };
        
        const apiKey = this.getApiKey(mergedOptions);
        const apiUrl = mergedOptions?.apiUrl || DEFAULT_CONFIG.apiUrl;
        const headers = this.buildHeaders(apiKey, mergedOptions);
        const body = this.buildRequestBody(prompt, mergedOptions);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`LLM API error (${response.status}): ${errorText}`);
        }

        return response.json();
    }

    /**
     * Call the OpenAI-compatible API with streaming and yield each chunk.
     * 
     * @param prompt - The user prompt to send to the LLM
     * @param options - Optional configuration for the request
     * @yields Parsed SSE data chunks from the stream
     * 
     * @example
     * ```typescript
     * const loader = new LlmLoader();
     * for await (const chunk of loader.stream('Tell me a story')) {
     *   if (chunk.choices?.[0]?.delta?.content) {
     *     process.stdout.write(chunk.choices[0].delta.content);
     *   }
     * }
     * ```
     */
    async *stream(prompt: string, options?: LlmOptions): AsyncGenerator<any, void, unknown> {
        // Merge stored config with provided options (options take precedence)
        const storedConfig = this.getStoredConfig();
        const mergedOptions = { ...this.defaultOptions, ...storedConfig, ...options };
        
        const apiKey = this.getApiKey(mergedOptions);
        const apiUrl = mergedOptions?.apiUrl || DEFAULT_CONFIG.apiUrl;
        const headers = this.buildHeaders(apiKey, mergedOptions);
        const body = this.buildRequestBody(prompt, { ...mergedOptions, stream: true });

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`LLM API error (${response.status}): ${errorText}`);
        }

        if (!response.body) {
            throw new Error('Response body is null');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('data: ')) {
                        const data = trimmed.slice(6);
                        if (data === '[DONE]') {
                            return;
                        }
                        try {
                            yield JSON.parse(data);
                        } catch {
                            // Skip invalid JSON chunks
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * Async generator provider for FlowQuery LOAD operations.
     */
    async *fetch(prompt: string, options?: LlmOptions): AsyncGenerator<any, void, unknown> {
        if (options?.stream) {
            yield* this.stream(prompt, options);
        } else {
            const response = await this.complete(prompt, options);
            yield response;
        }
    }

    /**
     * Extract just the text content from an LLM response.
     * Convenience method for common use case.
     * 
     * @param response - The LLM response object
     * @returns The text content from the first choice
     */
    static extractContent(response: LlmResponse): string {
        return response.choices?.[0]?.message?.content || '';
    }
}

/**
 * Call the OpenAI-compatible API and return the full response.
 * This function can be used standalone outside of FlowQuery.
 * 
 * @param prompt - The user prompt to send to the LLM
 * @param options - Optional configuration for the request
 * @returns The full API response
 * 
 * @example
 * ```typescript
 * import { llm } from './plugins/loaders/Llm';
 * 
 * // Simple usage
 * const response = await llm('What is the capital of France?');
 * console.log(response.choices[0].message.content);
 * 
 * // With options
 * const response = await llm('Translate to Spanish: Hello', {
 *   model: 'gpt-4o',
 *   temperature: 0.3,
 *   systemPrompt: 'You are a professional translator.'
 * });
 * ```
 */
export async function llm(prompt: string, options?: LlmOptions): Promise<LlmResponse> {
    return new LlmLoader().complete(prompt, options);
}

/**
 * Call the OpenAI-compatible API with streaming and yield each chunk.
 * This function can be used standalone outside of FlowQuery.
 * 
 * @param prompt - The user prompt to send to the LLM
 * @param options - Optional configuration for the request
 * @yields Parsed SSE data chunks from the stream
 * 
 * @example
 * ```typescript
 * import { llmStream } from './plugins/loaders/Llm';
 * 
 * for await (const chunk of llmStream('Tell me a story')) {
 *   if (chunk.choices?.[0]?.delta?.content) {
 *     process.stdout.write(chunk.choices[0].delta.content);
 *   }
 * }
 * ```
 */
export async function* llmStream(prompt: string, options?: LlmOptions): AsyncGenerator<any, void, unknown> {
    yield* new LlmLoader().stream(prompt, options);
}

/**
 * Extract just the text content from an LLM response.
 * Convenience function for common use case.
 * 
 * @param response - The LLM response object
 * @returns The text content from the first choice
 */
export function extractContent(response: LlmResponse): string {
    return LlmLoader.extractContent(response);
}

export default LlmLoader;
