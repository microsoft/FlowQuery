import ASTNode from "../ast_node";
import FunctionFactory from "./function_factory";

/**
 * Represents an async data provider function call for use in LOAD operations.
 * 
 * This class holds the function name and arguments, and provides async iteration
 * over the results from a registered async data provider.
 * 
 * @example
 * ```typescript
 * // Used in: LOAD JSON FROM myDataSource('arg1', 'arg2') AS data
 * const asyncFunc = new AsyncFunction("myDataSource");
 * asyncFunc.parameters = [arg1Node, arg2Node];
 * for await (const item of asyncFunc.execute()) {
 *     console.log(item);
 * }
 * ```
 */
class AsyncFunction extends ASTNode {
    private _name: string;

    /**
     * Creates a new AsyncFunction with the given name.
     * 
     * @param name - The function name (must be registered as an async provider)
     */
    constructor(name: string) {
        super();
        this._name = name;
    }

    /**
     * Gets the function name.
     */
    public get name(): string {
        return this._name;
    }

    /**
     * Sets the function parameters.
     * 
     * @param nodes - Array of AST nodes representing the function arguments
     */
    public set parameters(nodes: ASTNode[]) {
        this.children = nodes;
    }

    /**
     * Evaluates all parameters and returns their values.
     * 
     * @returns Array of parameter values
     */
    private getArguments(): any[] {
        return this.children.map(child => child.value());
    }

    /**
     * Executes the async data provider function and yields results.
     * 
     * @yields Data items from the async provider
     * @throws {Error} If the function is not registered as an async provider
     */
    public async *execute(): AsyncGenerator<any, void, unknown> {
        const provider = FunctionFactory.getAsyncProvider(this._name);
        if (!provider) {
            throw new Error(`Async data provider '${this._name}' is not registered`);
        }

        const args = this.getArguments();
        const result = provider(...args);

        // Check if result is an async generator or a promise
        if (result && typeof (result as AsyncGenerator).next === 'function') {
            // It's an async generator
            yield* result as AsyncGenerator<any, void, unknown>;
        } else {
            // It's a promise - await and yield the result
            const data = await result;
            if (Array.isArray(data)) {
                for (const item of data) {
                    yield item;
                }
            } else {
                yield data;
            }
        }
    }

    public toString(): string {
        return `AsyncFunction (${this._name})`;
    }
}

export default AsyncFunction;
