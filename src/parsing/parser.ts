import Return from "./operations/return";
import Expression from "./expressions/expression";
import ASTNode from "./ast_node";
import BaseParser from "./base_parser";
import FunctionFactory from "./functions/function_factory";
import Function from "./functions/function";
import AssociativeArray from "./data_structures/associative_array";
import JSONArray from "./data_structures/json_array";
import KeyValuePair from "./data_structures/key_value_pair";
import With from "./operations/with";
import Unwind from "./operations/unwind";
import Where from "./operations/where";
import { AliasOption } from "./alias_option";
import Load from "./operations/load";
import From from "./components/from";
import Alias from "./alias";
import Headers from "./components/headers";
import Case from "./logic/case";
import When from "./logic/when";
import Else from "./logic/else";
import Then from "./logic/then";
import Lookup from "./data_structures/lookup";
import { Not } from "./expressions/operator";
import Reference from "./expressions/reference";
import Operation from "./operations/operation";
import Post from './components/post';
import AggregatedReturn from "./operations/aggregated_return";
import Context from "./context";
import AggregateFunction from "./functions/aggregate_function";
import ObjectUtils from "../utils/object_utils";
import PredicateFunction from "./functions/predicate_function";
import Token from "../tokenization/token";
import PredicateFunctionFactory from "./functions/predicate_function_factory";
import FString from "./expressions/f_string";
import String from "./expressions/string";
import AggregatedWith from "./operations/aggregated_with";
import Identifier from "./expressions/identifier";
import Limit from "./operations/limit";
import RangeLookup from "./data_structures/range_lookup";
import Null from "./components/null";

/**
 * Main parser for FlowQuery statements.
 * 
 * Parses FlowQuery declarative query language statements into an Abstract Syntax Tree (AST).
 * Supports operations like WITH, UNWIND, RETURN, LOAD, WHERE, and LIMIT, along with
 * expressions, functions, data structures, and logical constructs.
 * 
 * @example
 * ```typescript
 * const parser = new Parser();
 * const ast = parser.parse("unwind [1, 2, 3, 4] as num return num");
 * ```
 */
class Parser extends BaseParser {
    private variables: Map<string, ASTNode> = new Map();
    private context: Context = new Context();
    private _returns: number = 0;

    /**
     * Parses a FlowQuery statement into an Abstract Syntax Tree.
     * 
     * @param statement - The FlowQuery statement to parse
     * @returns The root AST node containing the parsed structure
     * @throws {Error} If the statement is malformed or contains syntax errors
     * 
     * @example
     * ```typescript
     * const ast = parser.parse("LOAD JSON FROM 'https://api.adviceslip.com/advice' AS data RETURN data");
     * ```
     */
    public parse(statement: string): ASTNode {
        this.tokenize(statement);
        const root: ASTNode = new ASTNode();
        let previous: Operation | null = null;
        let operation: Operation | null = null;
        while(!this.token.isEOF()) {
            if(root.childCount() > 0) {
                this.expectAndSkipWhitespaceAndComments();
            } else {
                this.skipWhitespaceAndComments();
            }
            operation = this.parseOperation();
            if(operation === null) {
                throw new Error('Expected one of WITH, UNWIND, RETURN, or LOAD');
            }
            if(this._returns > 1) {
                throw new Error('Only one RETURN statement is allowed');
            }
            if(previous !== null) {
                previous.addSibling(operation);
            } else {
                root.addChild(operation);
            }
            const where = this.parseWhere();
            if(where !== null) {
                if(operation instanceof Return) {
                    (operation as Return).where = where;
                } else {
                    operation.addSibling(where);
                    operation = where;
                }
            }
            const limit = this.parseLimit();
            if(limit !== null) {
                operation.addSibling(limit);
                operation = limit;
            }
            previous = operation;
        }
        if(!(operation instanceof Return)) {
            throw new Error('Last statement must be a RETURN or a WHERE statement');
        }
        return root;
    }

    private parseOperation(): Operation | null {
        return (
            this.parseWith() ||
            this.parseUnwind() ||
            this.parseReturn() ||
            this.parseLoad()
        );
    }
    
    private parseWith(): With | null {
        if(!this.token.isWith()) {
            return null;
        }
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        const expressions = Array.from(this.parseExpressions(AliasOption.REQUIRED));
        if(expressions.length === 0) {
            throw new Error('Expected expression');
        }
        if(expressions.some((expression: Expression) => expression.has_reducers())) {
            return new AggregatedWith(expressions);
        }
        return new With(expressions);
    }

    private parseUnwind(): Unwind | null {
        if(!this.token.isUnwind()) {
            return null;
        }
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        const expression: Expression | null = this.parseExpression();
        if(expression === null) {
            throw new Error('Expected expression');
        }
        if(!ObjectUtils.isInstanceOfAny(expression.firstChild(), [JSONArray, Function, Reference, Lookup, RangeLookup])) {
            throw new Error('Expected array, function, reference, or lookup.');
        }
        this.expectAndSkipWhitespaceAndComments();
        const alias = this.parseAlias();
        if(alias !== null) {
            expression.setAlias(alias.getAlias());
        } else {
            throw new Error('Expected alias');
        }
        const unwind = new Unwind(expression);
        this.variables.set(alias.getAlias(), unwind);
        return unwind;
    }

    private parseReturn(): Return | null {
        if(!this.token.isReturn()) {
            return null;
        }
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        const expressions = Array.from(this.parseExpressions(AliasOption.OPTIONAL));
        if(expressions.length === 0) {
            throw new Error('Expected expression');
        }
        if(expressions.some((expression: Expression) => expression.has_reducers())) {
            return new AggregatedReturn(expressions);
        }
        this._returns++;
        return new Return(expressions);
    }

    private parseWhere(): Where | null {
        if(!this.token.isWhere()) {
            return null;
        }
        this.expectPreviousTokenToBeWhitespaceOrComment();
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        const expression = this.parseExpression();
        if(expression === null) {
            throw new Error('Expected expression');
        }
        if(ObjectUtils.isInstanceOfAny(expression.firstChild(), [JSONArray, AssociativeArray])) {
            throw new Error('Expected an expression which can be evaluated to a boolean');
        }
        return new Where(expression);
    }

    private parseLoad(): Load | null {
        if(!this.token.isLoad()) {
            return null;
        }
        const load = new Load();
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        if(!(this.token.isJSON() || this.token.isCSV() || this.token.isText())) {
            throw new Error('Expected JSON, CSV, or TEXT');
        }
        load.addChild(this.token.node);
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        if(!this.token.isFrom()) {
            throw new Error('Expected FROM');
        }
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        const from = new From();
        load.addChild(from);
        const expression = this.parseExpression();
        if(expression === null) {
            throw new Error('Expected expression');
        }
        from.addChild(expression);
        this.expectAndSkipWhitespaceAndComments();
        if(this.token.isHeaders()) {
            const headers = new Headers();
            this.setNextToken();
            this.expectAndSkipWhitespaceAndComments();
            const header = this.parseExpression();
            if(header === null) {
                throw new Error('Expected expression');
            }
            headers.addChild(header);
            load.addChild(headers);
            this.expectAndSkipWhitespaceAndComments();
        }
        if(this.token.isPost()) {
            const post = new Post();
            this.setNextToken();
            this.expectAndSkipWhitespaceAndComments();
            const payload = this.parseExpression();
            if(payload === null) {
                throw new Error('Expected expression');
            }
            post.addChild(payload);
            load.addChild(post);
            this.expectAndSkipWhitespaceAndComments();
        }
        const alias = this.parseAlias();
        if(alias !== null) {
            load.addChild(alias);
            this.variables.set(alias.getAlias(), load);
        } else {
            throw new Error('Expected alias');
        }
        return load;
    }

    private parseLimit(): Limit | null {
        this.skipWhitespaceAndComments();
        if(!this.token.isLimit()) {
            return null;
        }
        this.expectPreviousTokenToBeWhitespaceOrComment();
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        if(!this.token.isNumber()) {
            throw new Error('Expected number');
        }
        const limit = new Limit(parseInt(this.token.value || '0'));
        this.setNextToken();
        return limit;
    }

    private *parseExpressions(alias_option: AliasOption = AliasOption.NOT_ALLOWED): IterableIterator<Expression> {
        while(true) {
            const expression: Expression | null = this.parseExpression();
            if(expression !== null) {
                const alias = this.parseAlias();
                if(expression.firstChild() instanceof Reference && alias === null) {
                    const reference: Reference = expression.firstChild() as Reference;
                    expression.setAlias(reference.identifier);
                    this.variables.set(reference.identifier, expression);
                } else if(alias_option === AliasOption.REQUIRED && alias === null && !(expression.firstChild() instanceof Reference)) {
                    throw new Error('Alias required');
                } else if(alias_option === AliasOption.NOT_ALLOWED && alias !== null) {
                    throw new Error('Alias not allowed');
                } else if([AliasOption.OPTIONAL, AliasOption.REQUIRED].includes(alias_option) && alias !== null) {
                    expression.setAlias(alias.getAlias());
                    this.variables.set(alias.getAlias(), expression);
                }
                yield expression;
            } else {
                break;
            }
            this.skipWhitespaceAndComments();
            if(!this.token.isComma()) {
                break;
            }
            this.setNextToken();
        }
    }

    private parseExpression(): Expression | null {
        const expression = new Expression();
        while(true) {
            this.skipWhitespaceAndComments();
            if(this.token.isIdentifier() && !this.peek()?.isLeftParenthesis()) {
                const identifier: string = this.token.value || '';
                const reference = new Reference(identifier, this.variables.get(identifier));
                this.setNextToken();
                const lookup = this.parseLookup(reference);
                expression.addNode(lookup);
            } else if(this.token.isIdentifier() && this.peek()?.isLeftParenthesis()) {
                const func = this.parsePredicateFunction() || this.parseFunction();
                if(func !== null) {
                    const lookup = this.parseLookup(func);
                    expression.addNode(lookup);
                }
            } else if(this.token.isOperand()) {
                expression.addNode(this.token.node);
                this.setNextToken();
            } else if(this.token.isFString()) {
                const f_string = this.parseFString();
                if(f_string === null) {
                    throw new Error('Expected f-string');
                }
                expression.addNode(f_string);
            } else if(this.token.isLeftParenthesis()) {
                this.setNextToken();
                const sub = this.parseExpression();
                if(sub === null) {
                    throw new Error('Expected expression');
                }
                if(!this.token.isRightParenthesis()) {
                    throw new Error('Expected right parenthesis');
                }
                this.setNextToken();
                const lookup = this.parseLookup(sub);
                expression.addNode(lookup);
            } else if(this.token.isOpeningBrace() || this.token.isOpeningBracket()) {
                const json = this.parseJSON();
                if(json === null) {
                    throw new Error('Expected JSON object');
                }
                const lookup = this.parseLookup(json);
                expression.addNode(lookup);
            } else if(this.token.isCase()) {
                const _case = this.parseCase();
                if(_case === null) {
                    throw new Error('Expected CASE statement');
                }
                expression.addNode(_case);
            } else if(this.token.isNot()) {
                const not = new Not();
                this.setNextToken();
                const sub = this.parseExpression();
                if(sub === null) {
                    throw new Error('Expected expression');
                }
                not.addChild(sub);
                expression.addNode(not);
            } else {
                if(expression.nodesAdded()) {
                    throw new Error('Expected operand or left parenthesis');
                } else {
                    break;
                }
            }
            this.skipWhitespaceAndComments();
            if(this.token.isOperator()) {
                expression.addNode(this.token.node);
            } else {
                break;
            }
            this.setNextToken();
        }
        if(expression.nodesAdded()) {
            expression.finish();
            return expression;
        }
        return null;
    }

    private parseLookup(node: ASTNode): ASTNode {
        let variable: ASTNode = node;
        let lookup: Lookup | RangeLookup | null = null;
        while(true) {
            if(this.token.isDot()) {
                this.setNextToken();
                if(!this.token.isIdentifier() && !this.token.isKeyword()) {
                    throw new Error('Expected identifier');
                }
                lookup = new Lookup();
                lookup.index = new Identifier(this.token.value || '');
                lookup.variable = variable;
                this.setNextToken();
            } else if(this.token.isOpeningBracket()) {
                this.setNextToken();
                this.skipWhitespaceAndComments();
                const index = this.parseExpression();
                let to: Expression | null = null;
                this.skipWhitespaceAndComments();
                if(this.token.isColon()) {
                    this.setNextToken();
                    this.skipWhitespaceAndComments();
                    lookup = new RangeLookup();
                    to = this.parseExpression();
                } else {
                    if(index === null) {
                        throw new Error('Expected expression');
                    }
                    lookup = new Lookup();
                }
                this.skipWhitespaceAndComments();
                if(!this.token.isClosingBracket()) {
                    throw new Error('Expected closing bracket');
                }
                this.setNextToken();
                if(lookup instanceof RangeLookup) {
                    lookup.from = index || new Null();
                    lookup.to = to || new Null();
                } else if(lookup instanceof Lookup && index !== null) {
                    lookup.index = index;
                }
                lookup.variable = variable;
            } else {
                break;
            }
            variable = lookup || variable;
        }
        return variable;
    }

    private parseCase(): Case | null {
        if(!this.token.isCase()) {
            return null;
        }
        this.setNextToken();
        const _case = new Case();
        let parts: number = 0;
        this.expectAndSkipWhitespaceAndComments();
        while(true) {
            const when = this.parseWhen();
            if(when === null && parts === 0) {
                throw new Error('Expected WHEN');
            } else if(when === null && parts > 0) {
                break;
            } else if (when !== null) {
                _case.addChild(when);
            }
            this.expectAndSkipWhitespaceAndComments();
            const then = this.parseThen();
            if(then === null) {
                throw new Error('Expected THEN');
            } else {
                _case.addChild(then);
            }
            this.expectAndSkipWhitespaceAndComments();
            parts++;
        }
        const _else = this.parseElse();
        if(_else === null) {
            throw new Error('Expected ELSE');
        } else {
            _case.addChild(_else);
        }
        this.expectAndSkipWhitespaceAndComments();
        if(!this.token.isEnd()) {
            throw new Error('Expected END');
        }
        this.setNextToken();
        return _case;
    }

    private parseWhen(): When | null {
        if(!this.token.isWhen()) {
            return null;
        }
        this.setNextToken();
        const when = new When();
        this.expectAndSkipWhitespaceAndComments();
        const expression = this.parseExpression();
        if(expression === null) {
            throw new Error('Expected expression');
        }
        when.addChild(expression);
        return when;
    }

    private parseThen(): Then | null {
        if(!this.token.isThen()) {
            return null;
        }
        this.setNextToken();
        const then = new Then();
        this.expectAndSkipWhitespaceAndComments();
        const expression = this.parseExpression();
        if(expression === null) {
            throw new Error('Expected expression');
        }
        then.addChild(expression);
        return then;
    }

    private parseElse(): Else | null {
        if(!this.token.isElse()) {
            return null;
        }
        this.setNextToken();
        const _else = new Else();
        this.expectAndSkipWhitespaceAndComments();
        const expression = this.parseExpression();
        if(expression === null) {
            throw new Error('Expected expression');
        }
        _else.addChild(expression);
        return _else;
    }

    private parseAlias(): Alias | null {
        this.skipWhitespaceAndComments();
        if(!this.token.isAs()) {
            return null;
        }
        this.expectPreviousTokenToBeWhitespaceOrComment();
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        if((!this.token.isIdentifier() && !this.token.isKeyword()) || this.token.value === null) {
            throw new Error('Expected identifier');
        }
        const alias = new Alias(this.token.value || '');
        this.setNextToken();
        return alias;
    }

    private parseFunction(): Function | null {
        if(!this.token.isIdentifier()) {
            return null;
        }
        if(this.token.value === null) {
            throw new Error('Expected identifier');
        }
        if(!this.peek()?.isLeftParenthesis()) {
            return null;
        }
        const func = FunctionFactory.create(this.token.value);
        if(func instanceof AggregateFunction && this.context.containsType(AggregateFunction)) {
            throw new Error('Aggregate functions cannot be nested');
        }
        this.context.push(func);
        this.setNextToken();
        this.setNextToken();
        this.skipWhitespaceAndComments();
        if(this.token.isDistinct()) {
            func.distinct = true;
            this.setNextToken();
            this.expectAndSkipWhitespaceAndComments();
        }
        func.parameters = Array.from(this.parseExpressions(AliasOption.NOT_ALLOWED));
        this.skipWhitespaceAndComments();
        if(!this.token.isRightParenthesis()) {
            throw new Error('Expected right parenthesis');
        }
        this.setNextToken();
        this.context.pop();
        return func;
    }

    private parsePredicateFunction(): PredicateFunction | null {
        if(!this.ahead([Token.IDENTIFIER(""), Token.LEFT_PARENTHESIS, Token.IDENTIFIER(""), Token.IN])) {
            return null;
        }
        if(this.token.value === null) {
            throw new Error('Expected identifier');
        }
        const func = PredicateFunctionFactory.create(this.token.value);
        this.setNextToken();
        if(!this.token.isLeftParenthesis()) {
            throw new Error('Expected left parenthesis');
        }
        this.setNextToken();
        this.skipWhitespaceAndComments();
        if(!this.token.isIdentifier()) {
            throw new Error('Expected identifier');
        }
        const reference = new Reference(this.token.value);
        this.variables.set(reference.identifier, reference);
        func.addChild(reference);
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        if(!this.token.isIn()) {
            throw new Error('Expected IN');
        }
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        const expression = this.parseExpression();
        if(expression === null) {
            throw new Error('Expected expression');
        }
        if(!ObjectUtils.isInstanceOfAny(expression.firstChild(), [JSONArray, Reference, Lookup, Function])) {
            throw new Error('Expected array or reference');
        }
        func.addChild(expression);
        this.skipWhitespaceAndComments();
        if(!this.token.isPipe()) {
            throw new Error('Expected pipe');
        }
        this.setNextToken();
        const _return = this.parseExpression();
        if(_return === null) {
            throw new Error('Expected expression');
        }
        func.addChild(_return);
        const where = this.parseWhere();
        if(where !== null) {
            func.addChild(where);
        }
        this.skipWhitespaceAndComments();
        if(!this.token.isRightParenthesis()) {
            throw new Error('Expected right parenthesis');
        }
        this.setNextToken();
        this.variables.delete(reference.identifier);
        return func;
    }

    private parseFString(): FString | null {
        if(!this.token.isFString()) {
            return null;
        }
        const f_string = new FString();
        while(this.token.isFString()) {
            if(this.token.value !== null) {
                f_string.addChild(new String(this.token.value));
            }
            this.setNextToken();
            if(this.token.isOpeningBrace()) {
                this.setNextToken();
                const expression = this.parseExpression();
                if(expression === null) {
                    throw new Error('Expected expression');
                }
                f_string.addChild(expression);
                if(!this.token.isClosingBrace()) {
                    throw new Error('Expected closing brace');
                }
                this.setNextToken();
            } else {
                break;
            }
        }
        return f_string;
    }

    private parseJSON(): AssociativeArray | JSONArray {
        if(this.token.isOpeningBrace()) {
            const array = this.parseAssociativeArray();
            if(array === null) {
                throw new Error('Expected associative array');
            }
            return array;
        } else if(this.token.isOpeningBracket()) {
            const array = this.parseJSONArray();
            if(array === null) {
                throw new Error('Expected JSON array');
            }
            return array;
        }
        throw new Error('Expected opening brace or bracket');
    }

    private parseAssociativeArray(): AssociativeArray | null {
        if(!this.token.isOpeningBrace()) {
            return null;
        }
        const array = new AssociativeArray();
        this.setNextToken();
        while(true) {
            this.skipWhitespaceAndComments();
            if(this.token.isClosingBrace()) {
                break;
            }
            if(!this.token.isIdentifier() && !this.token.isKeyword()) {
                throw new Error('Expected identifier');
            }
            const key = this.token.value;
            if(key === null) {
                throw new Error('Expected string');
            }
            this.setNextToken();
            this.skipWhitespaceAndComments();
            if(!this.token.isColon()) {
                throw new Error('Expected colon');
            }
            this.setNextToken();
            this.skipWhitespaceAndComments();
            const value = this.parseExpression();
            if(value === null) {
                throw new Error('Expected expression');
            }
            array.addKeyValue(new KeyValuePair(key, value));
            this.skipWhitespaceAndComments();
            if(this.token.isComma()) {
                this.setNextToken();
            }
        }
        this.setNextToken();
        return array;
    }

    private parseJSONArray(): JSONArray | null {
        if(!this.token.isOpeningBracket()) {
            return null;
        }
        const array = new JSONArray();
        this.setNextToken();
        while(true) {
            this.skipWhitespaceAndComments();
            if(this.token.isClosingBracket()) {
                break;
            }
            const value = this.parseExpression();
            if(value === null) {
                throw new Error('Expected expression');
            }
            array.addValue(value);
            this.skipWhitespaceAndComments();
            if(this.token.isComma()) {
                this.setNextToken();
            }
        }
        this.setNextToken();
        return array;
    }

    private expectAndSkipWhitespaceAndComments(): void {
        const skipped = this.skipWhitespaceAndComments();
        if(!skipped) {
            throw new Error('Expected whitespace or comment');
        }
    }

    private skipWhitespaceAndComments(): boolean {
        let skipped: boolean = this.previousToken.isWhitespaceOrComment();
        while(this.token.isWhitespace() || this.token.isComment()) {
            this.setNextToken();
            skipped = true;
        }
        return skipped;
    }

    private expectPreviousTokenToBeWhitespaceOrComment(): void {
        if(!this.previousToken.isWhitespaceOrComment()) {
            throw new Error('Expected whitespace or comment');
        }
    }
}

export default Parser;