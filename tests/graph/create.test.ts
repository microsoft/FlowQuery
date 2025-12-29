import Database from "../../src/graph/database";
import GraphNode from "../../src/graph/graph_node";
import CreateNode from "../../src/parsing/operations/create_node";
import Parser from "../../src/parsing/parser";

test("Test CreateNode operation", async () => {
    const node = new GraphNode("Person");
    expect(node.label).toBe("Person");
    expect(node.statement).toBeNull();
    const op = new CreateNode(node);
    const parser = new Parser();
    const statement = parser.parse("WITH 1 as x RETURN x");
    node.statement = statement;
    expect(node.statement).toBe(statement);
    await op.run();
    const db = Database.getInstance();
    const found = db.getNode("Person");
    expect(found).toBe(node);
    const data = await node.data();
    expect(data).toEqual([{ x: 1 }]);
});
