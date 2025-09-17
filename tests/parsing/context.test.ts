import Context from "../../src/parsing/context";
import Sum from "../../src/parsing/functions/sum";
import AggregateFunction from "../../src/parsing/functions/aggregate_function";

test('Test Context containsType', () => {
    const context = new Context();
    const sum = new Sum();
    context.push(sum);
    expect(context.containsType(AggregateFunction)).toBe(true);
});

test('Test Context containsType false', () => {
    const context = new Context();
    expect(context.containsType(AggregateFunction)).toBe(false);
});

test('Test Context push and pop', () => {
    const context = new Context();
    const sum = new Sum();
    context.push(sum);
    expect(context.pop()).toBe(sum);
});

test('Test Context pop undefined', () => {
    const context = new Context();
    expect(context.pop()).toBe(undefined);
});