import Database from "../../src/graph/database";
import PhysicalNode from "../../src/graph/physical_node";
import PhysicalRelationship from "../../src/graph/physical_relationship";
import CreateNode from "../../src/parsing/operations/create_node";
import CreateRelationship from "../../src/parsing/operations/create_relationship";
import Parser from "../../src/parsing/parser";

test("Test CreateNode operation", async () => {
    const node = new PhysicalNode(null, "Person");
    expect(node.label).toBe("Person");
    expect(node.statement).toBeNull();
    const parser = new Parser();
    const statement = parser.parse("WITH 1 as x RETURN x");
    const op = new CreateNode(node, statement);
    await op.run();
    const db = Database.getInstance();
    const found = db.getNode(node);
    expect(found!.label).toBe(node.label);
    const data = await found!.data();
    expect(data).toEqual([{ x: 1 }]);
});

test("Test CreateRelationship operation", async () => {
    const relationship = new PhysicalRelationship();
    relationship.from = "Person";
    relationship.to = "Person";
    relationship.type = "KNOWS";
    expect(relationship.type).toBe("KNOWS");
    expect(relationship.statement).toBeNull();
    const parser = new Parser();
    const statement = parser.parse("WITH 1 as x RETURN x");
    const op = new CreateRelationship(relationship, statement);
    await op.run();
    const db = Database.getInstance();
    const found = db.getRelationship(relationship);
    const data = await found!.data();
    expect(data).toEqual([{ x: 1 }]);
});
