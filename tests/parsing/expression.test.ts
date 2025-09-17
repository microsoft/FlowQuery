import Expression from "../../src/parsing/expressions/expression";
import { Add, Subtract, Multiply, Power, GreaterThan, And } from "../../src/parsing/expressions/operator";
import Number from "../../src/parsing/expressions/number";

test('Test Expression Shunting Yard algorithm', () => {
    const expression = new Expression();
    expression.addNode(new Number('2'));
    expression.addNode(new Add());
    expression.addNode(new Number('3'));
    expression.addNode(new Multiply());
    expression.addNode(new Number('4'));
    expression.addNode(new Subtract());
    expression.addNode(new Number('2'));
    expression.addNode(new Power());
    expression.addNode(new Number('2'));
    expression.finish();
    expect(expression.value()).toBe(10);
});

test('Test Expression with and operator', () => {
    const expression = new Expression();
    expression.addNode(new Number('2'));
    expression.addNode(new And());
    expression.addNode(new Number('3'));
    expression.finish();
    expect(expression.value()).toBe(1);
});

test('Test 1 > 0 and 2 > 1', () => {
    const expression = new Expression();
    expression.addNode(new Number('1'));
    expression.addNode(new GreaterThan());
    expression.addNode(new Number('0'));
    expression.addNode(new And());
    expression.addNode(new Number('2'));
    expression.addNode(new GreaterThan());
    expression.addNode(new Number('1'));
    expression.finish();
    expect(expression.value()).toBe(1);
});