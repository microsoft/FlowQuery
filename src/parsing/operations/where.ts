import Expression from "../expressions/expression";
import Operation from "./operation";

/**
 * Represents a WHERE operation that filters data based on a condition.
 *
 * The WHERE operation evaluates a boolean expression and only continues
 * execution to the next operation if the condition is true.
 *
 * @example
 * ```typescript
 * // RETURN x WHERE x > 0
 * ```
 */
class Where extends Operation {
    /**
     * Creates a new WHERE operation with the given condition.
     *
     * @param expression - The boolean expression to evaluate
     */
    constructor(expression: Expression) {
        super();
        this.addChild(expression);
    }
    public get expression(): Expression {
        return this.children[0] as Expression;
    }
    public async run(): Promise<void> {
        for (const pattern of this.expression.patterns()) {
            await pattern.fetchData();
            await pattern.evaluate();
        }
        if (this.expression.value()) {
            await this.next?.run();
        }
    }
    public value(): any {
        return this.expression.value();
    }
}

export default Where;
