import Function from "./function";
import { FunctionDef } from "./function_metadata";

/**
 * Returns the number of milliseconds since the Unix epoch (1970-01-01T00:00:00Z).
 *
 * Equivalent to Neo4j's timestamp() function.
 *
 * @example
 * ```
 * RETURN timestamp() AS ts
 * ```
 */
@FunctionDef({
    description:
        "Returns the number of milliseconds since the Unix epoch (1970-01-01T00:00:00Z). " +
        "Equivalent to Neo4j's timestamp() function.",
    category: "scalar",
    parameters: [],
    output: {
        description: "Milliseconds since Unix epoch",
        type: "number",
        example: 1718450000000,
    },
    examples: [
        "RETURN timestamp() AS ts",
        "WITH timestamp() AS before, timestamp() AS after RETURN after - before",
    ],
})
class Timestamp extends Function {
    constructor() {
        super("timestamp");
        this._expectedParameterCount = 0;
    }

    public value(): any {
        return Date.now();
    }
}

export default Timestamp;
