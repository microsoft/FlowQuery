import Null from "../../src/parsing/components/null";
import Expression from "../../src/parsing/expressions/expression";
import Number from "../../src/parsing/expressions/number";
import {
    Add,
    And,
    GreaterThan,
    Is,
    IsNot,
    Multiply,
    Power,
    Subtract,
} from "../../src/parsing/expressions/operator";

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
