/**
 * LLM (Large Language Model) Client
 *
 * Provides functions for making OpenAI-compatible API calls.
 * Supports both regular and streaming responses.
 */
import { getStoredApiConfig } from "../components/ApiKeySettings";

export interface LlmOptions {
    /** System prompt to use */
    systemPrompt?: string;
    /** Conversation history */
    messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    /** Model to use (defaults to stored model or gpt-4o-mini) */
    model?: string;
    /** Temperature for response generation (0-2, default 0.7) */
    temperature?: number;
    /** Maximum tokens in response */
    maxTokens?: number;
    /** API key override (uses stored key if not provided) */
    apiKey?: string;
    /** Organization ID override (uses stored org if not provided) */
    organizationId?: string;
    /** Base URL for API (defaults to OpenAI) */
    baseUrl?: string;
}

export interface LlmMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

export interface LlmChoice {
    index: number;
    message: LlmMessage;
    finish_reason: string;
}

export interface LlmResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: LlmChoice[];
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export interface LlmStreamChoice {
    index: number;
    delta: {
        role?: string;
        content?: string;
    };
    finish_reason: string | null;
}

export interface LlmStreamChunk {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: LlmStreamChoice[];
}

/**
 * Get the API configuration, merging stored config with provided options.
 */
function getApiConfig(options: LlmOptions): {
    apiKey: string;
    orgId?: string;
    model: string;
    baseUrl: string;
} {
    const storedConfig = getStoredApiConfig();

    const apiKey = options.apiKey || storedConfig?.apiKey;
    if (!apiKey) {
        throw new Error("No API key configured. Please set your OpenAI API key in settings.");
    }

    return {
        apiKey,
        orgId: options.organizationId || storedConfig?.organizationId,
        model: options.model || storedConfig?.model || "gpt-4o-mini",
        baseUrl: options.baseUrl || "https://api.openai.com/v1",
    };
}

/**
 * Build the messages array for the API request.
 */
function buildMessages(content: string, options: LlmOptions): LlmMessage[] {
    const messages: LlmMessage[] = [];

    // Add system prompt if provided
    if (options.systemPrompt) {
        messages.push({
            role: "system",
            content: options.systemPrompt,
        });
    }

    // Add conversation history if provided
    if (options.messages && options.messages.length > 0) {
        messages.push(...options.messages);
    }

    // Add the current user message
    messages.push({
        role: "user",
        content,
    });

    return messages;
}

/**
 * Make a non-streaming LLM API call.
 *
 * @param content - The user's message content
 * @param options - LLM options including system prompt and conversation history
 * @returns Promise resolving to the LLM response
 */
export async function llm(content: string, options: LlmOptions = {}): Promise<LlmResponse> {
    const config = getApiConfig(options);
    const messages = buildMessages(content, options);

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
    };

    if (config.orgId) {
        headers["OpenAI-Organization"] = config.orgId;
    }

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            model: config.model,
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`LLM API error (${response.status}): ${errorBody}`);
    }

    return response.json();
}

/**
 * Make a streaming LLM API call.
 *
 * @param content - The user's message content
 * @param options - LLM options including system prompt and conversation history
 * @yields LLM stream chunks as they arrive
 */
export async function* llmStream(
    content: string,
    options: LlmOptions = {}
): AsyncGenerator<LlmStreamChunk, void, unknown> {
    const config = getApiConfig(options);
    const messages = buildMessages(content, options);

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
    };

    if (config.orgId) {
        headers["OpenAI-Organization"] = config.orgId;
    }

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            model: config.model,
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens,
            stream: true,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`LLM API error (${response.status}): ${errorBody}`);
    }

    if (!response.body) {
        throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE messages
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep incomplete line in buffer

            for (const line of lines) {
                const trimmedLine = line.trim();

                if (!trimmedLine || trimmedLine === ":") {
                    continue;
                }

                if (trimmedLine === "data: [DONE]") {
                    return;
                }

                if (trimmedLine.startsWith("data: ")) {
                    const jsonStr = trimmedLine.slice(6);
                    try {
                        const chunk = JSON.parse(jsonStr) as LlmStreamChunk;
                        yield chunk;
                    } catch {
                        // Skip invalid JSON chunks
                        console.warn("Failed to parse LLM stream chunk:", jsonStr);
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}
