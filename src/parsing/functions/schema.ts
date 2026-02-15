import Database from "../../graph/database";
import AsyncFunction from "./async_function";
import { FunctionDef } from "./function_metadata";

/**
 * Built-in function that returns the graph schema of the database.
 *
 * Lists all nodes and relationships with their labels/types, properties,
 * and a sample of their data (excluding id from nodes, left_id and right_id from relationships).
 *
 * Nodes: {label, properties, sample}
 * Relationships: {type, from_label, to_label, properties, sample}
 *
 * @example
 * ```
 * LOAD FROM schema() AS s RETURN s
 * ```
 */
@FunctionDef({
    description:
        "Returns the graph schema listing all nodes and relationships with their properties and a sample of their data.",
    category: "async",
    parameters: [],
    output: {
        description: "Schema entry with label/type, properties, and optional sample data",
        type: "object",
    },
    examples: ["LOAD FROM schema() AS s RETURN s"],
})
class Schema extends AsyncFunction {
    public async *generate(): AsyncGenerator<any> {
        const entries = await Database.getInstance().schema();
        for (const entry of entries) {
            yield entry;
        }
    }
}

export default Schema;
