import ASTNode from "../../src/parsing/ast_node";
import Null from "../../src/parsing/components/null";
import Expression from "../../src/parsing/expressions/expression";
import Number from "../../src/parsing/expressions/number";
import {
    Add,
    And,
    Contains,
    EndsWith,
    Equals,
    GreaterThan,
    Is,
    IsNot,
    Multiply,
    NotContains,
    NotEndsWith,
    NotEquals,
    NotStartsWith,
    Power,
    StartsWith,
    Subtract,
    deepEquals,
} from "../../src/parsing/expressions/operator";
import String from "../../src/parsing/expressions/string";

class ObjectValue extends ASTNode {
    private _value: any;
    constructor(value: any) {
        super();
        this._value = value;
    }
    public value(): any {
        return this._value;
    }
}

test("Test Expression Shunting Yard algorithm", () => {
    const expression = new Expression();
    expression.addNode(new Number("2"));
    expression.addNode(new Add());
    expression.addNode(new Number("3"));
    expression.addNode(new Multiply());
    expression.addNode(new Number("4"));
    expression.addNode(new Subtract());
    expression.addNode(new Number("2"));
    expression.addNode(new Power());
    expression.addNode(new Number("2"));
    expression.finish();
    expect(expression.value()).toBe(10);
});

test("Test Expression with and operator", () => {
    const expression = new Expression();
    expression.addNode(new Number("2"));
    expression.addNode(new And());
    expression.addNode(new Number("3"));
    expression.finish();
    expect(expression.value()).toBe(1);
});

test("Test 1 > 0 and 2 > 1", () => {
    const expression = new Expression();
    expression.addNode(new Number("1"));
    expression.addNode(new GreaterThan());
    expression.addNode(new Number("0"));
    expression.addNode(new And());
    expression.addNode(new Number("2"));
    expression.addNode(new GreaterThan());
    expression.addNode(new Number("1"));
    expression.finish();
    expect(expression.value()).toBe(1);
});

test("Test IS NULL with null value", () => {
    const expression = new Expression();
    expression.addNode(new Null());
    expression.addNode(new Is());
    expression.addNode(new Null());
    expression.finish();
    expect(expression.value()).toBe(1);
});

test("Test IS NULL with non-null value", () => {
    const expression = new Expression();
    expression.addNode(new Number("42"));
    expression.addNode(new Is());
    expression.addNode(new Null());
    expression.finish();
    expect(expression.value()).toBe(0);
});

test("Test IS NOT NULL with non-null value", () => {
    const expression = new Expression();
    expression.addNode(new Number("42"));
    expression.addNode(new IsNot());
    expression.addNode(new Null());
    expression.finish();
    expect(expression.value()).toBe(1);
});

test("Test IS NOT NULL with null value", () => {
    const expression = new Expression();
    expression.addNode(new Null());
    expression.addNode(new IsNot());
    expression.addNode(new Null());
    expression.finish();
    expect(expression.value()).toBe(0);
});

test("Test CONTAINS with matching substring", () => {
    const expression = new Expression();
    expression.addNode(new String("pineapple"));
    expression.addNode(new Contains());
    expression.addNode(new String("apple"));
    expression.finish();
    expect(expression.value()).toBe(1);
});

test("Test CONTAINS with non-matching substring", () => {
    const expression = new Expression();
    expression.addNode(new String("banana"));
    expression.addNode(new Contains());
    expression.addNode(new String("apple"));
    expression.finish();
    expect(expression.value()).toBe(0);
});

test("Test NOT CONTAINS", () => {
    const expression = new Expression();
    expression.addNode(new String("banana"));
    expression.addNode(new NotContains());
    expression.addNode(new String("apple"));
    expression.finish();
    expect(expression.value()).toBe(1);
});

test("Test STARTS WITH matching prefix", () => {
    const expression = new Expression();
    expression.addNode(new String("pineapple"));
    expression.addNode(new StartsWith());
    expression.addNode(new String("pine"));
    expression.finish();
    expect(expression.value()).toBe(1);
});

test("Test STARTS WITH non-matching prefix", () => {
    const expression = new Expression();
    expression.addNode(new String("pineapple"));
    expression.addNode(new StartsWith());
    expression.addNode(new String("apple"));
    expression.finish();
    expect(expression.value()).toBe(0);
});

test("Test NOT STARTS WITH", () => {
    const expression = new Expression();
    expression.addNode(new String("pineapple"));
    expression.addNode(new NotStartsWith());
    expression.addNode(new String("apple"));
    expression.finish();
    expect(expression.value()).toBe(1);
});

test("Test ENDS WITH matching suffix", () => {
    const expression = new Expression();
    expression.addNode(new String("pineapple"));
    expression.addNode(new EndsWith());
    expression.addNode(new String("apple"));
    expression.finish();
    expect(expression.value()).toBe(1);
});

test("Test ENDS WITH non-matching suffix", () => {
    const expression = new Expression();
    expression.addNode(new String("pineapple"));
    expression.addNode(new EndsWith());
    expression.addNode(new String("banana"));
    expression.finish();
    expect(expression.value()).toBe(0);
});

test("Test NOT ENDS WITH", () => {
    const expression = new Expression();
    expression.addNode(new String("pineapple"));
    expression.addNode(new NotEndsWith());
    expression.addNode(new String("banana"));
    expression.finish();
    expect(expression.value()).toBe(1);
});

// deepEquals unit tests

test("deepEquals with identical primitives", () => {
    expect(deepEquals(1, 1)).toBe(true);
    expect(deepEquals("abc", "abc")).toBe(true);
    expect(deepEquals(null, null)).toBe(true);
});

test("deepEquals with different primitives", () => {
    expect(deepEquals(1, 2)).toBe(false);
    expect(deepEquals("abc", "def")).toBe(false);
    expect(deepEquals(null, 1)).toBe(false);
    expect(deepEquals(1, "1")).toBe(false);
});

test("deepEquals with identical objects", () => {
    const obj = { id: "1", name: "Alice" };
    expect(deepEquals(obj, obj)).toBe(true);
});

test("deepEquals with structurally equal objects", () => {
    expect(deepEquals({ id: "1", name: "Alice" }, { id: "1", name: "Alice" })).toBe(true);
});

test("deepEquals with different objects", () => {
    expect(deepEquals({ id: "1", name: "Alice" }, { id: "2", name: "Bob" })).toBe(false);
});

test("deepEquals with nested objects", () => {
    expect(
        deepEquals({ id: "1", data: { x: 1, y: [2, 3] } }, { id: "1", data: { x: 1, y: [2, 3] } })
    ).toBe(true);
    expect(
        deepEquals({ id: "1", data: { x: 1, y: [2, 3] } }, { id: "1", data: { x: 1, y: [2, 4] } })
    ).toBe(false);
});

test("deepEquals with arrays", () => {
    expect(deepEquals([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEquals([1, 2, 3], [1, 2])).toBe(false);
    expect(deepEquals([1, 2], [1, 2, 3])).toBe(false);
});

test("deepEquals with objects having different keys", () => {
    expect(deepEquals({ a: 1 }, { b: 1 })).toBe(false);
    expect(deepEquals({ a: 1 }, { a: 1, b: 2 })).toBe(false);
});

// Equals operator with objects

test("Test Equals with equal numbers", () => {
    const expression = new Expression();
    expression.addNode(new Number("42"));
    expression.addNode(new Equals());
    expression.addNode(new Number("42"));
    expression.finish();
    expect(expression.value()).toBe(1);
});

test("Test Equals with different numbers", () => {
    const expression = new Expression();
    expression.addNode(new Number("42"));
    expression.addNode(new Equals());
    expression.addNode(new Number("99"));
    expression.finish();
    expect(expression.value()).toBe(0);
});

test("Test Equals with structurally equal objects", () => {
    const expression = new Expression();
    expression.addNode(new ObjectValue({ id: "1", name: "Alice" }));
    expression.addNode(new Equals());
    expression.addNode(new ObjectValue({ id: "1", name: "Alice" }));
    expression.finish();
    expect(expression.value()).toBe(1);
});

test("Test Equals with different objects", () => {
    const expression = new Expression();
    expression.addNode(new ObjectValue({ id: "1", name: "Alice" }));
    expression.addNode(new Equals());
    expression.addNode(new ObjectValue({ id: "2", name: "Bob" }));
    expression.finish();
    expect(expression.value()).toBe(0);
});

test("Test NotEquals with structurally equal objects", () => {
    const expression = new Expression();
    expression.addNode(new ObjectValue({ id: "1", name: "Alice" }));
    expression.addNode(new NotEquals());
    expression.addNode(new ObjectValue({ id: "1", name: "Alice" }));
    expression.finish();
    expect(expression.value()).toBe(0);
});

test("Test NotEquals with different objects", () => {
    const expression = new Expression();
    expression.addNode(new ObjectValue({ id: "1", name: "Alice" }));
    expression.addNode(new NotEquals());
    expression.addNode(new ObjectValue({ id: "2", name: "Bob" }));
    expression.finish();
    expect(expression.value()).toBe(1);
});

test("Test Equals with same reference object", () => {
    const obj = { id: "1", name: "Alice" };
    const expression = new Expression();
    expression.addNode(new ObjectValue(obj));
    expression.addNode(new Equals());
    expression.addNode(new ObjectValue(obj));
    expression.finish();
    expect(expression.value()).toBe(1);
});
