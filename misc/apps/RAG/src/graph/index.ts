/**
 * Graph module exports
 */
import FlowQuery from "flowquery";

export { initializeGraph } from "./initializeGraph";

/**
 * Get the graph schema including all node labels and relationship types.
 *
 * @returns Promise resolving to the graph schema
 */
export async function getGraphSchema(): Promise<any> {
    const runner = new FlowQuery(
        `CALL schema() YIELD kind, label, type, from_label, to_label, properties, sample RETURN kind, label, type, from_label, to_label, properties, sample`
    );
    await runner.run();
    return runner.results;
}
