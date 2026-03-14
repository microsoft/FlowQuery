import Runner from "../../src/compute/runner";
import Database from "../../src/graph/database";
import PhysicalNode from "../../src/graph/physical_node";
import CreateNode from "../../src/parsing/operations/create_node";
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

test("Data cache: same label loaded once per query", async () => {
    // Set up a virtual graph with nodes and a relationship
    await new Runner(`
        CREATE VIRTUAL (:CachePerson) AS {
            UNWIND [{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}] AS r
            RETURN r.id AS id, r.name AS name
        }
    `).run();
    await new Runner(`
        CREATE VIRTUAL (:CachePerson)-[:CACHE_KNOWS]-(:CachePerson) AS {
            UNWIND [{left_id: 1, right_id: 2}] AS r
            RETURN r.left_id AS left_id, r.right_id AS right_id
        }
    `).run();

    // Spy on PhysicalNode.data to count invocations
    const db = Database.getInstance();
    const physicalNode = db.getNode({ label: "CachePerson", labels: ["CachePerson"] } as any)!;
    const dataSpy = jest.spyOn(physicalNode, "data");

    // Query references CachePerson twice (source and target)
    const runner = new Runner(
        "MATCH (a:CachePerson)-[:CACHE_KNOWS]->(b:CachePerson) RETURN a.name, b.name"
    );
    await runner.run();

    // data() should be called only once thanks to caching
    expect(dataSpy).toHaveBeenCalledTimes(1);
    expect(runner.results.length).toBeGreaterThan(0);

    dataSpy.mockRestore();

    // Clean up
    await new Runner("DELETE VIRTUAL (:CachePerson)-[:CACHE_KNOWS]-(:CachePerson)").run();
    await new Runner("DELETE VIRTUAL (:CachePerson)").run();
});

test("Data cache: filter pass-down bypasses cache", async () => {
    await new Runner(`
        CREATE VIRTUAL (:CacheTodo) AS {
            UNWIND [{id: coalesce($id, 1), title: f'Todo {coalesce($id, 1)}'}] AS r
            RETURN r.id AS id, r.title AS title
        }
    `).run();

    const db = Database.getInstance();
    const physicalNode = db.getNode({ label: "CacheTodo", labels: ["CacheTodo"] } as any)!;
    const dataSpy = jest.spyOn(physicalNode, "data");

    // Two queries with different filter args — each should call data() (no caching)
    const runner1 = new Runner("MATCH (t:CacheTodo {id: 1}) RETURN t.title AS title");
    await runner1.run();
    const runner2 = new Runner("MATCH (t:CacheTodo {id: 2}) RETURN t.title AS title");
    await runner2.run();

    // Each query should invoke data() since args are present
    expect(dataSpy).toHaveBeenCalledTimes(2);

    dataSpy.mockRestore();
    await new Runner("DELETE VIRTUAL (:CacheTodo)").run();
});

test("Data cache: cleared between separate query runs", async () => {
    await new Runner(`
        CREATE VIRTUAL (:CacheItem) AS {
            UNWIND [{id: 1, v: 'x'}] AS r RETURN r.id AS id, r.v AS v
        }
    `).run();

    const db = Database.getInstance();
    const physicalNode = db.getNode({ label: "CacheItem", labels: ["CacheItem"] } as any)!;
    const dataSpy = jest.spyOn(physicalNode, "data");

    await new Runner("MATCH (n:CacheItem) RETURN n").run();
    await new Runner("MATCH (n:CacheItem) RETURN n").run();

    // Each Runner.run() clears the cache, so data() is called once per run = 2 total
    expect(dataSpy).toHaveBeenCalledTimes(2);

    dataSpy.mockRestore();
    await new Runner("DELETE VIRTUAL (:CacheItem)").run();
});
