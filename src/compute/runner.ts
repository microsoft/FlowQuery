import ASTNode from "../parsing/ast_node";
import ParameterReference from "../parsing/expressions/parameter_reference";
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
    private _args: Record<string, any> | null = null;
    private _ast: ASTNode;

    /**
     * Creates a new Runner instance and parses the FlowQuery statement.
     *
     * @param statement - The FlowQuery statement to execute
     * @param ast - An optional pre-parsed AST to use instead of parsing the statement
     * @param args - Optional parameters to inject into $-prefixed parameter references
     * @throws {Error} If the statement is null, empty, or contains syntax errors
     */
    constructor(
        statement: string | null = null,
        ast: ASTNode | null = null,
        args: Record<string, any> | null = null
    ) {
        if ((statement === null || statement === "") && ast === null) {
            throw new Error("Either statement or AST must be provided");
        }
        this._ast = ast !== null ? ast : new Parser().parse(statement!);
        this._args = args;
        this.first = this._ast.firstChild() as Operation;
        this.last = this._ast.lastChild() as Operation;
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
                this.bindParameters(this._ast);
                await this.first.initialize();
                await this.first.run();
                await this.first.finish();
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Recursively walks the AST to bind ParameterReference nodes
     * to the args provided to this Runner.
     * - $args resolves to the entire args map (for use with $args.key lookups)
     * - $name resolves to args["name"] (shorthand for individual properties)
     */
    private bindParameters(node: ASTNode): void {
        if (node instanceof ParameterReference) {
            const args = this._args ?? {};
            const key = node.name.startsWith("$") ? node.name.substring(1) : node.name;
            if (key === "args") {
                node.parameterValue = args;
            } else {
                node.parameterValue = key in args ? args[key] : null;
            }
        }
        for (const child of node.getChildren()) {
            this.bindParameters(child);
        }
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
