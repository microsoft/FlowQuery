import Operation from "../parsing/operations/operation";
import Parser from "../parsing/parser";
import { FunctionCreator, AsyncDataProvider } from "../parsing/functions/function_factory";
import { FunctionMetadata, RegisterFunctionOptions, RegisterAsyncProviderOptions } from "../parsing/functions/function_metadata";
import Function from "../parsing/functions/function";

/**
 * Executes a FlowQuery statement and retrieves the results.
 * 
 * The Runner class parses a FlowQuery statement into an AST and executes it,
 * managing the execution flow from the first operation to the final return statement.
 * 
 * @example
 * ```typescript
 * const runner = new Runner("WITH 1 as x RETURN x");
 * await runner.run();
 * console.log(runner.results); // [{ x: 1 }]
 * ```
 */
class Runner {
    private first: Operation;
    private last: Operation;

    /**
     * Register a synchronous plugin function.
     * Added dynamically in index.browser.ts / index.node.ts
     */
    static registerFunction: (name: string, factoryOrOptions: FunctionCreator | RegisterFunctionOptions) => void;

    /**
     * Unregister a synchronous plugin function.
     * Added dynamically in index.browser.ts / index.node.ts
     */
    static unregisterFunction: (name: string) => void;

    /**
     * Register an async data provider function for use in LOAD operations.
     * Added dynamically in index.browser.ts / index.node.ts
     */
    static registerAsyncProvider: (name: string, providerOrOptions: AsyncDataProvider | RegisterAsyncProviderOptions) => void;

    /**
     * Unregister an async data provider function.
     * Added dynamically in index.browser.ts / index.node.ts
     */
    static unregisterAsyncProvider: (name: string) => void;

    /**
     * List all registered functions with their metadata.
     * Added dynamically in index.browser.ts / index.node.ts
     */
    static listFunctions: (options?: { category?: string; asyncOnly?: boolean; syncOnly?: boolean }) => FunctionMetadata[];

    /**
     * Get metadata for a specific function.
     * Added dynamically in index.browser.ts / index.node.ts
     */
    static getFunctionMetadata: (name: string) => FunctionMetadata | undefined;

    /**
     * Base Function class for creating custom plugin functions.
     * Added dynamically in index.browser.ts / index.node.ts
     */
    static Function: typeof Function;
    
    /**
     * Creates a new Runner instance and parses the FlowQuery statement.
     * 
     * @param statement - The FlowQuery statement to execute
     * @throws {Error} If the statement is null, empty, or contains syntax errors
     */
    constructor(statement: string | null = null) {
        if(statement === null || statement === "") {
            throw new Error("Statement cannot be null or empty");
        }
        const parser = new Parser();
        const ast = parser.parse(statement);
        this.first = ast.firstChild() as Operation;
        this.last = ast.lastChild() as Operation;
    }
    
    /**
     * Executes the parsed FlowQuery statement.
     * 
     * @returns A promise that resolves when execution completes
     * @throws {Error} If an error occurs during execution
     */
    public async run(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            try {
                await this.first.run();
                await this.first.finish();
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }
    
    /**
     * Gets the results from the executed statement.
     * 
     * @returns The results from the last operation (typically a RETURN statement)
     */
    public get results(): any {
        return this.last.results;
    }
}

export default Runner;