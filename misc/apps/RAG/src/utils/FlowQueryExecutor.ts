/**
 * FlowQuery Executor Utility
 *
 * Executes FlowQuery statements and handles errors gracefully.
 */
import { FlowQuery } from "flowquery";

/**
 * Result of executing a FlowQuery statement.
 */
export interface FlowQueryExecutionResult {
    /** Whether the execution was successful */
    success: boolean;
    /** The query that was executed */
    query: string;
    /** The results from the query, if successful */
    results?: any[];
    /** Error message, if execution failed */
    error?: string;
    /** Execution time in milliseconds */
    executionTime: number;
}

/**
 * FlowQuery Executor class for executing FlowQuery statements.
 *
 * @example
 * ```typescript
 * const executor = new FlowQueryExecutor();
 * const result = await executor.execute("LOAD JSON FROM somePlugin(5) AS item RETURN item.text");
 * if (result.success) {
 *     console.log(result.results);
 * } else {
 *     console.error(result.error);
 * }
 * ```
 */
export class FlowQueryExecutor {
    private defaultMaxItems: number;

    /**
     * Creates a new FlowQueryExecutor instance.
     * @param defaultMaxItems - Default maximum items to display when formatting results (default: 20)
     */
    constructor(defaultMaxItems: number = 20) {
        this.defaultMaxItems = defaultMaxItems;
    }

    /**
     * Execute a FlowQuery statement and return the results.
     *
     * @param query - The FlowQuery statement to execute
     * @returns The execution result including success status, results or error
     */
    async execute(query: string): Promise<FlowQueryExecutionResult> {
        const startTime = performance.now();

        try {
            // Validate the query is not empty
            if (!query || query.trim() === "") {
                return {
                    success: false,
                    query,
                    error: "Query cannot be empty",
                    executionTime: performance.now() - startTime,
                };
            }

            // Create a runner and execute the query
            const runner = new FlowQuery(query);
            await runner.run();

            // Get the results
            const results = runner.results;

            return {
                success: true,
                query,
                results: Array.isArray(results) ? results : [results],
                executionTime: performance.now() - startTime,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            return {
                success: false,
                query,
                error: errorMessage,
                executionTime: performance.now() - startTime,
            };
        }
    }

    /**
     * Format execution results for display or LLM consumption.
     *
     * @param result - The execution result to format
     * @param maxItems - Maximum number of items to include (uses default if not specified)
     * @returns A formatted string representation of the results
     */
    formatResult(result: FlowQueryExecutionResult, maxItems?: number): string {
        const limit = maxItems ?? this.defaultMaxItems;

        if (!result.success) {
            return `Execution Error: ${result.error}`;
        }

        const results = result.results || [];
        const totalCount = results.length;
        const displayResults = results.slice(0, limit);

        let output = `Execution successful (${result.executionTime.toFixed(2)}ms)\n`;
        output += `Total results: ${totalCount}\n\n`;

        if (totalCount === 0) {
            output += "No results returned.";
        } else {
            output += "Results:\n";
            output += JSON.stringify(displayResults, null, 2);

            if (totalCount > limit) {
                output += `\n\n... and ${totalCount - limit} more results`;
            }
        }

        return output;
    }
}

export default FlowQueryExecutor;
