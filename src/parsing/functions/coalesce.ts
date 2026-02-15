import Function from "./function";
import { FunctionDef } from "./function_metadata";

/**
 * Returns the first non-null value from a list of expressions.
 * Equivalent to Neo4j's coalesce() function.
 *
 * @example
 * ```
 * RETURN coalesce(null, null, 'hello', 'world')  // returns 'hello'
 * MATCH (n) RETURN coalesce(n.nickname, n.name) AS displayName
 * ```
 */
@FunctionDef({
    description: "Returns the first non-null value from a list of expressions",
    category: "scalar",
    parameters: [
        { name: "expressions", description: "Two or more expressions to evaluate", type: "any" },
    ],
    output: {
        description: "The first non-null value, or null if all values are null",
        type: "any",
    },
    examples: [
        "RETURN coalesce(null, 'hello', 'world')",
        "MATCH (n) RETURN coalesce(n.nickname, n.name) AS displayName",
    ],
})
class Coalesce extends Function {
    constructor() {
        super("coalesce");
        this._expectedParameterCount = null; // variable number of parameters
    }

    public value(): any {
        const children = this.getChildren();
        if (children.length === 0) {
            throw new Error("coalesce() requires at least one argument");
        }
        for (const child of children) {
            const val = child.value();
            if (val !== null && val !== undefined) {
                return val;
            }
        }
        return null;
    }
}

export default Coalesce;
