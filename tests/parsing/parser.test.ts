import Node from "../../src/graph/node";
import NodeReference from "../../src/graph/node_reference";
import Relationship from "../../src/graph/relationship";
import RelationshipReference from "../../src/graph/relationship_reference";
import AsyncFunction from "../../src/parsing/functions/async_function";
import { FunctionDef } from "../../src/parsing/functions/function_metadata";
import CreateNode from "../../src/parsing/operations/create_node";
import CreateRelationship from "../../src/parsing/operations/create_relationship";
import Match from "../../src/parsing/operations/match";
import Parser from "../../src/parsing/parser";

// Test class for CALL operation parsing test - defined at module level for Prettier compatibility
@FunctionDef({
    description: "Asynchronous function for testing CALL operation",
    category: "async",
    parameters: [],
    output: { description: "Yields test values", type: "any" },
})
class Test extends AsyncFunction {
    constructor() {
        super();
        this._expectedParameterCount = 0;
    }
    public async *generate(): AsyncGenerator<any> {
        yield 1;
        yield 2;
        yield 3;
    }
}

test("Test Parser", () => {
    const parser = new Parser();
    const ast = parser.parse("RETURN 1, 2, 3");
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- Return\n" +
            "-- Expression\n" +
            "--- Number (1)\n" +
            "-- Expression\n" +
            "--- Number (2)\n" +
            "-- Expression\n" +
            "--- Number (3)"
    );
});

test("Test Parser with function", () => {
    const parser = new Parser();
    const ast = parser.parse("RETURN rand()");
    expect(ast.print()).toBe(
        "ASTNode\n" + "- Return\n" + "-- Expression\n" + "--- Function (rand)"
    );
});

test("Test Parser with associative array", () => {
    const parser = new Parser();
    const ast = parser.parse("RETURN {a: 1, b: 2}");
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- Return\n" +
            "-- Expression\n" +
            "--- AssociativeArray\n" +
            "---- KeyValuePair\n" +
            "----- String (a)\n" +
            "----- Expression\n" +
            "------ Number (1)\n" +
            "---- KeyValuePair\n" +
            "----- String (b)\n" +
            "----- Expression\n" +
            "------ Number (2)"
    );
});

test("Test Parser with JSON array", () => {
    const parser = new Parser();
    const ast = parser.parse("RETURN [1, 2]");
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- Return\n" +
            "-- Expression\n" +
            "--- JSONArray\n" +
            "---- Expression\n" +
            "----- Number (1)\n" +
            "---- Expression\n" +
            "----- Number (2)"
    );
});

test("Test Parser with nested associative array", () => {
    const parser = new Parser();
    const ast = parser.parse("RETURN {a:{}}");
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- Return\n" +
            "-- Expression\n" +
            "--- AssociativeArray\n" +
            "---- KeyValuePair\n" +
            "----- String (a)\n" +
            "----- Expression\n" +
            "------ AssociativeArray"
    );
});

test("Test Parser with multiple operations", () => {
    const parser = new Parser();
    const ast = parser.parse("WITH 1 AS n RETURN n");
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- With\n" +
            "-- Expression (n)\n" +
            "--- Number (1)\n" +
            "- Return\n" +
            "-- Expression (n)\n" +
            "--- Reference (n)"
    );
});

test("Test Parser with multiple operations and comments", () => {
    const parser = new Parser();
    const ast = parser.parse("WITH 1 AS n /* comment */ RETURN n");
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- With\n" +
            "-- Expression (n)\n" +
            "--- Number (1)\n" +
            "- Return\n" +
            "-- Expression (n)\n" +
            "--- Reference (n)"
    );
});

test("Test Parser with multiple operations including UNWIND", () => {
    const parser = new Parser();
    const ast = parser.parse("UNWIND [1, 2, 3] AS n RETURN n");
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- Unwind\n" +
            "-- Expression (n)\n" +
            "--- JSONArray\n" +
            "---- Expression\n" +
            "----- Number (1)\n" +
            "---- Expression\n" +
            "----- Number (2)\n" +
            "---- Expression\n" +
            "----- Number (3)\n" +
            "- Return\n" +
            "-- Expression (n)\n" +
            "--- Reference (n)"
    );
});

test("Test Unwind with invalid expression", () => {
    const parser = new Parser();
    expect(() => parser.parse("UNWIND 1 AS n RETURN n")).toThrow(
        "Expected array, function, reference, or lookup."
    );
});

test("Test Unwind with invalid alias", () => {
    const parser = new Parser();
    expect(() => parser.parse("UNWIND [1, 2, 3] AS 1 RETURN n")).toThrow("Expected identifier");
});

test("Test Unwind with missing alias", () => {
    const parser = new Parser();
    expect(() => parser.parse("UNWIND [1, 2, 3] RETURN n")).toThrow("Expected alias");
});

test("Test statement with where clause", () => {
    const parser = new Parser();
    const ast = parser.parse("with 1 as n where n > 0 return n");
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- With\n" +
            "-- Expression (n)\n" +
            "--- Number (1)\n" +
            "- Where\n" +
            "-- Expression\n" +
            "--- GreaterThan\n" +
            "---- Reference (n)\n" +
            "---- Number (0)\n" +
            "- Return\n" +
            "-- Expression (n)\n" +
            "--- Reference (n)"
    );
});

test("Test lookup", () => {
    const parser = new Parser();
    const ast = parser.parse("return {a: 1}.a");
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- Return\n" +
            "-- Expression\n" +
            "--- Lookup\n" +
            "---- Identifier (a)\n" +
            "---- AssociativeArray\n" +
            "----- KeyValuePair\n" +
            "------ String (a)\n" +
            "------ Expression\n" +
            "------- Number (1)"
    );
});

test("Test lookup as part of expression", () => {
    const parser = new Parser();
    const ast = parser.parse("return {a: 1}.a + 1");
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- Return\n" +
            "-- Expression\n" +
            "--- Add\n" +
            "---- Lookup\n" +
            "----- Identifier (a)\n" +
            "----- AssociativeArray\n" +
            "------ KeyValuePair\n" +
            "------- String (a)\n" +
            "------- Expression\n" +
            "-------- Number (1)\n" +
            "---- Number (1)"
    );
});

test("Test lookup with nested associative array", () => {
    const parser = new Parser();
    const ast = parser.parse("return {a: {b: 1}}.a.b");
    const _return = ast.firstChild();
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- Return\n" +
            "-- Expression\n" +
            "--- Lookup\n" +
            "---- Identifier (b)\n" +
            "---- Lookup\n" +
            "----- Identifier (a)\n" +
            "----- AssociativeArray\n" +
            "------ KeyValuePair\n" +
            "------- String (a)\n" +
            "------- Expression\n" +
            "-------- AssociativeArray\n" +
            "--------- KeyValuePair\n" +
            "---------- String (b)\n" +
            "---------- Expression\n" +
            "----------- Number (1)"
    );
    expect(_return.firstChild().value()).toBe(1);
});

test("Test lookup with JSON array", () => {
    const parser = new Parser();
    const ast = parser.parse("return [1, 2][1]");
    const _return = ast.firstChild();
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- Return\n" +
            "-- Expression\n" +
            "--- Lookup\n" +
            "---- Expression\n" +
            "----- Number (1)\n" +
            "---- JSONArray\n" +
            "----- Expression\n" +
            "------ Number (1)\n" +
            "----- Expression\n" +
            "------ Number (2)"
    );
    expect(_return.firstChild().value()).toBe(2);
});

test("Test lookup with from keyword as property name", () => {
    const parser = new Parser();
    const ast = parser.parse("with {from: 1, to: 2} as x return x.from, x.to");
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- With\n" +
            "-- Expression (x)\n" +
            "--- AssociativeArray\n" +
            "---- KeyValuePair\n" +
            "----- String (from)\n" +
            "----- Expression\n" +
            "------ Number (1)\n" +
            "---- KeyValuePair\n" +
            "----- String (to)\n" +
            "----- Expression\n" +
            "------ Number (2)\n" +
            "- Return\n" +
            "-- Expression\n" +
            "--- Lookup\n" +
            "---- Identifier (from)\n" +
            "---- Reference (x)\n" +
            "-- Expression\n" +
            "--- Lookup\n" +
            "---- Identifier (to)\n" +
            "---- Reference (x)"
    );
});

test("Test camelCase alias starting with keyword", () => {
    const parser = new Parser();
    const ast = parser.parse("LOAD JSON FROM '/data.json' AS x RETURN x.from AS fromUser");
    expect(ast.print()).toContain("Lookup");
    expect(ast.print()).toContain("Identifier (from)");
});

test("Test from keyword property in create virtual subquery", () => {
    const parser = new Parser();
    // Should not throw - email.from should be parsed correctly even with FROM being a keyword
    expect(() => {
        parser.parse(
            "CREATE VIRTUAL (:Email) AS { LOAD JSON FROM '/data/emails.json' AS email RETURN email.id AS id, email.from AS fromUser }"
        );
    }).not.toThrow();
});

test("Test lookup with reserved keyword property names", () => {
    const parser = new Parser();
    const ast = parser.parse("with {end: 1, null: 2, case: 3} as x return x.end, x.null, x.case");
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- With\n" +
            "-- Expression (x)\n" +
            "--- AssociativeArray\n" +
            "---- KeyValuePair\n" +
            "----- String (end)\n" +
            "----- Expression\n" +
            "------ Number (1)\n" +
            "---- KeyValuePair\n" +
            "----- String (null)\n" +
            "----- Expression\n" +
            "------ Number (2)\n" +
            "---- KeyValuePair\n" +
            "----- String (case)\n" +
            "----- Expression\n" +
            "------ Number (3)\n" +
            "- Return\n" +
            "-- Expression\n" +
            "--- Lookup\n" +
            "---- Identifier (end)\n" +
            "---- Reference (x)\n" +
            "-- Expression\n" +
            "--- Lookup\n" +
            "---- Identifier (null)\n" +
            "---- Reference (x)\n" +
            "-- Expression\n" +
            "--- Lookup\n" +
            "---- Identifier (case)\n" +
            "---- Reference (x)"
    );
});

test("Test load with post", () => {
    const parser = new Parser();
    const ast = parser.parse(
        'load json from "https://jsonplaceholder.typicode.com/posts" post {userId: 1} as data return data'
    );
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- Load\n" +
            "-- JSON\n" +
            "-- From\n" +
            "--- Expression\n" +
            "---- String (https://jsonplaceholder.typicode.com/posts)\n" +
            "-- Post\n" +
            "--- Expression\n" +
            "---- AssociativeArray\n" +
            "----- KeyValuePair\n" +
            "------ String (userId)\n" +
            "------ Expression\n" +
            "------- Number (1)\n" +
            "-- Alias (data)\n" +
            "- Return\n" +
            "-- Expression (data)\n" +
            "--- Reference (data)"
    );
});

test("Test nested aggregate functions", () => {
    expect(() => {
        const parser = new Parser();
        parser.parse("RETURN sum(sum(1))");
    }).toThrow("Aggregate functions cannot be nested");
});

test("Test with and return with renamed variable", () => {
    const parser = new Parser();
    const ast = parser.parse("WITH 1 AS n RETURN n AS m");
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- With\n" +
            "-- Expression (n)\n" +
            "--- Number (1)\n" +
            "- Return\n" +
            "-- Expression (m)\n" +
            "--- Reference (n)"
    );
});

test("Test with and return with variable lookup", () => {
    const parser = new Parser();
    const ast = parser.parse("WITH {a: n} AS obj RETURN obj.a");
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- With\n" +
            "-- Expression (obj)\n" +
            "--- AssociativeArray\n" +
            "---- KeyValuePair\n" +
            "----- String (a)\n" +
            "----- Expression\n" +
            "------ Reference (n)\n" +
            "- Return\n" +
            "-- Expression\n" +
            "--- Lookup\n" +
            "---- Identifier (a)\n" +
            "---- Reference (obj)"
    );
});

test("Test unwind", () => {
    const parser = new Parser();
    const ast = parser.parse("WITH [1, 2, 4] as n unwind n as i return i");
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- With\n" +
            "-- Expression (n)\n" +
            "--- JSONArray\n" +
            "---- Expression\n" +
            "----- Number (1)\n" +
            "---- Expression\n" +
            "----- Number (2)\n" +
            "---- Expression\n" +
            "----- Number (4)\n" +
            "- Unwind\n" +
            "-- Expression (i)\n" +
            "--- Reference (n)\n" +
            "- Return\n" +
            "-- Expression (i)\n" +
            "--- Reference (i)"
    );
});

test("Test predicate function", () => {
    const parser = new Parser();
    const ast = parser.parse("RETURN sum(n in [1, 2, 3] | n where n > 1)");
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- Return\n" +
            "-- Expression\n" +
            "--- PredicateFunction (sum)\n" +
            "---- Reference (n)\n" +
            "---- Expression\n" +
            "----- JSONArray\n" +
            "------ Expression\n" +
            "------- Number (1)\n" +
            "------ Expression\n" +
            "------- Number (2)\n" +
            "------ Expression\n" +
            "------- Number (3)\n" +
            "---- Expression\n" +
            "----- Reference (n)\n" +
            "---- Where\n" +
            "----- Expression\n" +
            "------ GreaterThan\n" +
            "------- Reference (n)\n" +
            "------- Number (1)"
    );
});

test("Test case statement", () => {
    const parser = new Parser();
    const ast = parser.parse("RETURN CASE WHEN 1 THEN 2 ELSE 3 END");
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- Return\n" +
            "-- Expression\n" +
            "--- Case\n" +
            "---- When\n" +
            "----- Expression\n" +
            "------ Number (1)\n" +
            "---- Then\n" +
            "----- Expression\n" +
            "------ Number (2)\n" +
            "---- Else\n" +
            "----- Expression\n" +
            "------ Number (3)"
    );
});

test("Test case statement with keywords as identifiers", () => {
    const parser = new Parser();
    const ast = parser.parse("RETURN CASE WHEN 1 THEN 2 ELSE 3 END");
    expect(ast.print()).toContain("Case");
    expect(ast.print()).toContain("When");
    expect(ast.print()).toContain("Then");
    expect(ast.print()).toContain("Else");
});

test("Test functions with wrong number of arguments", () => {
    expect(() => new Parser().parse("RETURN range(1)")).toThrow(
        "Function range expected 2 parameters, but got 1"
    );
    expect(() => new Parser().parse("RETURN range(1, 2, 3)")).toThrow(
        "Function range expected 2 parameters, but got 3"
    );
    expect(() => new Parser().parse("RETURN avg(1, 2, 3)")).toThrow(
        "Function avg expected 1 parameters, but got 3"
    );
    expect(() => new Parser().parse("RETURN sum(1, 2)")).toThrow(
        "Function sum expected 1 parameters, but got 2"
    );
    expect(() => new Parser().parse('RETURN split("a", "b", "c")')).toThrow(
        "Function split expected 2 parameters, but got 3"
    );
    expect(() => new Parser().parse("RETURN size(1, 2)")).toThrow(
        "Function size expected 1 parameters, but got 2"
    );
    expect(() => new Parser().parse("RETURN round(1, 2)")).toThrow(
        "Function round expected 1 parameters, but got 2"
    );
});

test("Test non-well formed statements", () => {
    expect(() => new Parser().parse("return 1 return 1")).toThrow(
        "Only one RETURN statement is allowed"
    );
    expect(() => new Parser().parse("return 1 with 1 as n")).toThrow(
        "Last statement must be a RETURN, WHERE, CALL, CREATE, or DELETE statement"
    );
});

test("Test associative array with backtick string", () => {
    const parser = new Parser();
    const ast = parser.parse("RETURN {`key`: `value`}");
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- Return\n" +
            "-- Expression\n" +
            "--- AssociativeArray\n" +
            "---- KeyValuePair\n" +
            "----- String (key)\n" +
            "----- Expression\n" +
            "------ Reference (value)"
    );
});

test("Test limit", () => {
    const parser = new Parser();
    const ast = parser.parse("unwind range(1, 10) as n limit 5 return n");
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- Unwind\n" +
            "-- Expression (n)\n" +
            "--- Function (range)\n" +
            "---- Expression\n" +
            "----- Number (1)\n" +
            "---- Expression\n" +
            "----- Number (10)\n" +
            "- Limit\n" +
            "- Return\n" +
            "-- Expression (n)\n" +
            "--- Reference (n)"
    );
});

test("Test return -2", () => {
    const parser = new Parser();
    const ast = parser.parse("return -2");
    // prettier-ignore
    expect(ast.print()).toBe(
        "ASTNode\n" +
        "- Return\n" +
        "-- Expression\n" +
        "--- Number (-2)"
    );
});

test("Test call operation", () => {
    const parser = new Parser();
    const ast = parser.parse("CALL test() YIELD result RETURN result");
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- Call\n" +
            "-- Expression (result)\n" +
            "--- Reference (result)\n" +
            "- Return\n" +
            "-- Expression (result)\n" +
            "--- Reference (result)"
    );
});

test("Test f-string", () => {
    const parser = new Parser();
    const ast = parser.parse("with 1 as value RETURN f'Value is: {value}.'");
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- With\n" +
            "-- Expression (value)\n" +
            "--- Number (1)\n" +
            "- Return\n" +
            "-- Expression\n" +
            "--- FString\n" +
            "---- String (Value is: )\n" +
            "---- Expression\n" +
            "----- Reference (value)\n" +
            "---- String (.)"
    );
});

test("Test create node operation", () => {
    const parser = new Parser();
    const ast = parser.parse(`
        CREATE VIRTUAL (:Person) AS {
            unwind range(1, 3) AS id
            return id, f'Person {id}' AS name
        }
    `);
    // prettier-ignore
    expect(ast.print()).toBe(
        "ASTNode\n" +
        "- CreateNode"
    );
    const create: CreateNode = ast.firstChild() as CreateNode;
    expect(create.node).not.toBeNull();
    expect(create.node!.label).toBe("Person");
    expect(create.statement!.print()).toBe(
        "ASTNode\n" +
            "- Unwind\n" +
            "-- Expression (id)\n" +
            "--- Function (range)\n" +
            "---- Expression\n" +
            "----- Number (1)\n" +
            "---- Expression\n" +
            "----- Number (3)\n" +
            "- Return\n" +
            "-- Expression (id)\n" +
            "--- Reference (id)\n" +
            "-- Expression (name)\n" +
            "--- FString\n" +
            "---- String (Person )\n" +
            "---- Expression\n" +
            "----- Reference (id)\n" +
            "---- String ()"
    );
});

test("Test match operation", () => {
    const parser = new Parser();
    const ast = parser.parse("MATCH (n:Person) RETURN n");
    // prettier-ignore
    expect(ast.print()).toBe(
        "ASTNode\n" +
        "- Match\n" +
        "- Return\n" +
        "-- Expression (n)\n" +
        "--- Reference (n)"
    );
    const match = ast.firstChild() as Match;
    expect(match.patterns[0].startNode).not.toBeNull();
    expect(match.patterns[0].startNode!.label).toBe("Person");
    expect(match.patterns[0].startNode!.identifier).toBe("n");
});

test("Test create relationship operation", () => {
    const parser = new Parser();
    const ast = parser.parse(`
        CREATE VIRTUAL (:Person)-[:KNOWS]-(:Person) AS {
            unwind [
                {from_id: 1, to_id: 2, since: '2020-01-01'},
                {from_id: 2, to_id: 3, since: '2021-01-01'}
            ] AS pair
            return pair.from_id AS from, pair.to_id AS to, pair.since AS since
        }
    `);
    // prettier-ignore
    expect(ast.print()).toBe(
        "ASTNode\n" +
        "- CreateRelationship"
    );
    const create = ast.firstChild() as CreateRelationship;
    expect(create.relationship).not.toBeNull();
    expect(create.relationship!.type).toBe("KNOWS");
    expect(create.statement!.print()).toBe(
        "ASTNode\n" +
            "- Unwind\n" +
            "-- Expression (pair)\n" +
            "--- JSONArray\n" +
            "---- Expression\n" +
            "----- AssociativeArray\n" +
            "------ KeyValuePair\n" +
            "------- String (from_id)\n" +
            "------- Expression\n" +
            "-------- Number (1)\n" +
            "------ KeyValuePair\n" +
            "------- String (to_id)\n" +
            "------- Expression\n" +
            "-------- Number (2)\n" +
            "------ KeyValuePair\n" +
            "------- String (since)\n" +
            "------- Expression\n" +
            "-------- String (2020-01-01)\n" +
            "---- Expression\n" +
            "----- AssociativeArray\n" +
            "------ KeyValuePair\n" +
            "------- String (from_id)\n" +
            "------- Expression\n" +
            "-------- Number (2)\n" +
            "------ KeyValuePair\n" +
            "------- String (to_id)\n" +
            "------- Expression\n" +
            "-------- Number (3)\n" +
            "------ KeyValuePair\n" +
            "------- String (since)\n" +
            "------- Expression\n" +
            "-------- String (2021-01-01)\n" +
            "- Return\n" +
            "-- Expression (from)\n" +
            "--- Lookup\n" +
            "---- Identifier (from_id)\n" +
            "---- Reference (pair)\n" +
            "-- Expression (to)\n" +
            "--- Lookup\n" +
            "---- Identifier (to_id)\n" +
            "---- Reference (pair)\n" +
            "-- Expression (since)\n" +
            "--- Lookup\n" +
            "---- Identifier (since)\n" +
            "---- Reference (pair)"
    );
});

test("Match with graph pattern including relationships", () => {
    const parser = new Parser();
    const ast = parser.parse("MATCH (a:Person)-[:KNOWS]-(b:Person) RETURN a, b");
    // prettier-ignore
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- Match\n" +
            "- Return\n" +
            "-- Expression (a)\n" +
            "--- Reference (a)\n" +
            "-- Expression (b)\n" +
            "--- Reference (b)"
    );
    const match = ast.firstChild() as Match;
    expect(match.patterns[0].chain.length).toBe(3);
    const source = match.patterns[0].chain[0] as Node;
    const relationship = match.patterns[0].chain[1] as Relationship;
    const target = match.patterns[0].chain[2] as Node;
    expect(source.identifier).toBe("a");
    expect(source.label).toBe("Person");
    expect(relationship.type).toBe("KNOWS");
    expect(target.identifier).toBe("b");
    expect(target.label).toBe("Person");
});

test("Match with ORed relationship types", () => {
    const parser = new Parser();
    const ast = parser.parse("MATCH (a:Person)-[:KNOWS|FOLLOWS]->(b:Person) RETURN a, b");
    const match = ast.firstChild() as Match;
    expect(match.patterns[0].chain.length).toBe(3);
    const relationship = match.patterns[0].chain[1] as Relationship;
    expect(relationship.types).toEqual(["KNOWS", "FOLLOWS"]);
    expect(relationship.type).toBe("KNOWS");
});

test("Match with ORed relationship types with optional colons", () => {
    const parser = new Parser();
    const ast = parser.parse("MATCH (a:Person)-[:KNOWS|:FOLLOWS|:LIKES]->(b:Person) RETURN a, b");
    const match = ast.firstChild() as Match;
    const relationship = match.patterns[0].chain[1] as Relationship;
    expect(relationship.types).toEqual(["KNOWS", "FOLLOWS", "LIKES"]);
});

test("Match with ORed relationship types and variable", () => {
    const parser = new Parser();
    const ast = parser.parse("MATCH (a:Person)-[r:KNOWS|FOLLOWS]->(b:Person) RETURN a, r, b");
    const match = ast.firstChild() as Match;
    const relationship = match.patterns[0].chain[1] as Relationship;
    expect(relationship.identifier).toBe("r");
    expect(relationship.types).toEqual(["KNOWS", "FOLLOWS"]);
});

test("Match with ORed relationship types and hops", () => {
    const parser = new Parser();
    const ast = parser.parse("MATCH (a:Person)-[:KNOWS|FOLLOWS*1..3]->(b:Person) RETURN a, b");
    const match = ast.firstChild() as Match;
    const relationship = match.patterns[0].chain[1] as Relationship;
    expect(relationship.types).toEqual(["KNOWS", "FOLLOWS"]);
    expect(relationship.hops!.min).toBe(1);
    expect(relationship.hops!.max).toBe(3);
});

test("Test not equal operator", () => {
    const parser = new Parser();
    const ast = parser.parse("RETURN 1 <> 2");
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- Return\n" +
            "-- Expression\n" +
            "--- NotEquals\n" +
            "---- Number (1)\n" +
            "---- Number (2)"
    );
});

test("Test equal operator", () => {
    const parser = new Parser();
    const ast = parser.parse("RETURN 1 = 2");
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- Return\n" +
            "-- Expression\n" +
            "--- Equals\n" +
            "---- Number (1)\n" +
            "---- Number (2)"
    );
});

test("Test not operator", () => {
    const parser = new Parser();
    const ast = parser.parse("RETURN NOT true");
    // prettier-ignore
    expect(ast.print()).toBe(
        "ASTNode\n" +
        "- Return\n" +
        "-- Expression\n" +
        "--- Not\n" +
        "---- Expression\n" +
        "----- Boolean"
    );
});

test("Parse relationship with hops", () => {
    const parser = new Parser();
    const ast = parser.parse("MATCH (a:Test)-[:KNOWS*1..3]->(b:Test) RETURN a, b");
    // prettier-ignore
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- Match\n" +
            "- Return\n" +
            "-- Expression (a)\n" +
            "--- Reference (a)\n" +
            "-- Expression (b)\n" +
            "--- Reference (b)"
    );
    const match = ast.firstChild() as Match;
    expect(match.patterns[0].chain.length).toBe(3);
    const source = match.patterns[0].chain[0] as Node;
    const relationship = match.patterns[0].chain[1] as Relationship;
    const target = match.patterns[0].chain[2] as Node;
    expect(source.identifier).toBe("a");
    expect(relationship.type).toBe("KNOWS");
    expect(relationship.hops).not.toBeNull();
    expect(relationship.hops!.min).toBe(1);
    expect(relationship.hops!.max).toBe(3);
    expect(target.identifier).toBe("b");
});

test("Parse statement with graph pattern in where clause", () => {
    const parser = new Parser();
    const ast = parser.parse("MATCH (a:Person) WHERE (a)-[:KNOWS]->(:Person) RETURN a");
    // prettier-ignore
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- Match\n" +
            "- Where\n" +
            "-- Expression\n" +
            "--- PatternExpression\n" +
            "- Return\n" +
            "-- Expression (a)\n" +
            "--- Reference (a)"
    );
    const match = ast.firstChild() as Match;
    expect(match.patterns[0].startNode).not.toBeNull();
    expect(match.patterns[0].startNode!.identifier).toBe("a");
    const where = match.next as any;
    const pattern = where.firstChild().firstChild() as any;
    expect(pattern.chain.length).toBe(3);
    const source = pattern.chain[0] as NodeReference;
    const relationship = pattern.chain[1] as Relationship;
    const target = pattern.chain[2] as Node;
    expect((source.reference as Node)?.identifier).toBe("a");
    expect(relationship.type).toBe("KNOWS");
    expect(target.label).toBe("Person");
});

test("Test check pattern expression without NodeReference", () => {
    const parser = new Parser();
    // Should throw an error because pattern does not start with NodeReference
    expect(() => {
        parser.parse("MATCH (a:Person) WHERE (:Person)-[:KNOWS]->(:Person) RETURN a");
    }).toThrow("PatternExpression must contain at least one NodeReference");
});

test("Test node with properties", () => {
    const parser = new Parser();
    const ast = parser.parse("MATCH (a:Person{value: 'hello'}) return a");
    // prettier-ignore
    expect(ast.print()).toBe(
        "ASTNode\n" +
        "- Match\n" +
        "- Return\n" +
        "-- Expression (a)\n" +
        "--- Reference (a)"
    );
    const match: Match = ast.firstChild() as Match;
    const node: Node = match.patterns[0].chain[0] as Node;
    expect(node.properties.get("value")?.value()).toBe("hello");
});

test("Test WHERE in CREATE VIRTUAL sub-query", () => {
    const parser = new Parser();
    const ast = parser.parse(`
        CREATE VIRTUAL (:Email)-[:HAS_ATTACHMENT]-(:File) AS {
            LOAD JSON FROM '/data/emails.json' AS email
            WHERE email.hasAttachments = true
            UNWIND email.attachments AS fileId
            RETURN email.id AS left_id, fileId AS right_id
        }
    `);
    const create = ast.firstChild() as CreateRelationship;
    expect(create.relationship).not.toBeNull();
    expect(create.relationship!.type).toBe("HAS_ATTACHMENT");
    expect(create.statement).not.toBeNull();
});

test("Test relationship with properties", () => {
    const parser = new Parser();
    const ast = parser.parse("MATCH (:Person)-[r:LIKES{since: 2022}]->(:Food) return a");
    // prettier-ignore
    expect(ast.print()).toBe(
        "ASTNode\n" +
        "- Match\n" +
        "- Return\n" +
        "-- Expression (a)\n" +
        "--- Reference (a)"
    );
    const match: Match = ast.firstChild() as Match;
    const relationship: Relationship = match.patterns[0].chain[1] as Relationship;
    expect(relationship.properties.get("since")?.value()).toBe(2022);
});

test("Test node reference with label creates NodeReference instead of new node", () => {
    const parser = new Parser();
    const ast = parser.parse("MATCH (n:Person)-[:KNOWS]->(n:Person) RETURN n");
    const match: Match = ast.firstChild() as Match;
    const firstNode = match.patterns[0].chain[0] as Node;
    const secondNode = match.patterns[0].chain[2] as NodeReference;
    expect(firstNode.identifier).toBe("n");
    expect(firstNode.label).toBe("Person");
    expect(secondNode).toBeInstanceOf(NodeReference);
    expect((secondNode.reference! as Node).identifier).toBe("n");
    expect(secondNode.label).toBe("Person");
});

test("Test relationship reference with type creates RelationshipReference instead of new relationship", () => {
    const parser = new Parser();
    const ast = parser.parse(
        "MATCH (a:Person)-[r:KNOWS]->(b:Person)-[r:KNOWS]->(c:Person) RETURN a, b, c"
    );
    const match: Match = ast.firstChild() as Match;
    const firstRel = match.patterns[0].chain[1] as Relationship;
    const secondRel = match.patterns[0].chain[3] as RelationshipReference;
    expect(firstRel.identifier).toBe("r");
    expect(firstRel.type).toBe("KNOWS");
    expect(secondRel).toBeInstanceOf(RelationshipReference);
    expect(secondRel.type).toBe("KNOWS");
});

test("Test WHERE with IN list check", () => {
    const parser = new Parser();
    const ast = parser.parse("with 1 as n where n IN [1, 2, 3] return n");
    // prettier-ignore
    expect(ast.print()).toBe(
        "ASTNode\n" +
        "- With\n" +
        "-- Expression (n)\n" +
        "--- Number (1)\n" +
        "- Where\n" +
        "-- Expression\n" +
        "--- In\n" +
        "---- Reference (n)\n" +
        "---- JSONArray\n" +
        "----- Expression\n" +
        "------ Number (1)\n" +
        "----- Expression\n" +
        "------ Number (2)\n" +
        "----- Expression\n" +
        "------ Number (3)\n" +
        "- Return\n" +
        "-- Expression (n)\n" +
        "--- Reference (n)"
    );
});

test("Test WHERE with NOT IN list check", () => {
    const parser = new Parser();
    const ast = parser.parse("with 4 as n where n NOT IN [1, 2, 3] return n");
    // prettier-ignore
    expect(ast.print()).toBe(
        "ASTNode\n" +
        "- With\n" +
        "-- Expression (n)\n" +
        "--- Number (4)\n" +
        "- Where\n" +
        "-- Expression\n" +
        "--- NotIn\n" +
        "---- Reference (n)\n" +
        "---- JSONArray\n" +
        "----- Expression\n" +
        "------ Number (1)\n" +
        "----- Expression\n" +
        "------ Number (2)\n" +
        "----- Expression\n" +
        "------ Number (3)\n" +
        "- Return\n" +
        "-- Expression (n)\n" +
        "--- Reference (n)"
    );
});

test("Test WHERE with CONTAINS", () => {
    const parser = new Parser();
    const ast = parser.parse("with 'hello' as s where s CONTAINS 'ell' return s");
    // prettier-ignore
    expect(ast.print()).toBe(
        "ASTNode\n" +
        "- With\n" +
        "-- Expression (s)\n" +
        "--- String (hello)\n" +
        "- Where\n" +
        "-- Expression\n" +
        "--- Contains\n" +
        "---- Reference (s)\n" +
        "---- String (ell)\n" +
        "- Return\n" +
        "-- Expression (s)\n" +
        "--- Reference (s)"
    );
});

test("Test WHERE with NOT CONTAINS", () => {
    const parser = new Parser();
    const ast = parser.parse("with 'hello' as s where s NOT CONTAINS 'xyz' return s");
    // prettier-ignore
    expect(ast.print()).toBe(
        "ASTNode\n" +
        "- With\n" +
        "-- Expression (s)\n" +
        "--- String (hello)\n" +
        "- Where\n" +
        "-- Expression\n" +
        "--- NotContains\n" +
        "---- Reference (s)\n" +
        "---- String (xyz)\n" +
        "- Return\n" +
        "-- Expression (s)\n" +
        "--- Reference (s)"
    );
});

test("Test WHERE with STARTS WITH", () => {
    const parser = new Parser();
    const ast = parser.parse("with 'hello' as s where s STARTS WITH 'hel' return s");
    // prettier-ignore
    expect(ast.print()).toBe(
        "ASTNode\n" +
        "- With\n" +
        "-- Expression (s)\n" +
        "--- String (hello)\n" +
        "- Where\n" +
        "-- Expression\n" +
        "--- StartsWith\n" +
        "---- Reference (s)\n" +
        "---- String (hel)\n" +
        "- Return\n" +
        "-- Expression (s)\n" +
        "--- Reference (s)"
    );
});

test("Test WHERE with NOT STARTS WITH", () => {
    const parser = new Parser();
    const ast = parser.parse("with 'hello' as s where s NOT STARTS WITH 'xyz' return s");
    // prettier-ignore
    expect(ast.print()).toBe(
        "ASTNode\n" +
        "- With\n" +
        "-- Expression (s)\n" +
        "--- String (hello)\n" +
        "- Where\n" +
        "-- Expression\n" +
        "--- NotStartsWith\n" +
        "---- Reference (s)\n" +
        "---- String (xyz)\n" +
        "- Return\n" +
        "-- Expression (s)\n" +
        "--- Reference (s)"
    );
});

test("Test WHERE with ENDS WITH", () => {
    const parser = new Parser();
    const ast = parser.parse("with 'hello' as s where s ENDS WITH 'llo' return s");
    // prettier-ignore
    expect(ast.print()).toBe(
        "ASTNode\n" +
        "- With\n" +
        "-- Expression (s)\n" +
        "--- String (hello)\n" +
        "- Where\n" +
        "-- Expression\n" +
        "--- EndsWith\n" +
        "---- Reference (s)\n" +
        "---- String (llo)\n" +
        "- Return\n" +
        "-- Expression (s)\n" +
        "--- Reference (s)"
    );
});

test("Test WHERE with NOT ENDS WITH", () => {
    const parser = new Parser();
    const ast = parser.parse("with 'hello' as s where s NOT ENDS WITH 'xyz' return s");
    // prettier-ignore
    expect(ast.print()).toBe(
        "ASTNode\n" +
        "- With\n" +
        "-- Expression (s)\n" +
        "--- String (hello)\n" +
        "- Where\n" +
        "-- Expression\n" +
        "--- NotEndsWith\n" +
        "---- Reference (s)\n" +
        "---- String (xyz)\n" +
        "- Return\n" +
        "-- Expression (s)\n" +
        "--- Reference (s)"
    );
});

test("Test parenthesized expression with addition", () => {
    const parser = new Parser();
    const ast = parser.parse("WITH 1 AS n RETURN (n + 2)");
    // prettier-ignore
    expect(ast.print()).toBe(
        "ASTNode\n" +
        "- With\n" +
        "-- Expression (n)\n" +
        "--- Number (1)\n" +
        "- Return\n" +
        "-- Expression\n" +
        "--- Expression\n" +
        "---- Add\n" +
        "----- Reference (n)\n" +
        "----- Number (2)"
    );
});

test("Test parenthesized expression with property access", () => {
    const parser = new Parser();
    const ast = parser.parse("WITH {a: 1} AS obj RETURN (obj.a)");
    // prettier-ignore
    expect(ast.print()).toBe(
        "ASTNode\n" +
        "- With\n" +
        "-- Expression (obj)\n" +
        "--- AssociativeArray\n" +
        "---- KeyValuePair\n" +
        "----- String (a)\n" +
        "----- Expression\n" +
        "------ Number (1)\n" +
        "- Return\n" +
        "-- Expression\n" +
        "--- Expression\n" +
        "---- Lookup\n" +
        "----- Identifier (a)\n" +
        "----- Reference (obj)"
    );
});

test("Test parenthesized expression with multiplication", () => {
    const parser = new Parser();
    const ast = parser.parse("WITH 5 AS x RETURN (x * 3)");
    // prettier-ignore
    expect(ast.print()).toBe(
        "ASTNode\n" +
        "- With\n" +
        "-- Expression (x)\n" +
        "--- Number (5)\n" +
        "- Return\n" +
        "-- Expression\n" +
        "--- Expression\n" +
        "---- Multiply\n" +
        "----- Reference (x)\n" +
        "----- Number (3)"
    );
});

test("Test optional match operation", () => {
    const parser = new Parser();
    const ast = parser.parse("OPTIONAL MATCH (n:Person) RETURN n");
    // prettier-ignore
    expect(ast.print()).toBe(
        "ASTNode\n" +
        "- OptionalMatch\n" +
        "- Return\n" +
        "-- Expression (n)\n" +
        "--- Reference (n)"
    );
    const match = ast.firstChild() as Match;
    expect(match.optional).toBe(true);
    expect(match.patterns[0].startNode).not.toBeNull();
    expect(match.patterns[0].startNode!.label).toBe("Person");
    expect(match.patterns[0].startNode!.identifier).toBe("n");
});

test("Optional match with relationships", () => {
    const parser = new Parser();
    const ast = parser.parse("OPTIONAL MATCH (a:Person)-[:KNOWS]-(b:Person) RETURN a, b");
    // prettier-ignore
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- OptionalMatch\n" +
            "- Return\n" +
            "-- Expression (a)\n" +
            "--- Reference (a)\n" +
            "-- Expression (b)\n" +
            "--- Reference (b)"
    );
    const match = ast.firstChild() as Match;
    expect(match.optional).toBe(true);
    expect(match.patterns[0].chain.length).toBe(3);
    const source = match.patterns[0].chain[0] as Node;
    const relationship = match.patterns[0].chain[1] as Relationship;
    const target = match.patterns[0].chain[2] as Node;
    expect(source.identifier).toBe("a");
    expect(source.label).toBe("Person");
    expect(relationship.type).toBe("KNOWS");
    expect(target.identifier).toBe("b");
    expect(target.label).toBe("Person");
});

test("Match followed by optional match", () => {
    const parser = new Parser();
    const ast = parser.parse("MATCH (a:Person) OPTIONAL MATCH (a)-[:KNOWS]-(b:Person) RETURN a, b");
    // prettier-ignore
    expect(ast.print()).toBe(
        "ASTNode\n" +
            "- Match\n" +
            "- OptionalMatch\n" +
            "- Return\n" +
            "-- Expression (a)\n" +
            "--- Reference (a)\n" +
            "-- Expression (b)\n" +
            "--- Reference (b)"
    );
    const match = ast.firstChild() as Match;
    expect(match.optional).toBe(false);
    const optionalMatch = match.next as Match;
    expect(optionalMatch.optional).toBe(true);
});

test("Regular match is not optional", () => {
    const parser = new Parser();
    const ast = parser.parse("MATCH (n:Person) RETURN n");
    const match = ast.firstChild() as Match;
    expect(match.optional).toBe(false);
});

test("OPTIONAL without MATCH throws error", () => {
    const parser = new Parser();
    expect(() => parser.parse("OPTIONAL RETURN 1")).toThrow("Expected MATCH after OPTIONAL");
});

// ORDER BY expression tests

test("ORDER BY with simple identifier parses correctly", () => {
    const parser = new Parser();
    const ast = parser.parse("unwind [1, 2] as x return x order by x");
    expect(ast).toBeDefined();
});

test("ORDER BY with property access parses correctly", () => {
    const parser = new Parser();
    const ast = parser.parse(
        "unwind [{name: 'Bob'}, {name: 'Alice'}] as person return person.name as name order by person.name asc"
    );
    expect(ast).toBeDefined();
});

test("ORDER BY with function call parses correctly", () => {
    const parser = new Parser();
    const ast = parser.parse(
        "unwind ['HELLO', 'WORLD'] as word return word order by toLower(word) asc"
    );
    expect(ast).toBeDefined();
});

test("ORDER BY with nested function calls parses correctly", () => {
    const parser = new Parser();
    const ast = parser.parse(
        "unwind ['Alice', 'Bob'] as name return name order by string_distance(toLower(name), toLower('alice')) asc"
    );
    expect(ast).toBeDefined();
});

test("ORDER BY with arithmetic expression parses correctly", () => {
    const parser = new Parser();
    const ast = parser.parse(
        "unwind [{a: 3, b: 1}, {a: 1, b: 5}] as item return item.a as a, item.b as b order by item.a + item.b desc"
    );
    expect(ast).toBeDefined();
});

test("ORDER BY with multiple expression fields parses correctly", () => {
    const parser = new Parser();
    const ast = parser.parse(
        "unwind [{a: 1, b: 2}] as item return item.a as a, item.b as b order by toLower(item.a) asc, item.b desc"
    );
    expect(ast).toBeDefined();
});

test("ORDER BY with expression and LIMIT parses correctly", () => {
    const parser = new Parser();
    const ast = parser.parse(
        "unwind ['c', 'a', 'b'] as x return x order by toLower(x) asc limit 2"
    );
    expect(ast).toBeDefined();
});
