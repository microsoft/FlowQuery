import Runner from "../../src/compute/runner";
import Database from "../../src/graph/database";
import Hops from "../../src/graph/hops";
import Node from "../../src/graph/node";
import Pattern from "../../src/graph/pattern";
import Patterns from "../../src/graph/patterns";
import PhysicalNode from "../../src/graph/physical_node";
import Relationship from "../../src/graph/relationship";
import { RelationshipMatchRecord } from "../../src/graph/relationship_match_collector";
import CreateNode from "../../src/parsing/operations/create_node";
import Match from "../../src/parsing/operations/match";
import Operation from "../../src/parsing/operations/operation";
import Parser from "../../src/parsing/parser";

test("Test CreateNode and match operations", async () => {
    const node = new PhysicalNode(null, "Person");
    expect(node.label).toBe("Person");
    expect(node.statement).toBeNull();
    const parser = new Parser();
    const statement = parser.parse(`
        unwind [
            {id: 1, name: 'Person 1'},
            {id: 2, name: 'Person 2'}
        ] as record
        RETURN record.id as id, record.name as name
    `);
    const op = new CreateNode(node, statement);
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
