import Tokenizer from "../../src/tokenization/tokenizer";

test("Tokenizer.tokenize() should return an array of tokens", () => {
    const tokenizer = new Tokenizer("MATCH (n:Person) RETURN n");
    const tokens = tokenizer.tokenize();
    expect(tokens).toBeDefined();
    expect(tokens.length).toBeGreaterThan(0);
});

test("Tokenizer.tokenize() should handle escaped quotes", () => {
    const tokenizer = new Tokenizer('return "hello \\"world"');
    const tokens = tokenizer.tokenize();
    expect(tokens).toBeDefined();
    expect(tokens.length).toBeGreaterThan(0);
});

test("Test predicate function", () => {
    const tokenizer = new Tokenizer("RETURN sum(n in [1, 2, 3] | n where n > 1)");
    const tokens = tokenizer.tokenize();
    expect(tokens).toBeDefined();
    expect(tokens.length).toBeGreaterThan(0);
});

test("Test f-string", () => {
    const tokenizer = new Tokenizer('RETURN f"hello {world}"');
    const tokens = tokenizer.tokenize();
    expect(tokens).toBeDefined();
    expect(tokens.length).toBeGreaterThan(0);
});

test("Test", () => {
    const tokenizer = new Tokenizer("WITH 1 AS n RETURN n");
    const tokens = tokenizer.tokenize();
    expect(tokens).toBeDefined();
    expect(tokens.length).toBeGreaterThan(0);
});

test("Test associative array with backtick string", () => {
    const tokenizer = new Tokenizer("RETURN {`key`: `value`}");
    const tokens = tokenizer.tokenize();
    expect(tokens).toBeDefined();
    expect(tokens.length).toBeGreaterThan(0);
});

test("Test limit", () => {
    const tokenizer = new Tokenizer("unwind range(1, 10) as n limit 5 return n");
    const tokens = tokenizer.tokenize();
    expect(tokens).toBeDefined();
    expect(tokens.length).toBeGreaterThan(0);
});

test("Test return -2", () => {
    const tokenizer = new Tokenizer("return [:-2], -2");
    const tokens = tokenizer.tokenize();
    expect(tokens).toBeDefined();
    expect(tokens.length).toBeGreaterThan(0);
});

test("Test range with function", () => {
    const tokenizer = new Tokenizer(`
        with range(1,10) as data
        return range(0, size(data)-1) as indices
    `);
    const tokens = tokenizer.tokenize();
    expect(tokens).toBeDefined();
    expect(tokens.length).toBeGreaterThan(0);
});

test("Test create virtual node", () => {
    const tokenizer = new Tokenizer(`
        CREATE VIRTUAL (:Person) AS {
            call users() YIELD id, name
        }
    `);
    const tokens = tokenizer.tokenize();
    expect(tokens).toBeDefined();
    expect(tokens.length).toBeGreaterThan(0);
});

test("Test create virtual relationship", () => {
    const tokenizer = new Tokenizer(`
        CREATE VIRTUAL (:Person)-[:KNOWS]->(:Person) AS {
            call friendships() YIELD user1_id, user2_id
        }
    `);
    const tokens = tokenizer.tokenize();
    expect(tokens).toBeDefined();
    expect(tokens.length).toBeGreaterThan(0);
});

test("Match based on virtual node", () => {
    const tokenizer = new Tokenizer(`
        MATCH (a:Person)
        RETURN a.name
    `);
    const tokens = tokenizer.tokenize();
    expect(tokens).toBeDefined();
    expect(tokens.length).toBeGreaterThan(0);
});

test("Match based on virtual nodes and relationships", () => {
    const tokenizer = new Tokenizer(`
        MATCH (a:Person)-[r:KNOWS]->(b:Person)
        RETURN a.name, b.name
    `);
    const tokens = tokenizer.tokenize();
    expect(tokens).toBeDefined();
    expect(tokens.length).toBeGreaterThan(0);
});
