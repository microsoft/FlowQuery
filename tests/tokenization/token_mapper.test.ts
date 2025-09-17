import TokenMapper from "../../src/tokenization/token_mapper";
import Symbol from "../../src/tokenization/symbol";
import Keyword from "../../src/tokenization/keyword";
import Operator from "../../src/tokenization/operator";

test('mapper with Symbols', () => {
    const mapper = new TokenMapper(Symbol);
    expect(mapper.map(Symbol.LEFT_PARENTHESIS)).toBeDefined();
    expect(mapper.map(Symbol.RIGHT_PARENTHESIS)).toBeDefined();
    expect(mapper.map(Symbol.COMMA)).toBeDefined();
    expect(mapper.map(Symbol.DOT)).toBeDefined();
    expect(mapper.map(Symbol.COLON)).toBeDefined();

    expect(mapper.map(Operator.ADD)).toBeUndefined();
});

test('mapper with Keywords', () => {
    const mapper = new TokenMapper(Keyword);
    expect(mapper.map(Keyword.MATCH)).toBeDefined();
    expect(mapper.map(Keyword.RETURN)).toBeDefined();
    expect(mapper.map(Keyword.WHERE)).toBeDefined();

    expect(mapper.map('not_a_keyword')).toBeUndefined();
});

test('mapper with Operators', () => {
    const mapper = new TokenMapper(Operator);
    expect(mapper.map(Operator.GREATER_THAN_OR_EQUAL)).toBeDefined();
    expect(mapper.map(Operator.ADD.valueOf())).toBeDefined();
    expect(mapper.map(Operator.SUBTRACT)).toBeDefined();
    expect(mapper.map(Operator.NOT)).toBeDefined();
    expect(mapper.map(Operator.EQUALS)).toBeDefined();
    expect(mapper.map(Operator.NOT_EQUALS)).toBeDefined();
    expect(mapper.map(Operator.LESS_THAN)).toBeDefined();
    expect(mapper.map(Operator.LESS_THAN_OR_EQUAL)).toBeDefined();

    expect(mapper.map(Operator.GREATER_THAN_OR_EQUAL + "1")).toBeDefined();

    expect(mapper.map('i_s_n_o_t_an_operator')).toBeUndefined();
});

test('mapper with mixed types', () => {
    const mapper = new TokenMapper(Symbol);
    expect(mapper.map(Symbol.LEFT_PARENTHESIS)).toBeDefined();
    expect(mapper.map(Symbol.RIGHT_PARENTHESIS)).toBeDefined();
    expect(mapper.map(Symbol.COMMA)).toBeDefined();
});