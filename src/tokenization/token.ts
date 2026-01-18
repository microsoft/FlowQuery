import ASTNode from "../parsing/ast_node";
import TokenToNode from "../parsing/token_to_node";
import StringUtils from "../utils/string_utils";
import Keyword from "./keyword";
import Operator from "./operator";
import Symbol from "./symbol";
import TokenType from "./token_type";

/**
 * Represents a single token in the FlowQuery language.
 *
 * Tokens are the atomic units of lexical analysis, produced by the tokenizer
 * and consumed by the parser. Each token has a type (keyword, operator, identifier, etc.)
 * and an optional value.
 *
 * @example
 * ```typescript
 * const withToken = Token.WITH;
 * const identToken = Token.IDENTIFIER("myVar");
 * const numToken = Token.NUMBER("42");
 * ```
 */
class Token {
    private _position: number = -1;
    private _type: TokenType;
    private _value: string | null;
    private _case_sensitive_value: string | null = null;
    private _can_be_identifier: boolean = false;

    /**
     * Creates a new Token instance.
     *
     * @param type - The type of the token
     * @param value - The optional value associated with the token
     */
    constructor(type: TokenType, value: string | null = null) {
        this._type = type;
        this._value = value;
        this._can_be_identifier = StringUtils.can_be_identifier(value || "");
    }

    /**
     * Checks if this token equals another token.
     *
     * @param other - The token to compare against
     * @returns True if tokens are equal, false otherwise
     */
    public equals(other: Token): boolean {
        if (this._type === TokenType.IDENTIFIER && other.type === TokenType.IDENTIFIER) {
            return true; // Identifier values are not compared
        }
        return this._type === other.type && this._value === other.value;
    }

    public set position(position: number) {
        this._position = position;
    }

    public get position(): number {
        return this._position;
    }

    public get type(): TokenType {
        return this._type;
    }

    public get value(): string | null {
        return this._case_sensitive_value || this._value;
    }

    public set case_sensitive_value(value: string) {
        this._case_sensitive_value = value;
    }

    public get can_be_identifier(): boolean {
        return this._can_be_identifier;
    }

    public get node(): ASTNode {
        return TokenToNode.convert(this);
    }

    public toString(): string {
        return `${this._type} ${this._value}`;
    }

    // Comment tokens

    public static COMMENT(comment: string): Token {
        return new Token(TokenType.COMMENT, comment);
    }

    public isComment(): boolean {
        return this._type === TokenType.COMMENT;
    }

    // Identifier token

    public static IDENTIFIER(value: string): Token {
        return new Token(TokenType.IDENTIFIER, value);
    }

    public isIdentifier(): boolean {
        return this._type === TokenType.IDENTIFIER || this._type === TokenType.BACKTICK_STRING;
    }

    // String token

    public static STRING(value: string, quoteChar: string = '"'): Token {
        const unquoted = StringUtils.unquote(value);
        const unescaped = StringUtils.removeEscapedQuotes(unquoted, quoteChar);
        return new Token(TokenType.STRING, unescaped);
    }

    public isString(): boolean {
        return this._type === TokenType.STRING || this._type === TokenType.BACKTICK_STRING;
    }

    public static BACKTICK_STRING(value: string, quoteChar: string = '"'): Token {
        const unquoted = StringUtils.unquote(value);
        const unescaped = StringUtils.removeEscapedQuotes(unquoted, quoteChar);
        return new Token(TokenType.BACKTICK_STRING, unescaped);
    }

    public static F_STRING(value: string, quoteChar: string = '"'): Token {
        const unquoted = StringUtils.unquote(value);
        const unescaped = StringUtils.removeEscapedQuotes(unquoted, quoteChar);
        const fstring = StringUtils.removeEscapedBraces(unescaped);
        return new Token(TokenType.F_STRING, fstring);
    }

    public isFString(): boolean {
        return this._type === TokenType.F_STRING;
    }

    // Number token

    public static NUMBER(value: string): Token {
        return new Token(TokenType.NUMBER, value);
    }

    public isNumber(): boolean {
        return this._type === TokenType.NUMBER;
    }

    // Boolean token

    public static BOOLEAN(value: string): Token {
        return new Token(TokenType.BOOLEAN, value);
    }

    public isBoolean(): boolean {
        return (
            this._type === TokenType.BOOLEAN && (this._value === "TRUE" || this._value === "FALSE")
        );
    }

    // Symbol tokens

    public static get LEFT_PARENTHESIS(): Token {
        return new Token(TokenType.SYMBOL, Symbol.LEFT_PARENTHESIS);
    }

    public isLeftParenthesis(): boolean {
        return this._type === TokenType.SYMBOL && this._value === Symbol.LEFT_PARENTHESIS;
    }

    public static get RIGHT_PARENTHESIS(): Token {
        return new Token(TokenType.SYMBOL, Symbol.RIGHT_PARENTHESIS);
    }

    public isRightParenthesis(): boolean {
        return this._type === TokenType.SYMBOL && this._value === Symbol.RIGHT_PARENTHESIS;
    }

    public static get COMMA(): Token {
        return new Token(TokenType.SYMBOL, Symbol.COMMA);
    }

    public isComma(): boolean {
        return this._type === TokenType.SYMBOL && this._value === Symbol.COMMA;
    }

    public static get DOT(): Token {
        return new Token(TokenType.SYMBOL, Symbol.DOT);
    }

    public isDot(): boolean {
        return this._type === TokenType.SYMBOL && this._value === Symbol.DOT;
    }

    public static get COLON(): Token {
        return new Token(TokenType.SYMBOL, Symbol.COLON);
    }

    public isColon(): boolean {
        return this._type === TokenType.SYMBOL && this._value === Symbol.COLON;
    }

    public static get OPENING_BRACE(): Token {
        return new Token(TokenType.SYMBOL, Symbol.OPENING_BRACE);
    }

    public isOpeningBrace(): boolean {
        return this._type === TokenType.SYMBOL && this._value === Symbol.OPENING_BRACE;
    }

    public static get CLOSING_BRACE(): Token {
        return new Token(TokenType.SYMBOL, Symbol.CLOSING_BRACE);
    }

    public isClosingBrace(): boolean {
        return this._type === TokenType.SYMBOL && this._value === Symbol.CLOSING_BRACE;
    }

    public static get OPENING_BRACKET(): Token {
        return new Token(TokenType.SYMBOL, Symbol.OPENING_BRACKET);
    }

    public isOpeningBracket(): boolean {
        return this._type === TokenType.SYMBOL && this._value === Symbol.OPENING_BRACKET;
    }

    public static get CLOSING_BRACKET(): Token {
        return new Token(TokenType.SYMBOL, Symbol.CLOSING_BRACKET);
    }

    public isClosingBracket(): boolean {
        return this._type === TokenType.SYMBOL && this._value === Symbol.CLOSING_BRACKET;
    }

    // Whitespace token

    public static get WHITESPACE(): Token {
        return new Token(TokenType.WHITESPACE);
    }

    public isWhitespace(): boolean {
        return this._type === TokenType.WHITESPACE;
    }

    // Operator tokens

    public isOperator(): boolean {
        return this._type === TokenType.OPERATOR;
    }

    public isUnaryOperator(): boolean {
        return this._type === TokenType.UNARY_OPERATOR;
    }

    public static get ADD(): Token {
        return new Token(TokenType.OPERATOR, Operator.ADD);
    }

    public isAdd(): boolean {
        return this._type === TokenType.OPERATOR && this._value === Operator.ADD;
    }

    public static get SUBTRACT(): Token {
        return new Token(TokenType.OPERATOR, Operator.SUBTRACT);
    }

    public isSubtract(): boolean {
        return this._type === TokenType.OPERATOR && this._value === Operator.SUBTRACT;
    }

    public isNegation(): boolean {
        return this.isSubtract();
    }

    public static get MULTIPLY(): Token {
        return new Token(TokenType.OPERATOR, Operator.MULTIPLY);
    }

    public isMultiply(): boolean {
        return this._type === TokenType.OPERATOR && this._value === Operator.MULTIPLY;
    }

    public static get DIVIDE(): Token {
        return new Token(TokenType.OPERATOR, Operator.DIVIDE);
    }

    public isDivide(): boolean {
        return this._type === TokenType.OPERATOR && this._value === Operator.DIVIDE;
    }

    public static get EXPONENT(): Token {
        return new Token(TokenType.OPERATOR, Operator.EXPONENT);
    }

    public isExponent(): boolean {
        return this._type === TokenType.OPERATOR && this._value === Operator.EXPONENT;
    }

    public static get MODULO(): Token {
        return new Token(TokenType.OPERATOR, Operator.MODULO);
    }

    public isModulo(): boolean {
        return this._type === TokenType.OPERATOR && this._value === Operator.MODULO;
    }

    public static get EQUALS(): Token {
        return new Token(TokenType.OPERATOR, Operator.EQUALS);
    }

    public isEquals(): boolean {
        return this._type === TokenType.OPERATOR && this._value === Operator.EQUALS;
    }

    public static get NOT_EQUALS(): Token {
        return new Token(TokenType.OPERATOR, Operator.NOT_EQUALS);
    }

    public isNotEquals(): boolean {
        return this._type === TokenType.OPERATOR && this._value === Operator.NOT_EQUALS;
    }

    public static get LESS_THAN(): Token {
        return new Token(TokenType.OPERATOR, Operator.LESS_THAN);
    }

    public isLessThan(): boolean {
        return this._type === TokenType.OPERATOR && this._value === Operator.LESS_THAN;
    }

    public static get LESS_THAN_OR_EQUAL(): Token {
        return new Token(TokenType.OPERATOR, Operator.LESS_THAN_OR_EQUAL);
    }

    public isLessThanOrEqual(): boolean {
        return this._type === TokenType.OPERATOR && this._value === Operator.LESS_THAN_OR_EQUAL;
    }

    public static get GREATER_THAN(): Token {
        return new Token(TokenType.OPERATOR, Operator.GREATER_THAN);
    }

    public isGreaterThan(): boolean {
        return this._type === TokenType.OPERATOR && this._value === Operator.GREATER_THAN;
    }

    public static get GREATER_THAN_OR_EQUAL(): Token {
        return new Token(TokenType.OPERATOR, Operator.GREATER_THAN_OR_EQUAL);
    }

    public isGreaterThanOrEqual(): boolean {
        return this._type === TokenType.OPERATOR && this._value === Operator.GREATER_THAN_OR_EQUAL;
    }

    public static get AND(): Token {
        return new Token(TokenType.OPERATOR, Operator.AND);
    }

    public isAnd(): boolean {
        return this._type === TokenType.OPERATOR && this._value === Operator.AND;
    }

    public static get OR(): Token {
        return new Token(TokenType.OPERATOR, Operator.OR);
    }

    public isOr(): boolean {
        return this._type === TokenType.OPERATOR && this._value === Operator.OR;
    }

    public static get NOT(): Token {
        return new Token(TokenType.UNARY_OPERATOR, Operator.NOT);
    }

    public isNot(): boolean {
        return this._type === TokenType.UNARY_OPERATOR && this._value === Operator.NOT;
    }

    public static get IS(): Token {
        return new Token(TokenType.OPERATOR, Operator.IS);
    }

    public isIs(): boolean {
        return this._type === TokenType.OPERATOR && this._value === Operator.IS;
    }

    // Keyword tokens

    public isKeyword(): boolean {
        return this._type === TokenType.KEYWORD;
    }

    public static get WITH(): Token {
        return new Token(TokenType.KEYWORD, Keyword.WITH);
    }

    public isWith(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.WITH;
    }

    public static get RETURN(): Token {
        return new Token(TokenType.KEYWORD, Keyword.RETURN);
    }

    public isReturn(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.RETURN;
    }

    public static get LOAD(): Token {
        return new Token(TokenType.KEYWORD, Keyword.LOAD);
    }

    public isLoad(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.LOAD;
    }

    public static get CALL(): Token {
        return new Token(TokenType.KEYWORD, Keyword.CALL);
    }

    public isCall(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.CALL;
    }

    public static get YIELD(): Token {
        return new Token(TokenType.KEYWORD, Keyword.YIELD);
    }

    public isYield(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.YIELD;
    }

    public static get JSON(): Token {
        return new Token(TokenType.KEYWORD, Keyword.JSON);
    }

    public isJSON(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.JSON;
    }

    public static get CSV(): Token {
        return new Token(TokenType.KEYWORD, Keyword.CSV);
    }

    public isCSV(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.CSV;
    }

    public static get TEXT(): Token {
        return new Token(TokenType.KEYWORD, Keyword.TEXT);
    }

    public isText(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.TEXT;
    }

    public static get FROM(): Token {
        return new Token(TokenType.KEYWORD, Keyword.FROM);
    }

    public isFrom(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.FROM;
    }

    public static get HEADERS(): Token {
        return new Token(TokenType.KEYWORD, Keyword.HEADERS);
    }

    public isHeaders(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.HEADERS;
    }

    public static get POST(): Token {
        return new Token(TokenType.KEYWORD, Keyword.POST);
    }

    public isPost(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.POST;
    }

    public static get UNWIND(): Token {
        return new Token(TokenType.KEYWORD, Keyword.UNWIND);
    }

    public isUnwind(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.UNWIND;
    }

    public static get MATCH(): Token {
        return new Token(TokenType.KEYWORD, Keyword.MATCH);
    }

    public isMatch(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.MATCH;
    }

    public static get AS(): Token {
        return new Token(TokenType.KEYWORD, Keyword.AS);
    }

    public isAs(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.AS;
    }

    public static get WHERE(): Token {
        return new Token(TokenType.KEYWORD, Keyword.WHERE);
    }

    public isWhere(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.WHERE;
    }

    public static get MERGE(): Token {
        return new Token(TokenType.KEYWORD, Keyword.MERGE);
    }

    public isMerge(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.MERGE;
    }

    public static get CREATE(): Token {
        return new Token(TokenType.KEYWORD, Keyword.CREATE);
    }

    public isCreate(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.CREATE;
    }

    public static get VIRTUAL(): Token {
        return new Token(TokenType.KEYWORD, Keyword.VIRTUAL);
    }

    public isVirtual(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.VIRTUAL;
    }

    public static get DELETE(): Token {
        return new Token(TokenType.KEYWORD, Keyword.DELETE);
    }

    public isDelete(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.DELETE;
    }

    public static get SET(): Token {
        return new Token(TokenType.KEYWORD, Keyword.SET);
    }

    public isSet(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.SET;
    }

    public static get REMOVE(): Token {
        return new Token(TokenType.KEYWORD, Keyword.REMOVE);
    }

    public isRemove(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.REMOVE;
    }

    public static get CASE(): Token {
        return new Token(TokenType.KEYWORD, Keyword.CASE);
    }

    public isCase(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.CASE;
    }

    public static get WHEN(): Token {
        return new Token(TokenType.KEYWORD, Keyword.WHEN);
    }

    public isWhen(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.WHEN;
    }

    public static get THEN(): Token {
        return new Token(TokenType.KEYWORD, Keyword.THEN);
    }

    public isThen(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.THEN;
    }

    public static get ELSE(): Token {
        return new Token(TokenType.KEYWORD, Keyword.ELSE);
    }

    public isElse(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.ELSE;
    }

    public static get END(): Token {
        return new Token(TokenType.KEYWORD, Keyword.END);
    }

    public isEnd(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.END;
    }

    public static get NULL(): Token {
        return new Token(TokenType.KEYWORD, Keyword.NULL);
    }

    public isNull(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.NULL;
    }

    public static get IN(): Token {
        return new Token(TokenType.KEYWORD, Keyword.IN);
    }

    public isIn(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.IN;
    }

    public static get PIPE(): Token {
        return new Token(TokenType.KEYWORD, Operator.PIPE);
    }

    public isPipe(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Operator.PIPE;
    }

    public static get DISTINCT(): Token {
        return new Token(TokenType.KEYWORD, Keyword.DISTINCT);
    }

    public isDistinct(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.DISTINCT;
    }

    public static get LIMIT(): Token {
        return new Token(TokenType.KEYWORD, Keyword.LIMIT);
    }

    public isLimit(): boolean {
        return this._type === TokenType.KEYWORD && this._value === Keyword.LIMIT;
    }

    // End of file token

    public static get EOF(): Token {
        return new Token(TokenType.EOF);
    }

    public isEOF(): boolean {
        return this._type === TokenType.EOF;
    }

    // Other utility methods

    public isOperand(): boolean {
        return this.isNumber() || this.isBoolean() || this.isString() || this.isNull();
    }

    public isWhitespaceOrComment(): boolean {
        return this.isWhitespace() || this.isComment();
    }

    public isSymbol(): boolean {
        return this._type === TokenType.SYMBOL;
    }

    // Static class method lookup via string
    public static method(name: string): Token | undefined {
        return (Token as any)[name.toUpperCase()] as Token | undefined;
    }
}

export default Token;
