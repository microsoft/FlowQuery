import Null from "../../src/parsing/components/null";
import Expression from "../../src/parsing/expressions/expression";
import Number from "../../src/parsing/expressions/number";
import {
    Add,
    And,
    Contains,
    EndsWith,
    GreaterThan,
    Is,
    IsNot,
    Multiply,
    NotContains,
    NotEndsWith,
    NotStartsWith,
    Power,
    StartsWith,
    Subtract,
} from "../../src/parsing/expressions/operator";
import String from "../../src/parsing/expressions/string";

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
