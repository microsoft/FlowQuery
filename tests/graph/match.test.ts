import Runner from "../../src/compute/runner";
import Database from "../../src/graph/database";
import GraphNode from "../../src/graph/graph_node";
import CreateNode from "../../src/parsing/operations/create_node";
import Parser from "../../src/parsing/parser";

test("Test CreateNode and match operations", async () => {
    const node = new GraphNode("Person");
    expect(node.label).toBe("Person");
    expect(node.statement).toBeNull();
    const op = new CreateNode(node);
    const parser = new Parser();
    const statement = parser.parse(`
        unwind [
            {id: 1, name: 'Person 1'},
            {id: 2, name: 'Person 2'}
        ] as record
        RETURN record.id as id, record.name as name
    `);
    node.statement = statement;
    await op.run();
    const runner = new Runner("match (n:Person) RETURN n");
    await runner.run();
    expect(runner.results.length).toBe(2);
    expect(runner.results[0].n).toBeDefined();
    expect(runner.results[0].n.id).toBe(1);
    expect(runner.results[0].n.name).toBe("Person 1");
    expect(runner.results[1].n).toBeDefined();
    expect(runner.results[1].n.id).toBe(2);
    expect(runner.results[1].n.name).toBe("Person 2");
});
