/**
 * FlowQuery Agent
 * 
 * Orchestrates the multi-step flow:
 * 1. Send user query to LLM to generate a FlowQuery statement
 * 2. Execute the FlowQuery statement
 * 3. Send results back to LLM for interpretation
 * 4. Return final response to user
 */

import { llm, llmStream, LlmOptions, LlmResponse } from '../plugins/loaders/Llm';
import { FlowQueryExecutor, FlowQueryExecutionResult } from '../utils/FlowQueryExecutor';
import { extractFlowQuery, FlowQueryExtraction } from '../utils/FlowQueryExtractor';
import { isAdaptiveCard } from './AdaptiveCardRenderer';
import { generateInterpretationPrompt } from '../prompts';

/**
 * Represents a step in the agent's execution process.
 */
export interface AgentStep {
    type: 'query_generation' | 'query_execution' | 'interpretation' | 'direct_response' | 'retry';
    content: string;
    timestamp: Date;
    metadata?: {
        query?: string;
        executionResult?: FlowQueryExecutionResult;
        extraction?: FlowQueryExtraction;
    };
}

/**
 * Result of the agent's processing.
 */
export interface AgentResult {
    /** Final response text to show the user */
    finalResponse: string;
    /** Steps taken during processing (for debugging/transparency) */
    steps: AgentStep[];
    /** Whether processing was successful */
    success: boolean;
    /** Error message if processing failed */
    error?: string;
}

/**
 * Callback for streaming agent responses.
 */
export type AgentStreamCallback = (chunk: string, step: AgentStep['type']) => void;

/**
 * Options for the FlowQuery agent.
 */
export interface FlowQueryAgentOptions {
    /** System prompt for query generation */
    systemPrompt: string;
    /** LLM options to use */
    llmOptions?: LlmOptions;
    /** Conversation history */
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    /** Callback for streaming responses */
    onStream?: AgentStreamCallback;
    /** Whether to show intermediate steps to the user */
    showIntermediateSteps?: boolean;
    /** Maximum number of retry attempts for query execution (default: 2) */
    maxRetries?: number;
}

/**
 * FlowQuery Agent class that orchestrates the multi-step query processing flow.
 * 
 * @example
 * ```typescript
 * const agent = new FlowQueryAgent();
 * const result = await agent.processQuery("Show me all users", {
 *     systemPrompt: "You are a helpful assistant..."
 * });
 * ```
 */
export class FlowQueryAgent {
    private readonly flowQueryExecutor: FlowQueryExecutor;

    /**
     * Creates a new FlowQueryAgent instance.
     * @param executor - Optional custom FlowQueryExecutor instance. If not provided, a new one will be created.
     */
    constructor(executor?: FlowQueryExecutor) {
        this.flowQueryExecutor = executor ?? new FlowQueryExecutor();
    }

    /**
     * Process a user query through the FlowQuery agent.
     * 
     * @param userQuery - The natural language query from the user
     * @param options - Agent configuration options
     * @returns The agent result including final response and steps taken
     */
    async processQuery(
        userQuery: string,
        options: FlowQueryAgentOptions
    ): Promise<AgentResult> {
        const steps: AgentStep[] = [];
        const { systemPrompt, llmOptions = {}, conversationHistory = [], onStream, showIntermediateSteps = true } = options;

        try {
            // Step 1: Generate FlowQuery from natural language
            const generationResponse = await llm(userQuery, {
                ...llmOptions,
                systemPrompt,
                messages: conversationHistory,
            });

            const generationContent = generationResponse.choices[0]?.message?.content || '';
            
            steps.push({
                type: 'query_generation',
                content: generationContent,
                timestamp: new Date(),
            });

            // Step 2: Extract the FlowQuery from the response
            const extraction = extractFlowQuery(generationContent);

            // If no query needed (direct response from LLM)
            if (extraction.noQueryNeeded || !extraction.found) {
                const directResponse = extraction.directResponse || generationContent;
                
                steps.push({
                    type: 'direct_response',
                    content: directResponse,
                    timestamp: new Date(),
                    metadata: { extraction }
                });

                return {
                    finalResponse: directResponse,
                    steps,
                    success: true,
                };
            }

            // Step 3: Execute the FlowQuery
            let executionResult = await this.flowQueryExecutor.execute(extraction.query!);
            
            steps.push({
                type: 'query_execution',
                content: this.flowQueryExecutor.formatResult(executionResult),
                timestamp: new Date(),
                metadata: {
                    query: extraction.query!,
                    executionResult,
                    extraction
                }
            });

            // If execution failed, attempt retry with error context
            if (!executionResult.success) {
                const maxRetries = options.maxRetries ?? 2;
                let retryCount = 0;
                let currentQuery = extraction.query!;
                let currentError = executionResult.error;
                let currentResult = executionResult;

                while (!currentResult.success && retryCount < maxRetries) {
                    retryCount++;

                    steps.push({
                        type: 'retry',
                        content: `Retry ${retryCount}: Error was "${currentError}"`,
                        timestamp: new Date(),
                        metadata: {
                            query: currentQuery,
                            executionResult: currentResult
                        }
                    });

                    // Ask LLM to generate a corrected query
                    const correctedQuery = await this.generateCorrectedQuery(
                        userQuery,
                        currentQuery,
                        currentError || 'Unknown error',
                        steps,
                        options
                    );

                    if (!correctedQuery) {
                        // LLM couldn't generate a correction, fall back to error interpretation
                        const errorInterpretation = await this.interpretError(
                            userQuery,
                            currentQuery,
                            currentResult,
                            options
                        );
                        
                        return {
                            finalResponse: errorInterpretation,
                            steps,
                            success: false,
                            error: currentResult.error
                        };
                    }

                    // Try executing the corrected query
                    currentQuery = correctedQuery;
                    currentResult = await this.flowQueryExecutor.execute(correctedQuery);
                    currentError = currentResult.error;

                    steps.push({
                        type: 'query_execution',
                        content: this.flowQueryExecutor.formatResult(currentResult),
                        timestamp: new Date(),
                        metadata: {
                            query: correctedQuery,
                            executionResult: currentResult
                        }
                    });
                }

                // If still failing after retries, interpret the error
                if (!currentResult.success) {
                    const errorInterpretation = await this.interpretError(
                        userQuery,
                        currentQuery,
                        currentResult,
                        options
                    );
                    
                    return {
                        finalResponse: errorInterpretation,
                        steps,
                        success: false,
                        error: currentResult.error
                    };
                }

                // Update for interpretation phase
                executionResult = currentResult;
                extraction.query = currentQuery;
            }

            // Step 4: Send results to LLM for interpretation
            const interpretationPrompt = this.buildInterpretationPrompt(
                userQuery,
                extraction.query!,
                executionResult
            );

            let finalResponse = '';
            
            if (onStream) {
                // Stream the interpretation response
                for await (const chunk of llmStream(interpretationPrompt, {
                    ...llmOptions,
                    systemPrompt: generateInterpretationPrompt(),
                    messages: conversationHistory,
                })) {
                    const deltaContent = chunk.choices?.[0]?.delta?.content || '';
                    if (deltaContent) {
                        finalResponse += deltaContent;
                        onStream(deltaContent, 'interpretation');
                    }
                }
            } else {
                const interpretationResponse = await llm(interpretationPrompt, {
                    ...llmOptions,
                    systemPrompt: generateInterpretationPrompt(),
                    messages: conversationHistory,
                });
                finalResponse = interpretationResponse.choices[0]?.message?.content || '';
            }

            steps.push({
                type: 'interpretation',
                content: finalResponse,
                timestamp: new Date(),
            });

            // Build the complete response with optional intermediate steps
            let completeResponse = '';
            
            if (showIntermediateSteps && extraction.explanation) {
                completeResponse += extraction.explanation + '\n\n';
            }
            
            if (showIntermediateSteps) {
                completeResponse += `**Query executed:**\n\`\`\`flowquery\n${extraction.query}\n\`\`\`\n\n`;
            }
            
            completeResponse += finalResponse;

            return {
                finalResponse: completeResponse,
                steps,
                success: true,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            return {
                finalResponse: `⚠️ An error occurred: ${errorMessage}`,
                steps,
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * Process a query with streaming support for the final interpretation.
     */
    async *processQueryStream(
        userQuery: string,
        options: FlowQueryAgentOptions
    ): AsyncGenerator<{ chunk: string; step: AgentStep['type']; done: boolean; steps?: AgentStep[]; adaptiveCard?: Record<string, unknown>; newMessage?: boolean }, void, unknown> {
        const steps: AgentStep[] = [];
        const { systemPrompt, llmOptions = {}, conversationHistory = [], showIntermediateSteps = true } = options;

        try {
            // Step 1: Generate FlowQuery from natural language (non-streaming for speed)
            const generationResponse = await llm(userQuery, {
                ...llmOptions,
                systemPrompt,
                messages: conversationHistory,
            });

            const generationContent = generationResponse.choices[0]?.message?.content || '';
            
            steps.push({
                type: 'query_generation',
                content: generationContent,
                timestamp: new Date(),
            });

            // Step 2: Extract the FlowQuery
            const extraction = extractFlowQuery(generationContent);

            // If no query needed
            if (extraction.noQueryNeeded || !extraction.found) {
                const directResponse = extraction.directResponse || generationContent;
                
                steps.push({
                    type: 'direct_response',
                    content: directResponse,
                    timestamp: new Date(),
                    metadata: { extraction }
                });

                yield { chunk: directResponse, step: 'direct_response', done: true, steps };
                return;
            }

            // Emit intermediate step: show the query being executed
            if (showIntermediateSteps) {
                yield { 
                    chunk: `**Executing query:**\n\`\`\`flowquery\n${extraction.query}\n\`\`\`\n\n`, 
                    step: 'query_generation', 
                    done: false 
                };
            }

            // Step 3: Execute the FlowQuery
            let executionResult = await this.flowQueryExecutor.execute(extraction.query!);
            
            steps.push({
                type: 'query_execution',
                content: this.flowQueryExecutor.formatResult(executionResult),
                timestamp: new Date(),
                metadata: {
                    query: extraction.query!,
                    executionResult,
                    extraction
                }
            });

            // Handle execution errors with retry logic
            if (!executionResult.success) {
                const maxRetries = options.maxRetries ?? 2;
                let retryCount = 0;
                let currentQuery = extraction.query!;
                let currentError = executionResult.error;
                let currentResult = executionResult;

                while (!currentResult.success && retryCount < maxRetries) {
                    retryCount++;
                    
                    // Complete the previous message before starting a new one
                    yield { 
                        chunk: '', 
                        step: 'query_execution', 
                        done: true 
                    };
                
                    // Notify user of retry attempt - start a new message for the retry
                    yield { 
                        chunk: `⚠️ The previous query failed: ${currentError}\n\n🔄 Attempting to fix (retry ${retryCount}/${maxRetries})...\n\n`, 
                        step: 'retry', 
                        done: false,
                        newMessage: true
                    };

                    steps.push({
                        type: 'retry',
                        content: `Retry ${retryCount}: Error was "${currentError}"`,
                        timestamp: new Date(),
                        metadata: {
                            query: currentQuery,
                            executionResult: currentResult
                        }
                    });

                    // Ask LLM to generate a corrected query
                    const correctedQuery = await this.generateCorrectedQuery(
                        userQuery,
                        currentQuery,
                        currentError || 'Unknown error',
                        steps,
                        options
                    );

                    if (!correctedQuery) {
                        // LLM couldn't generate a correction
                        yield { 
                            chunk: `Unable to generate a corrected query. Please try rephrasing your request.\n`, 
                            step: 'retry', 
                            done: true, 
                            steps 
                        };
                        return;
                    }

                    // Show the corrected query
                    if (showIntermediateSteps) {
                        yield { 
                            chunk: `**Corrected query:**\n\`\`\`flowquery\n${correctedQuery}\n\`\`\`\n\n`, 
                            step: 'retry', 
                            done: false 
                        };
                    }

                    // Try executing the corrected query
                    currentQuery = correctedQuery;
                    currentResult = await this.flowQueryExecutor.execute(correctedQuery);
                    currentError = currentResult.error;

                    steps.push({
                        type: 'query_execution',
                        content: this.flowQueryExecutor.formatResult(currentResult),
                        timestamp: new Date(),
                        metadata: {
                            query: correctedQuery,
                            executionResult: currentResult
                        }
                    });
                }

                // If still failing after retries, give up
                if (!currentResult.success) {
                    const errorMessage = `⚠️ Query execution failed after ${maxRetries} retries: ${currentError}\n\nLast query attempted:\n\`\`\`flowquery\n${currentQuery}\n\`\`\``;
                    yield { chunk: errorMessage, step: 'query_execution', done: true, steps };
                    return;
                }

                // Mark the retry message as complete before proceeding to interpretation
                yield { 
                    chunk: '', 
                    step: 'retry', 
                    done: true 
                };

                // Update executionResult for interpretation phase
                executionResult = currentResult;
                extraction.query = currentQuery;
            }

            // Check if the result contains an Adaptive Card
            const adaptiveCard = this.extractAdaptiveCardFromResults(executionResult.results);

            // Step 4: Stream the interpretation
            const interpretationPrompt = this.buildInterpretationPrompt(
                userQuery,
                extraction.query!,
                executionResult,
                !!adaptiveCard
            );

            let interpretationContent = '';

            for await (const chunk of llmStream(interpretationPrompt, {
                ...llmOptions,
                systemPrompt: generateInterpretationPrompt(),
                messages: conversationHistory,
            })) {
                const deltaContent = chunk.choices?.[0]?.delta?.content || '';
                if (deltaContent) {
                    interpretationContent += deltaContent;
                    yield { chunk: deltaContent, step: 'interpretation', done: false };
                }
            }

            steps.push({
                type: 'interpretation',
                content: interpretationContent,
                timestamp: new Date(),
            });

            yield { chunk: '', step: 'interpretation', done: true, steps, adaptiveCard };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            yield { 
                chunk: `⚠️ An error occurred: ${errorMessage}`, 
                step: 'interpretation', 
                done: true, 
                steps 
            };
        }
    }

    /**
     * Extract an Adaptive Card from the execution results.
     * Checks if any result is an Adaptive Card (type: "AdaptiveCard") and returns it.
     * Searches for Adaptive Cards at the top level or within any property of result objects.
     */
    private extractAdaptiveCardFromResults(results: unknown[] | undefined): Record<string, unknown> | undefined {
        if (!results || !Array.isArray(results)) {
            return undefined;
        }

        for (const result of results) {
            // Check if the result itself is an Adaptive Card
            if (isAdaptiveCard(result)) {
                return result;
            }
            
            // Check if any property of the result object is an Adaptive Card
            if (typeof result === 'object' && result !== null) {
                const obj = result as Record<string, unknown>;
                for (const value of Object.values(obj)) {
                    if (isAdaptiveCard(value)) {
                        return value as Record<string, unknown>;
                    }
                }
            }
        }

        return undefined;
    }

    /**
     * Build the prompt for the interpretation phase.
     */
    private buildInterpretationPrompt(
        originalQuery: string,
        flowQuery: string,
        executionResult: FlowQueryExecutionResult,
        hasAdaptiveCard: boolean = false
    ): string {
        const resultsJson = JSON.stringify(executionResult.results, null, 2);
        const resultCount = executionResult.results?.length || 0;
        
        let prompt = `The user asked: "${originalQuery}"

This was translated to the following FlowQuery:
\`\`\`flowquery
${flowQuery}
\`\`\`

The query executed successfully in ${executionResult.executionTime.toFixed(2)}ms and returned ${resultCount} result(s):

\`\`\`json
${resultsJson}
\`\`\`

`;

        if (hasAdaptiveCard) {
            prompt += `The result is an Adaptive Card that will be rendered automatically in the UI. Please provide a brief introduction or context for the data shown in the card, but do NOT recreate the table or list the data in your response since the card will display it visually.`;
        } else {
            prompt += `Please interpret these results and provide a helpful response to the user's original question.`;
        }

        return prompt;
    }

    /**
     * Generate a corrected FlowQuery by sending the error back to the LLM.
     * This is used for retry logic when query execution fails.
     */
    private async generateCorrectedQuery(
        originalQuery: string,
        failedQuery: string,
        errorMessage: string,
        previousSteps: AgentStep[],
        options: FlowQueryAgentOptions
    ): Promise<string | null> {
        const { systemPrompt, llmOptions = {}, conversationHistory = [] } = options;

        // Build context from previous steps
        const stepsContext = previousSteps
            .filter(step => step.type === 'query_execution' || step.type === 'retry')
            .map(step => {
                if (step.type === 'retry') {
                    return `- Retry attempt: ${step.content}`;
                }
                return `- Query: \`${step.metadata?.query}\` → Error: ${step.metadata?.executionResult?.error || 'unknown'}`;
            })
            .join('\n');

        const retryPrompt = `The user asked: "${originalQuery}"

I generated the following FlowQuery:
\`\`\`flowquery
${failedQuery}
\`\`\`

However, the query failed with this error:
${errorMessage}

${stepsContext ? `Previous attempts:\n${stepsContext}\n\n` : ''}Please analyze the error and generate a CORRECTED FlowQuery that will work. Pay close attention to:
- Syntax errors in the query
- Incorrect loader names or function names
- Missing or incorrect parameters
- Data type mismatches

Generate the corrected query using the same format as before (with explanation if needed).`;

        try {
            const response = await llm(retryPrompt, {
                ...llmOptions,
                systemPrompt,
                messages: conversationHistory,
            });

            const responseContent = response.choices[0]?.message?.content || '';
            const extraction = extractFlowQuery(responseContent);

            if (extraction.found && extraction.query) {
                return extraction.query;
            }

            return null;
        } catch (error) {
            console.error('Error generating corrected query:', error);
            return null;
        }
    }

    /**
     * Handle execution errors by asking LLM to explain or suggest fixes.
     */
    private async interpretError(
        originalQuery: string,
        flowQuery: string,
        executionResult: FlowQueryExecutionResult,
        options: FlowQueryAgentOptions
    ): Promise<string> {
        const errorPrompt = `The user asked: "${originalQuery}"

This was translated to the following FlowQuery:
\`\`\`flowquery
${flowQuery}
\`\`\`

However, the query failed with the following error:
${executionResult.error}

Please explain what went wrong in user-friendly terms and, if possible, suggest how to fix the issue or rephrase their request.`;

        const response = await llm(errorPrompt, {
            ...options.llmOptions,
            systemPrompt: 'You are a helpful assistant explaining query errors. Be concise and helpful.',
            messages: options.conversationHistory,
        });

        return response.choices[0]?.message?.content || 
            `The query failed with error: ${executionResult.error}`;
    }
}

// Create a default instance for convenience
const defaultAgent = new FlowQueryAgent();

/**
 * Process a user query through the FlowQuery agent.
 * 
 * @param userQuery - The natural language query from the user
 * @param options - Agent configuration options
 * @returns The agent result including final response and steps taken
 * @deprecated Use `new FlowQueryAgent().processQuery()` instead
 */
export async function processQuery(
    userQuery: string,
    options: FlowQueryAgentOptions
): Promise<AgentResult> {
    return defaultAgent.processQuery(userQuery, options);
}

/**
 * Process a query with streaming support for the final interpretation.
 * @deprecated Use `new FlowQueryAgent().processQueryStream()` instead
 */
export function processQueryStream(
    userQuery: string,
    options: FlowQueryAgentOptions
): AsyncGenerator<{ chunk: string; step: AgentStep['type']; done: boolean; steps?: AgentStep[]; adaptiveCard?: Record<string, unknown>; newMessage?: boolean }, void, unknown> {
    return defaultAgent.processQueryStream(userQuery, options);
}

export default FlowQueryAgent;
