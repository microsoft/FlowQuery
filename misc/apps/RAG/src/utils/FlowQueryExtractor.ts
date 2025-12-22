/**
 * FlowQuery Extraction Utility
 * 
 * Extracts FlowQuery statements from LLM responses.
 */

/**
 * Extraction result containing the query and any explanation text.
 */
export interface FlowQueryExtraction {
    /** The extracted FlowQuery statement, if found */
    query: string | null;
    /** Whether a query was successfully extracted */
    found: boolean;
    /** Any explanation text before the code block */
    explanation?: string;
    /** Whether the LLM indicated no query is needed */
    noQueryNeeded?: boolean;
    /** Message from the LLM if no query is needed */
    directResponse?: string;
}

/**
 * FlowQuery Extractor class for extracting FlowQuery statements from LLM responses.
 * 
 * Looks for code blocks with flowquery, cypher, or sql language tags,
 * or generic code blocks that appear to contain FlowQuery syntax.
 * 
 * @example
 * ```typescript
 * const extractor = new FlowQueryExtractor();
 * const response = `Here's the query:
 * \`\`\`flowquery
 * LOAD JSON FROM somePlugin(5) AS item
 * RETURN item.text
 * \`\`\``;
 * 
 * const extraction = extractor.extract(response);
 * console.log(extraction.query); // "LOAD JSON FROM somePlugin(5) AS item\nRETURN item.text"
 * ```
 */
export class FlowQueryExtractor {
    /** Regex patterns for matching code blocks with language tags */
    private readonly codeBlockPatterns: RegExp[] = [
        /```(?:flowquery|cypher|fql)\s*\n([\s\S]*?)```/i,
        /```(?:sql)\s*\n([\s\S]*?)```/i,
        /```\s*\n([\s\S]*?)```/,  // Generic code block
    ];

    /** Keywords that indicate a FlowQuery statement */
    private readonly flowQueryKeywords: RegExp[] = [
        /\bWITH\b/i,
        /\bLOAD\s+JSON\s+FROM\b/i,
        /\bUNWIND\b/i,
        /\bRETURN\b/i,
        /\bWHERE\b/i,
        /\bORDER\s+BY\b/i,
        /\bLIMIT\b/i,
    ];

    /** Keywords that can start a FlowQuery statement */
    private readonly startKeywords = /^(WITH|LOAD\s+JSON\s+FROM|UNWIND)\b/i;

    /** Keywords that can continue a FlowQuery statement */
    private readonly continueKeywords = /^(WITH|LOAD|UNWIND|WHERE|RETURN|ORDER|LIMIT|SKIP|HEADERS|POST|AS)\b/i;

    /**
     * Extract a FlowQuery statement from an LLM response.
     * 
     * @param llmResponse - The full text response from the LLM
     * @returns The extraction result
     */
    public extract(llmResponse: string): FlowQueryExtraction {
        if (!llmResponse || llmResponse.trim() === '') {
            return { query: null, found: false };
        }

        // Check for explicit "NO_QUERY_NEEDED" marker
        if (llmResponse.includes('[NO_QUERY_NEEDED]') || 
            llmResponse.includes('NO_QUERY_NEEDED')) {
            // Extract the direct response after the marker
            const directMatch = llmResponse.match(/\[NO_QUERY_NEEDED\]\s*([\s\S]*)/i);
            return {
                query: null,
                found: false,
                noQueryNeeded: true,
                directResponse: directMatch ? directMatch[1].trim() : llmResponse
            };
        }

        // Try to match code blocks with specific language tags
        for (const pattern of this.codeBlockPatterns) {
            const match = llmResponse.match(pattern);
            if (match && match[1]) {
                const query = match[1].trim();
                
                // Verify it looks like a FlowQuery statement
                if (this.isLikelyFlowQuery(query)) {
                    // Extract explanation text before the code block
                    const beforeMatch = llmResponse.substring(0, llmResponse.indexOf(match[0])).trim();
                    
                    return {
                        query,
                        found: true,
                        explanation: beforeMatch || undefined
                    };
                }
            }
        }

        // Try to extract inline FlowQuery if no code block found
        // Look for lines starting with FlowQuery keywords
        const inlineQuery = this.extractInlineQuery(llmResponse);
        if (inlineQuery) {
            return {
                query: inlineQuery,
                found: true
            };
        }

        return { query: null, found: false };
    }

    /**
     * Extract multiple FlowQuery statements from an LLM response.
     * Useful when the LLM provides alternative queries.
     * 
     * @param llmResponse - The full text response from the LLM
     * @returns Array of extracted queries
     */
    public extractAll(llmResponse: string): string[] {
        if (!llmResponse) return [];

        const queries: string[] = [];
        const codeBlockPattern = /```(?:flowquery|cypher|fql|sql)?\s*\n([\s\S]*?)```/gi;
        
        let match;
        while ((match = codeBlockPattern.exec(llmResponse)) !== null) {
            if (match[1]) {
                const query = match[1].trim();
                if (this.isLikelyFlowQuery(query)) {
                    queries.push(query);
                }
            }
        }

        return queries;
    }

    /**
     * Check if a string looks like a FlowQuery statement.
     */
    private isLikelyFlowQuery(text: string): boolean {
        // Must contain at least one FlowQuery keyword
        return this.flowQueryKeywords.some(pattern => pattern.test(text));
    }

    /**
     * Try to extract a FlowQuery statement that's not in a code block.
     */
    private extractInlineQuery(text: string): string | null {
        const lines = text.split('\n');
        const queryLines: string[] = [];
        let inQuery = false;

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (!inQuery && this.startKeywords.test(trimmedLine)) {
                inQuery = true;
                queryLines.push(trimmedLine);
            } else if (inQuery) {
                // Check if this line continues the query
                if (this.continueKeywords.test(trimmedLine) || 
                    trimmedLine.startsWith('{') ||
                    trimmedLine.startsWith('}') ||
                    trimmedLine === '' ||
                    /^[A-Za-z_][A-Za-z0-9_]*\./.test(trimmedLine) ||
                    /^\s+/.test(line)) {  // Indented line
                    queryLines.push(trimmedLine);
                } else {
                    // End of query
                    break;
                }
            }
        }

        const query = queryLines.join('\n').trim();
        return query && this.isLikelyFlowQuery(query) ? query : null;
    }
}

// Convenience function for backward compatibility
export function extractFlowQuery(llmResponse: string): FlowQueryExtraction {
    return new FlowQueryExtractor().extract(llmResponse);
}

// Convenience function for backward compatibility
export function extractAllFlowQueries(llmResponse: string): string[] {
    return new FlowQueryExtractor().extractAll(llmResponse);
}

export default FlowQueryExtractor;
