import Operation from "../parsing/operations/operation";
import Parser from "../parsing/parser";

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