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

// Shared executor instance
const flowQueryExecutor = new FlowQueryExecutor();
import { generateInterpretationPrompt } from '../prompts';

/**
 * Represents a step in the agent's execution process.
 */
export interface AgentStep {
    type: 'query_generation' | 'query_execution' | 'interpretation' | 'direct_response';
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
    /** Maximum number of retry attempts for query execution */
    maxRetries?: number;
}

/**
 * Process a user query through the FlowQuery agent.
 * 
 * @param userQuery - The natural language query from the user
 * @param options - Agent configuration options
 * @returns The agent result including final response and steps taken
 */
export async function processQuery(
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
        const executionResult = await flowQueryExecutor.execute(extraction.query!);
        
        steps.push({
            type: 'query_execution',
            content: flowQueryExecutor.formatResult(executionResult),
            timestamp: new Date(),
            metadata: {
                query: extraction.query!,
                executionResult,
                extraction
            }
        });

        // If execution failed, ask LLM to fix the query or explain the error
        if (!executionResult.success) {
            const errorInterpretation = await interpretError(
                userQuery,
                extraction.query!,
                executionResult,
                options
            );
            
            return {
                finalResponse: errorInterpretation,
                steps,
                success: false,
                error: executionResult.error
            };
        }

        // Step 4: Send results to LLM for interpretation
        const interpretationPrompt = buildInterpretationPrompt(
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
export async function* processQueryStream(
    userQuery: string,
    options: FlowQueryAgentOptions
): AsyncGenerator<{ chunk: string; step: AgentStep['type']; done: boolean; steps?: AgentStep[] }, void, unknown> {
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
        const executionResult = await flowQueryExecutor.execute(extraction.query!);
        
        steps.push({
            type: 'query_execution',
            content: flowQueryExecutor.formatResult(executionResult),
            timestamp: new Date(),
            metadata: {
                query: extraction.query!,
                executionResult,
                extraction
            }
        });

        // Handle execution errors
        if (!executionResult.success) {
            const errorMessage = `⚠️ Query execution failed: ${executionResult.error}\n\nQuery attempted:\n\`\`\`flowquery\n${extraction.query}\n\`\`\``;
            yield { chunk: errorMessage, step: 'query_execution', done: true, steps };
            return;
        }

        // Step 4: Stream the interpretation
        const interpretationPrompt = buildInterpretationPrompt(
            userQuery,
            extraction.query!,
            executionResult
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

        yield { chunk: '', step: 'interpretation', done: true, steps };
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
 * Build the prompt for the interpretation phase.
 */
function buildInterpretationPrompt(
    originalQuery: string,
    flowQuery: string,
    executionResult: FlowQueryExecutionResult
): string {
    const resultsJson = JSON.stringify(executionResult.results, null, 2);
    const resultCount = executionResult.results?.length || 0;
    
    return `The user asked: "${originalQuery}"

This was translated to the following FlowQuery:
\`\`\`flowquery
${flowQuery}
\`\`\`

The query executed successfully in ${executionResult.executionTime.toFixed(2)}ms and returned ${resultCount} result(s):

\`\`\`json
${resultsJson}
\`\`\`

Please interpret these results and provide a helpful response to the user's original question.`;
}

/**
 * Handle execution errors by asking LLM to explain or suggest fixes.
 */
async function interpretError(
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

export default { processQuery, processQueryStream };
