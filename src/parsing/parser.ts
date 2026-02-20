import Hops from "../graph/hops";
import Node from "../graph/node";
import NodeReference from "../graph/node_reference";
import Pattern from "../graph/pattern";
import PatternExpression from "../graph/pattern_expression";
import Relationship from "../graph/relationship";
import RelationshipReference from "../graph/relationship_reference";
import Token from "../tokenization/token";
import ObjectUtils from "../utils/object_utils";
import Alias from "./alias";
import { AliasOption } from "./alias_option";
import ASTNode from "./ast_node";
import BaseParser from "./base_parser";
import From from "./components/from";
import Headers from "./components/headers";
import Null from "./components/null";
import Post from "./components/post";
import Context from "./context";
import AssociativeArray from "./data_structures/associative_array";
import JSONArray from "./data_structures/json_array";
import KeyValuePair from "./data_structures/key_value_pair";
import Lookup from "./data_structures/lookup";
import RangeLookup from "./data_structures/range_lookup";
import Expression from "./expressions/expression";
import FString from "./expressions/f_string";
import Identifier from "./expressions/identifier";
import {
    Contains,
    EndsWith,
    In,
    Is,
    IsNot,
    Not,
    NotContains,
    NotEndsWith,
    NotIn,
    NotStartsWith,
    StartsWith,
} from "./expressions/operator";
import Reference from "./expressions/reference";
import String from "./expressions/string";
import AggregateFunction from "./functions/aggregate_function";
import AsyncFunction from "./functions/async_function";
import Function from "./functions/function";
import FunctionFactory from "./functions/function_factory";
import PredicateFunction from "./functions/predicate_function";
import Case from "./logic/case";
import Else from "./logic/else";
import Then from "./logic/then";
import When from "./logic/when";
import AggregatedReturn from "./operations/aggregated_return";
import AggregatedWith from "./operations/aggregated_with";
import Call from "./operations/call";
import CreateNode from "./operations/create_node";
import CreateRelationship from "./operations/create_relationship";
import DeleteNode from "./operations/delete_node";
import DeleteRelationship from "./operations/delete_relationship";
import Limit from "./operations/limit";
import Load from "./operations/load";
import Match from "./operations/match";
import Operation from "./operations/operation";
import OrderBy, { SortField } from "./operations/order_by";
import Return from "./operations/return";
import Union from "./operations/union";
import UnionAll from "./operations/union_all";
import Unwind from "./operations/unwind";
import Where from "./operations/where";
import With from "./operations/with";
import ParserState from "./parser_state";

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
 * const ast = parser.parse("unwind [1, 2, 3, 4, 5] as num return num");
 * ```
 */
class Parser extends BaseParser {
    private _state: ParserState = new ParserState();

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
        return this._parseTokenized();
    }

    private _parseTokenized(isSubQuery: boolean = false): ASTNode {
        const root: ASTNode = new ASTNode();
        let previous: Operation | null = null;
        let operation: Operation | null = null;
        while (!this.token.isEOF()) {
            if (root.childCount() > 0) {
                this.expectAndSkipWhitespaceAndComments();
            } else {
                this.skipWhitespaceAndComments();
            }
            // UNION separates two query pipelines — break and handle after the loop
            if (this.token.isUnion()) {
                break;
            }
            if (this.token.isEOF()) {
                break;
            }
            operation = this.parseOperation();
            if (operation === null && !isSubQuery) {
                throw new Error("Expected one of WITH, UNWIND, RETURN, LOAD, OR CALL");
            } else if (operation === null && isSubQuery) {
                return root;
            }
            if (this._state.returns > 1) {
                throw new Error("Only one RETURN statement is allowed");
            }
            if (previous instanceof Call && !previous.hasYield) {
                throw new Error(
                    "CALL operations must have a YIELD clause unless they are the last operation"
                );
            }
            if (previous !== null) {
                previous.addSibling(operation!);
            } else {
                root.addChild(operation!);
            }
            const where = this.parseWhere();
            if (where !== null) {
                if (operation instanceof Return) {
                    (operation as Return).where = where;
                } else {
                    operation!.addSibling(where);
                    operation = where;
                }
            }
            const orderBy = this.parseOrderBy();
            if (orderBy !== null) {
                if (operation instanceof Return) {
                    (operation as Return).orderBy = orderBy;
                } else {
                    operation!.addSibling(orderBy);
                    operation = orderBy;
                }
            }
            const limit = this.parseLimit();
            if (limit !== null) {
                if (operation instanceof Return) {
                    (operation as Return).limit = limit;
                } else {
                    operation!.addSibling(limit);
                    operation = limit;
                }
            }
            previous = operation;
        }
        // Handle UNION: wrap left and right pipelines into a Union node
        if (!this.token.isEOF() && this.token.isUnion()) {
            if (!(operation instanceof Return) && !(operation instanceof Call)) {
                throw new Error("Each side of UNION must end with a RETURN or CALL statement");
            }
            const union = this.parseUnion()!;
            union.left = root.firstChild() as Operation;
            // Save and reset parser state for right-side scope
            const state = this._state;
            this._state = new ParserState();
            const right = this._parseTokenized(isSubQuery);
            union.right = right.firstChild() as Operation;
            // Restore parser state
            this._state = state;
            const newRoot = new ASTNode();
            newRoot.addChild(union);
            return newRoot;
        }
        if (
            !(operation instanceof Return) &&
            !(operation instanceof Call) &&
            !(operation instanceof CreateNode) &&
            !(operation instanceof CreateRelationship) &&
            !(operation instanceof DeleteNode) &&
            !(operation instanceof DeleteRelationship)
        ) {
            throw new Error(
                "Last statement must be a RETURN, WHERE, CALL, CREATE, or DELETE statement"
            );
        }
        return root;
    }

    private parseOperation(): Operation | null {
        return (
            this.parseWith() ||
            this.parseUnwind() ||
            this.parseReturn() ||
            this.parseLoad() ||
            this.parseCall() ||
            this.parseCreate() ||
            this.parseDelete() ||
            this.parseMatch()
        );
    }

    private parseWith(): With | null {
        if (!this.token.isWith()) {
            return null;
        }
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        let distinct = false;
        if (this.token.isDistinct()) {
            distinct = true;
            this.setNextToken();
            this.expectAndSkipWhitespaceAndComments();
        }
        const expressions = Array.from(this.parseExpressions(AliasOption.REQUIRED));
        if (expressions.length === 0) {
            throw new Error("Expected expression");
        }
        if (distinct || expressions.some((expression: Expression) => expression.has_reducers())) {
            return new AggregatedWith(expressions);
        }
        return new With(expressions);
    }

    private parseUnwind(): Unwind | null {
        if (!this.token.isUnwind()) {
            return null;
        }
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        const expression: Expression | null = this.parseExpression();
        if (expression === null) {
            throw new Error("Expected expression");
        }
        if (
            !ObjectUtils.isInstanceOfAny(expression.firstChild(), [
                JSONArray,
                Function,
                Reference,
                Lookup,
                RangeLookup,
            ])
        ) {
            throw new Error("Expected array, function, reference, or lookup.");
        }
        this.expectAndSkipWhitespaceAndComments();
        const alias = this.parseAlias();
        if (alias !== null) {
            expression.setAlias(alias.getAlias());
        } else {
            throw new Error("Expected alias");
        }
        const unwind = new Unwind(expression);
        this._state.variables.set(alias.getAlias(), unwind);
        return unwind;
    }

    private parseReturn(): Return | null {
        if (!this.token.isReturn()) {
            return null;
        }
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        let distinct = false;
        if (this.token.isDistinct()) {
            distinct = true;
            this.setNextToken();
            this.expectAndSkipWhitespaceAndComments();
        }
        const expressions = Array.from(this.parseExpressions(AliasOption.OPTIONAL));
        if (expressions.length === 0) {
            throw new Error("Expected expression");
        }
        if (distinct || expressions.some((expression: Expression) => expression.has_reducers())) {
            return new AggregatedReturn(expressions);
        }
        this._state.incrementReturns();
        return new Return(expressions);
    }

    private parseWhere(): Where | null {
        this.skipWhitespaceAndComments();
        if (!this.token.isWhere()) {
            return null;
        }
        this.expectPreviousTokenToBeWhitespaceOrComment();
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        const expression = this.parseExpression();
        if (expression === null) {
            throw new Error("Expected expression");
        }
        if (ObjectUtils.isInstanceOfAny(expression.firstChild(), [JSONArray, AssociativeArray])) {
            throw new Error("Expected an expression which can be evaluated to a boolean");
        }
        return new Where(expression);
    }

    private parseLoad(): Load | null {
        if (!this.token.isLoad()) {
            return null;
        }
        const load = new Load();
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        if (!(this.token.isJSON() || this.token.isCSV() || this.token.isText())) {
            throw new Error("Expected JSON, CSV, or TEXT");
        }
        load.addChild(this.token.node);
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        if (!this.token.isFrom()) {
            throw new Error("Expected FROM");
        }
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        const from = new From();
        load.addChild(from);

        // Check if the source is an async function
        const asyncFunc = this.parseAsyncFunction();
        if (asyncFunc !== null) {
            from.addChild(asyncFunc);
        } else {
            const expression = this.parseExpression();
            if (expression === null) {
                throw new Error("Expected expression or async function");
            }
            from.addChild(expression);
        }

        this.expectAndSkipWhitespaceAndComments();
        if (this.token.isHeaders()) {
            const headers = new Headers();
            this.setNextToken();
            this.expectAndSkipWhitespaceAndComments();
            const header = this.parseExpression();
            if (header === null) {
                throw new Error("Expected expression");
            }
            headers.addChild(header);
            load.addChild(headers);
            this.expectAndSkipWhitespaceAndComments();
        }
        if (this.token.isPost()) {
            const post = new Post();
            this.setNextToken();
            this.expectAndSkipWhitespaceAndComments();
            const payload = this.parseExpression();
            if (payload === null) {
                throw new Error("Expected expression");
            }
            post.addChild(payload);
            load.addChild(post);
            this.expectAndSkipWhitespaceAndComments();
        }
        const alias = this.parseAlias();
        if (alias !== null) {
            load.addChild(alias);
            this._state.variables.set(alias.getAlias(), load);
        } else {
            throw new Error("Expected alias");
        }
        return load;
    }

    private parseCall(): Call | null {
        if (!this.token.isCall()) {
            return null;
        }
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        const asyncFunction = this.parseAsyncFunction();
        if (asyncFunction === null) {
            throw new Error("Expected async function");
        }
        const call = new Call();
        call.function = asyncFunction;
        this.skipWhitespaceAndComments();
        if (this.token.isYield()) {
            this.expectPreviousTokenToBeWhitespaceOrComment();
            this.setNextToken();
            this.expectAndSkipWhitespaceAndComments();
            const expressions = Array.from(this.parseExpressions(AliasOption.OPTIONAL));
            if (expressions.length === 0) {
                throw new Error("Expected at least one expression");
            }
            call.yielded = expressions;
        }
        return call;
    }

    private parseCreate(): CreateNode | CreateRelationship | null {
        if (!this.token.isCreate()) {
            return null;
        }
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        if (!this.token.isVirtual()) {
            throw new Error("Expected VIRTUAL");
        }
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        const node: Node | null = this.parseNode();
        if (node === null) {
            throw new Error("Expected node definition");
        }
        let relationship: Relationship | null = null;
        if (this.token.isSubtract() && this.peek()?.isOpeningBracket()) {
            this.setNextToken();
            this.setNextToken();
            if (!this.token.isColon()) {
                throw new Error("Expected ':' for relationship type");
            }
            this.setNextToken();
            if (!this.token.isIdentifierOrKeyword()) {
                throw new Error("Expected relationship type identifier");
            }
            const type: string = this.token.value || "";
            this.setNextToken();
            if (!this.token.isClosingBracket()) {
                throw new Error("Expected closing bracket for relationship definition");
            }
            this.setNextToken();
            if (!this.token.isSubtract()) {
                throw new Error("Expected '-' for relationship definition");
            }
            this.setNextToken();
            const target: Node | null = this.parseNode();
            if (target === null) {
                throw new Error("Expected target node definition");
            }
            relationship = new Relationship();
            relationship.type = type;
            relationship.source = node;
            relationship.target = target;
        }
        this.expectAndSkipWhitespaceAndComments();
        if (!this.token.isAs()) {
            throw new Error("Expected AS");
        }
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        const query: ASTNode | null = this.parseSubQuery();
        if (query === null) {
            throw new Error("Expected sub-query");
        }
        let create: CreateNode | CreateRelationship;
        if (relationship !== null) {
            create = new CreateRelationship(relationship, query);
        } else {
            create = new CreateNode(node, query);
        }
        return create;
    }

    private parseDelete(): DeleteNode | DeleteRelationship | null {
        if (!this.token.isDelete()) {
            return null;
        }
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        if (!this.token.isVirtual()) {
            throw new Error("Expected VIRTUAL");
        }
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        const node: Node | null = this.parseNode();
        if (node === null) {
            throw new Error("Expected node definition");
        }
        let relationship: Relationship | null = null;
        if (this.token.isSubtract() && this.peek()?.isOpeningBracket()) {
            this.setNextToken();
            this.setNextToken();
            if (!this.token.isColon()) {
                throw new Error("Expected ':' for relationship type");
            }
            this.setNextToken();
            if (!this.token.isIdentifierOrKeyword()) {
                throw new Error("Expected relationship type identifier");
            }
            const type: string = this.token.value || "";
            this.setNextToken();
            if (!this.token.isClosingBracket()) {
                throw new Error("Expected closing bracket for relationship definition");
            }
            this.setNextToken();
            if (!this.token.isSubtract()) {
                throw new Error("Expected '-' for relationship definition");
            }
            this.setNextToken();
            const target: Node | null = this.parseNode();
            if (target === null) {
                throw new Error("Expected target node definition");
            }
            relationship = new Relationship();
            relationship.type = type;
            relationship.source = node;
            relationship.target = target;
        }
        let result: DeleteNode | DeleteRelationship;
        if (relationship !== null) {
            result = new DeleteRelationship(relationship);
        } else {
            result = new DeleteNode(node);
        }
        return result;
    }

    private parseMatch(): Match | null {
        let optional = false;
        if (this.token.isOptional()) {
            optional = true;
            this.setNextToken();
            this.expectAndSkipWhitespaceAndComments();
        }
        if (!this.token.isMatch()) {
            if (optional) {
                throw new Error("Expected MATCH after OPTIONAL");
            }
            return null;
        }
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        const patterns: Pattern[] = Array.from(this.parsePatterns());
        if (patterns.length === 0) {
            throw new Error("Expected graph pattern");
        }
        return new Match(patterns, optional);
    }

    private parseNode(): Node | null {
        if (!this.token.isLeftParenthesis()) {
            return null;
        }
        this.setNextToken();
        this.skipWhitespaceAndComments();
        let identifier: string | null = null;
        if (this.token.isIdentifierOrKeyword()) {
            identifier = this.token.value || "";
            this.setNextToken();
        }
        this.skipWhitespaceAndComments();
        let label: string | null = null;
        if (!this.token.isColon() && this.peek()?.isIdentifierOrKeyword()) {
            throw new Error("Expected ':' for node label");
        }
        if (this.token.isColon() && !this.peek()?.isIdentifierOrKeyword()) {
            throw new Error("Expected node label identifier");
        }
        if (this.token.isColon() && this.peek()?.isIdentifierOrKeyword()) {
            this.setNextToken();
            label = this.token.value || "";
            this.setNextToken();
        }
        this.skipWhitespaceAndComments();
        let node = new Node();
        node.properties = new Map(this.parseProperties());
        node.label = label!;
        if (identifier !== null && this._state.variables.has(identifier)) {
            let reference = this._state.variables.get(identifier);
            if (
                reference === undefined ||
                (!(reference instanceof Node) &&
                    !(reference instanceof Unwind) &&
                    !(reference instanceof Expression))
            ) {
                throw new Error(`Undefined node reference: ${identifier}`);
            }
            node = new NodeReference(node, reference);
        } else if (identifier !== null) {
            node.identifier = identifier;
            this._state.variables.set(identifier, node);
        }
        if (!this.token.isRightParenthesis()) {
            throw new Error("Expected closing parenthesis for node definition");
        }
        this.setNextToken();
        return node;
    }

    private *parseProperties(): Iterable<[string, Expression]> {
        let parts: number = 0;
        while (true) {
            this.skipWhitespaceAndComments();
            if (!this.token.isOpeningBrace() && parts == 0) {
                return;
            } else if (!this.token.isOpeningBrace() && parts > 0) {
                throw new Error("Expected opening brace");
            }
            this.setNextToken();
            this.skipWhitespaceAndComments();
            if (!this.token.isIdentifier()) {
                throw new Error("Expected identifier");
            }
            const key: string = this.token.value!;
            this.setNextToken();
            this.skipWhitespaceAndComments();
            if (!this.token.isColon()) {
                throw new Error("Expected colon");
            }
            this.setNextToken();
            this.skipWhitespaceAndComments();
            const expression: Expression | null = this.parseExpression();
            if (expression === null) {
                throw new Error("Expected expression");
            }
            this.skipWhitespaceAndComments();
            if (!this.token.isClosingBrace()) {
                throw new Error("Expected closing brace");
            }
            this.setNextToken();
            yield [key, expression];
            this.skipWhitespaceAndComments();
            if (!this.token.isComma()) {
                break;
            }
            this.setNextToken();
            parts++;
        }
    }

    private *parsePatterns(): IterableIterator<Pattern> {
        while (true) {
            let identifier: string | null = null;
            if (this.token.isIdentifier()) {
                identifier = this.token.value || "";
                this.setNextToken();
                this.skipWhitespaceAndComments();
                if (!this.token.isEquals()) {
                    throw new Error("Expected '=' for pattern assignment");
                }
                this.setNextToken();
                this.skipWhitespaceAndComments();
            }
            const pattern: Pattern | null = this.parsePattern();
            if (pattern !== null) {
                if (identifier !== null) {
                    pattern.identifier = identifier;
                    this._state.variables.set(identifier, pattern);
                }
                yield pattern;
            } else {
                break;
            }
            this.skipWhitespaceAndComments();
            if (!this.token.isComma()) {
                break;
            }
            this.setNextToken();
            this.skipWhitespaceAndComments();
        }
    }

    private parsePattern(): Pattern | null {
        if (!this.token.isLeftParenthesis()) {
            return null;
        }
        const pattern = new Pattern();
        let node = this.parseNode();
        if (node === null) {
            throw new Error("Expected node definition");
        }
        pattern.addElement(node);
        let relationship: Relationship | null = null;
        while (true) {
            relationship = this.parseRelationship();
            if (relationship === null) {
                break;
            }
            pattern.addElement(relationship);
            node = this.parseNode();
            if (node === null) {
                throw new Error("Expected target node definition");
            }
            pattern.addElement(node);
        }
        return pattern;
    }

    private parsePatternExpression(): PatternExpression | null {
        if (!this.token.isLeftParenthesis()) {
            return null;
        }
        const pattern = new PatternExpression();
        let node = this.parseNode();
        if (node === null) {
            throw new Error("Expected node definition");
        }
        pattern.addElement(node);
        let relationship: Relationship | null = null;
        while (true) {
            relationship = this.parseRelationship();
            if (relationship === null) {
                break;
            }
            if (relationship.hops?.multi()) {
                throw new Error("PatternExpression does not support variable-length relationships");
            }
            pattern.addElement(relationship);
            node = this.parseNode();
            if (node === null) {
                throw new Error("Expected target node definition");
            }
            pattern.addElement(node);
        }
        pattern.verify();
        return pattern;
    }

    private parseRelationship(): Relationship | null {
        let direction: "left" | "right" = "right";
        if (this.token.isLessThan() && this.peek()?.isSubtract()) {
            direction = "left";
            this.setNextToken();
            this.setNextToken();
        } else if (this.token.isSubtract()) {
            this.setNextToken();
        } else {
            return null;
        }
        if (!this.token.isOpeningBracket()) {
            return null;
        }
        this.setNextToken();
        let variable: string | null = null;
        if (this.token.isIdentifierOrKeyword()) {
            variable = this.token.value || "";
            this.setNextToken();
        }
        if (!this.token.isColon()) {
            throw new Error("Expected ':' for relationship type");
        }
        this.setNextToken();
        if (!this.token.isIdentifierOrKeyword()) {
            throw new Error("Expected relationship type identifier");
        }
        const types: string[] = [this.token.value || ""];
        this.setNextToken();
        while (this.token.isPipe()) {
            this.setNextToken();
            if (this.token.isColon()) {
                this.setNextToken();
            }
            if (!this.token.isIdentifierOrKeyword()) {
                throw new Error("Expected relationship type identifier after '|'");
            }
            types.push(this.token.value || "");
            this.setNextToken();
        }
        const hops: Hops | null = this.parseRelationshipHops();
        const properties: Map<string, Expression> = new Map(this.parseProperties());
        if (!this.token.isClosingBracket()) {
            throw new Error("Expected closing bracket for relationship definition");
        }
        this.setNextToken();
        if (!this.token.isSubtract()) {
            throw new Error("Expected '-' for relationship definition");
        }
        this.setNextToken();
        if (this.token.isGreaterThan()) {
            this.setNextToken();
        }
        let relationship = new Relationship();
        relationship.direction = direction;
        relationship.properties = properties;
        if (variable !== null && this._state.variables.has(variable)) {
            let reference = this._state.variables.get(variable);
            // Resolve through Expression -> Reference -> Relationship (e.g., after WITH)
            if (reference instanceof Expression && reference.firstChild() instanceof Reference) {
                const inner = (reference.firstChild() as Reference).referred;
                if (inner instanceof Relationship) {
                    reference = inner;
                }
            }
            if (reference === undefined || !(reference instanceof Relationship)) {
                throw new Error(`Undefined relationship reference: ${variable}`);
            }
            relationship = new RelationshipReference(relationship, reference);
        } else if (variable !== null) {
            relationship.identifier = variable;
            this._state.variables.set(variable, relationship);
        }
        if (hops !== null) {
            relationship.hops = hops;
        }
        relationship.types = types;
        return relationship;
    }

    private parseRelationshipHops(): Hops | null {
        if (!this.token.isMultiply()) {
            return null;
        }
        const hops = new Hops();
        this.setNextToken();
        if (this.token.isNumber()) {
            hops.min = parseInt(this.token.value || "0");
            this.setNextToken();
            if (this.token.isDot()) {
                this.setNextToken();
                if (!this.token.isDot()) {
                    throw new Error("Expected '..' for relationship hops");
                }
                this.setNextToken();
                if (!this.token.isNumber()) {
                    hops.max = Number.MAX_SAFE_INTEGER;
                } else {
                    hops.max = parseInt(this.token.value || "0");
                    this.setNextToken();
                }
            }
        } else {
            hops.min = 0;
            hops.max = Number.MAX_SAFE_INTEGER;
        }
        return hops;
    }

    private parseSubQuery(): ASTNode | null {
        if (!this.token.isOpeningBrace()) {
            return null;
        }
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        const query: ASTNode = this._parseTokenized(true);
        this.skipWhitespaceAndComments();
        if (!this.token.isClosingBrace()) {
            throw new Error("Expected closing brace for sub-query");
        }
        this.setNextToken();
        return query;
    }

    private parseLimit(): Limit | null {
        this.skipWhitespaceAndComments();
        if (!this.token.isLimit()) {
            return null;
        }
        this.expectPreviousTokenToBeWhitespaceOrComment();
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        if (!this.token.isNumber()) {
            throw new Error("Expected number");
        }
        const limit = new Limit(parseInt(this.token.value || "0"));
        this.setNextToken();
        return limit;
    }

    private parseOrderBy(): OrderBy | null {
        this.skipWhitespaceAndComments();
        if (!this.token.isOrder()) {
            return null;
        }
        this.expectPreviousTokenToBeWhitespaceOrComment();
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        if (!this.token.isByKeyword()) {
            throw new Error("Expected BY after ORDER");
        }
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        const fields: SortField[] = [];
        while (true) {
            if (!this.token.isIdentifierOrKeyword()) {
                throw new Error("Expected field name in ORDER BY");
            }
            const field = this.token.value!;
            this.setNextToken();
            this.skipWhitespaceAndComments();
            let direction: "asc" | "desc" = "asc";
            if (this.token.isAsc()) {
                direction = "asc";
                this.setNextToken();
                this.skipWhitespaceAndComments();
            } else if (this.token.isDesc()) {
                direction = "desc";
                this.setNextToken();
                this.skipWhitespaceAndComments();
            }
            fields.push({ field, direction });
            if (this.token.isComma()) {
                this.setNextToken();
                this.skipWhitespaceAndComments();
            } else {
                break;
            }
        }
        return new OrderBy(fields);
    }

    private *parseExpressions(
        alias_option: AliasOption = AliasOption.NOT_ALLOWED
    ): IterableIterator<Expression> {
        while (true) {
            const expression: Expression | null = this.parseExpression();
            if (expression !== null) {
                const alias = this.parseAlias();
                if (expression.firstChild() instanceof Reference && alias === null) {
                    const reference: Reference = expression.firstChild() as Reference;
                    expression.setAlias(reference.identifier);
                    this._state.variables.set(reference.identifier, expression);
                } else if (
                    alias_option === AliasOption.REQUIRED &&
                    alias === null &&
                    !(expression.firstChild() instanceof Reference)
                ) {
                    throw new Error("Alias required");
                } else if (alias_option === AliasOption.NOT_ALLOWED && alias !== null) {
                    throw new Error("Alias not allowed");
                } else if (
                    [AliasOption.OPTIONAL, AliasOption.REQUIRED].includes(alias_option) &&
                    alias !== null
                ) {
                    expression.setAlias(alias.getAlias());
                    this._state.variables.set(alias.getAlias(), expression);
                }
                yield expression;
            } else {
                break;
            }
            this.skipWhitespaceAndComments();
            if (!this.token.isComma()) {
                break;
            }
            this.setNextToken();
        }
    }

    /**
     * Parse a single operand (without operators).
     * @returns True if an operand was parsed, false otherwise.
     */
    private parseOperand(expression: Expression): boolean {
        this.skipWhitespaceAndComments();
        if (this.token.isIdentifierOrKeyword() && !this.peek()?.isLeftParenthesis()) {
            const identifier: string = this.token.value || "";
            const reference = new Reference(identifier, this._state.variables.get(identifier));
            this.setNextToken();
            const lookup = this.parseLookup(reference);
            expression.addNode(lookup);
            return true;
        } else if (this.token.isIdentifierOrKeyword() && this.peek()?.isLeftParenthesis()) {
            const func = this.parsePredicateFunction() || this.parseFunction();
            if (func !== null) {
                const lookup = this.parseLookup(func);
                expression.addNode(lookup);
                return true;
            }
        } else if (this.token.isLeftParenthesis() && this.looksLikeNodePattern()) {
            // Possible graph pattern expression
            const pattern = this.parsePatternExpression();
            if (pattern !== null) {
                expression.addNode(pattern);
                return true;
            }
        } else if (this.token.isOperand()) {
            expression.addNode(this.token.node);
            this.setNextToken();
            return true;
        } else if (this.token.isFString()) {
            const f_string = this.parseFString();
            if (f_string === null) {
                throw new Error("Expected f-string");
            }
            expression.addNode(f_string);
            return true;
        } else if (this.token.isLeftParenthesis()) {
            this.setNextToken();
            const sub = this.parseExpression();
            if (sub === null) {
                throw new Error("Expected expression");
            }
            if (!this.token.isRightParenthesis()) {
                throw new Error("Expected right parenthesis");
            }
            this.setNextToken();
            const lookup = this.parseLookup(sub);
            expression.addNode(lookup);
            return true;
        } else if (this.token.isOpeningBrace() || this.token.isOpeningBracket()) {
            const json = this.parseJSON();
            if (json === null) {
                throw new Error("Expected JSON object");
            }
            const lookup = this.parseLookup(json);
            expression.addNode(lookup);
            return true;
        } else if (this.token.isCase()) {
            const _case = this.parseCase();
            if (_case === null) {
                throw new Error("Expected CASE statement");
            }
            expression.addNode(_case);
            return true;
        } else if (this.token.isNot()) {
            const not = new Not();
            this.setNextToken();
            // NOT should only bind to the next operand, not the entire expression
            const tempExpr = new Expression();
            if (!this.parseOperand(tempExpr)) {
                throw new Error("Expected expression after NOT");
            }
            tempExpr.finish();
            not.addChild(tempExpr);
            expression.addNode(not);
            return true;
        }
        return false;
    }

    /**
     * Peeks ahead from a left parenthesis to determine whether the
     * upcoming tokens form a graph-node pattern (e.g. (n:Label), (n),
     * (:Label), ()) rather than a parenthesised expression (e.g.
     * (variable.property), (a + b)).
     *
     * The heuristic is:
     *   • ( followed by `:` or `)` → node pattern
     *   • ( identifier, then `:` or `{` or `)` → node pattern
     *   • anything else → parenthesised expression
     */
    private looksLikeNodePattern(): boolean {
        const savedIndex = this.tokenIndex;
        this.setNextToken(); // skip '('
        this.skipWhitespaceAndComments();

        if (this.token.isColon() || this.token.isRightParenthesis()) {
            this.tokenIndex = savedIndex;
            return true;
        }

        if (this.token.isIdentifierOrKeyword()) {
            this.setNextToken(); // skip identifier
            this.skipWhitespaceAndComments();
            const result =
                this.token.isColon() ||
                this.token.isOpeningBrace() ||
                this.token.isRightParenthesis();
            this.tokenIndex = savedIndex;
            return result;
        }

        this.tokenIndex = savedIndex;
        return false;
    }

    private parseExpression(): Expression | null {
        const expression = new Expression();
        while (true) {
            if (!this.parseOperand(expression)) {
                if (expression.nodesAdded()) {
                    throw new Error("Expected operand or left parenthesis");
                } else {
                    break;
                }
            }
            this.skipWhitespaceAndComments();
            if (this.token.isOperator()) {
                if (this.token.isIs()) {
                    expression.addNode(this.parseIsOperator());
                } else {
                    expression.addNode(this.token.node);
                }
            } else if (this.token.isIn()) {
                expression.addNode(this.parseInOperator());
            } else if (this.token.isContains()) {
                expression.addNode(this.parseContainsOperator());
            } else if (this.token.isStarts()) {
                expression.addNode(this.parseStartsWithOperator());
            } else if (this.token.isEnds()) {
                expression.addNode(this.parseEndsWithOperator());
            } else if (this.token.isNot()) {
                const notOp = this.parseNotOperator();
                if (notOp === null) {
                    break;
                }
                expression.addNode(notOp);
            } else {
                break;
            }
            this.setNextToken();
        }
        if (expression.nodesAdded()) {
            expression.finish();
            return expression;
        }
        return null;
    }

    private parseIsOperator(): Is | IsNot {
        // Current token is IS. Look ahead for NOT to produce IS NOT.
        const savedIndex = this.tokenIndex;
        this.setNextToken();
        this.skipWhitespaceAndComments();
        if (this.token.isNot()) {
            return new IsNot();
        }
        // Not IS NOT — restore position to IS so the outer loop's setNextToken advances past it.
        this.tokenIndex = savedIndex;
        return new Is();
    }

    private parseInOperator(): In | NotIn {
        // Current token is IN. Advance past it so the outer loop's setNextToken moves correctly.
        return new In();
    }

    private parseContainsOperator(): Contains {
        return new Contains();
    }

    private parseStartsWithOperator(): StartsWith {
        // Current token is STARTS. Look ahead for WITH.
        const savedIndex = this.tokenIndex;
        this.setNextToken();
        this.skipWhitespaceAndComments();
        if (this.token.isWith()) {
            return new StartsWith();
        }
        this.tokenIndex = savedIndex;
        throw new Error("Expected WITH after STARTS");
    }

    private parseEndsWithOperator(): EndsWith {
        // Current token is ENDS. Look ahead for WITH.
        const savedIndex = this.tokenIndex;
        this.setNextToken();
        this.skipWhitespaceAndComments();
        if (this.token.isWith()) {
            return new EndsWith();
        }
        this.tokenIndex = savedIndex;
        throw new Error("Expected WITH after ENDS");
    }

    private parseNotOperator(): NotIn | NotContains | NotStartsWith | NotEndsWith | null {
        // Current token is NOT. Look ahead for IN, CONTAINS, STARTS WITH, or ENDS WITH.
        const savedIndex = this.tokenIndex;
        this.setNextToken();
        this.skipWhitespaceAndComments();
        if (this.token.isIn()) {
            return new NotIn();
        }
        if (this.token.isContains()) {
            return new NotContains();
        }
        if (this.token.isStarts()) {
            this.setNextToken();
            this.skipWhitespaceAndComments();
            if (this.token.isWith()) {
                return new NotStartsWith();
            }
            this.tokenIndex = savedIndex;
            return null;
        }
        if (this.token.isEnds()) {
            this.setNextToken();
            this.skipWhitespaceAndComments();
            if (this.token.isWith()) {
                return new NotEndsWith();
            }
            this.tokenIndex = savedIndex;
            return null;
        }
        // Not a recognized NOT operator — restore position and let the outer loop break.
        this.tokenIndex = savedIndex;
        return null;
    }

    private parseLookup(node: ASTNode): ASTNode {
        let variable: ASTNode = node;
        let lookup: Lookup | RangeLookup | null = null;
        while (true) {
            if (this.token.isDot()) {
                this.setNextToken();
                if (!this.token.isIdentifier() && !this.token.isKeyword()) {
                    throw new Error("Expected identifier");
                }
                lookup = new Lookup();
                lookup.index = new Identifier(this.token.value || "");
                lookup.variable = variable;
                this.setNextToken();
            } else if (this.token.isOpeningBracket()) {
                this.setNextToken();
                this.skipWhitespaceAndComments();
                const index = this.parseExpression();
                let to: Expression | null = null;
                this.skipWhitespaceAndComments();
                if (this.token.isColon()) {
                    this.setNextToken();
                    this.skipWhitespaceAndComments();
                    lookup = new RangeLookup();
                    to = this.parseExpression();
                } else {
                    if (index === null) {
                        throw new Error("Expected expression");
                    }
                    lookup = new Lookup();
                }
                this.skipWhitespaceAndComments();
                if (!this.token.isClosingBracket()) {
                    throw new Error("Expected closing bracket");
                }
                this.setNextToken();
                if (lookup instanceof RangeLookup) {
                    lookup.from = index || new Null();
                    lookup.to = to || new Null();
                } else if (lookup instanceof Lookup && index !== null) {
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
        if (!this.token.isCase()) {
            return null;
        }
        this.setNextToken();
        const _case = new Case();
        let parts: number = 0;
        this.expectAndSkipWhitespaceAndComments();
        while (true) {
            const when = this.parseWhen();
            if (when === null && parts === 0) {
                throw new Error("Expected WHEN");
            } else if (when === null && parts > 0) {
                break;
            } else if (when !== null) {
                _case.addChild(when);
            }
            this.expectAndSkipWhitespaceAndComments();
            const then = this.parseThen();
            if (then === null) {
                throw new Error("Expected THEN");
            } else {
                _case.addChild(then);
            }
            this.expectAndSkipWhitespaceAndComments();
            parts++;
        }
        const _else = this.parseElse();
        if (_else === null) {
            throw new Error("Expected ELSE");
        } else {
            _case.addChild(_else);
        }
        this.expectAndSkipWhitespaceAndComments();
        if (!this.token.isEnd()) {
            throw new Error("Expected END");
        }
        this.setNextToken();
        return _case;
    }

    private parseWhen(): When | null {
        if (!this.token.isWhen()) {
            return null;
        }
        this.setNextToken();
        const when = new When();
        this.expectAndSkipWhitespaceAndComments();
        const expression = this.parseExpression();
        if (expression === null) {
            throw new Error("Expected expression");
        }
        when.addChild(expression);
        return when;
    }

    private parseThen(): Then | null {
        if (!this.token.isThen()) {
            return null;
        }
        this.setNextToken();
        const then = new Then();
        this.expectAndSkipWhitespaceAndComments();
        const expression = this.parseExpression();
        if (expression === null) {
            throw new Error("Expected expression");
        }
        then.addChild(expression);
        return then;
    }

    private parseElse(): Else | null {
        if (!this.token.isElse()) {
            return null;
        }
        this.setNextToken();
        const _else = new Else();
        this.expectAndSkipWhitespaceAndComments();
        const expression = this.parseExpression();
        if (expression === null) {
            throw new Error("Expected expression");
        }
        _else.addChild(expression);
        return _else;
    }

    private parseAlias(): Alias | null {
        this.skipWhitespaceAndComments();
        if (!this.token.isAs()) {
            return null;
        }
        this.expectPreviousTokenToBeWhitespaceOrComment();
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        if ((!this.token.isIdentifier() && !this.token.isKeyword()) || this.token.value === null) {
            throw new Error("Expected identifier");
        }
        const alias = new Alias(this.token.value || "");
        this.setNextToken();
        return alias;
    }

    private parseFunction(): Function | null {
        if (!this.token.isIdentifier()) {
            return null;
        }
        if (this.token.value === null) {
            throw new Error("Expected identifier");
        }
        if (!this.peek()?.isLeftParenthesis()) {
            return null;
        }
        const func = FunctionFactory.create(this.token.value);
        if (
            func instanceof AggregateFunction &&
            this._state.context.containsType(AggregateFunction)
        ) {
            throw new Error("Aggregate functions cannot be nested");
        }
        this._state.context.push(func);
        this.setNextToken();
        this.setNextToken();
        this.skipWhitespaceAndComments();
        if (this.token.isDistinct()) {
            func.distinct = true;
            this.setNextToken();
            this.expectAndSkipWhitespaceAndComments();
        }
        func.parameters = Array.from(this.parseExpressions(AliasOption.NOT_ALLOWED));
        this.skipWhitespaceAndComments();
        if (!this.token.isRightParenthesis()) {
            throw new Error("Expected right parenthesis");
        }
        this.setNextToken();
        this._state.context.pop();
        return func;
    }

    /**
     * Parses an async function call for use in LOAD operations.
     * Only matches if the identifier is registered as an async data provider.
     *
     * @returns An AsyncFunction node if a registered async function is found, otherwise null
     */
    private parseAsyncFunction(): AsyncFunction | null {
        if (!this.token.isIdentifier()) {
            return null;
        }
        if (this.token.value === null) {
            return null;
        }
        // Only parse as async function if it's registered as an async provider
        if (!FunctionFactory.isAsyncProvider(this.token.value)) {
            return null;
        }
        if (!this.peek()?.isLeftParenthesis()) {
            return null;
        }
        const asyncFunc = FunctionFactory.createAsync(this.token.value);
        this.setNextToken(); // skip function name
        this.setNextToken(); // skip left parenthesis
        this.skipWhitespaceAndComments();
        asyncFunc.parameters = Array.from(this.parseExpressions(AliasOption.NOT_ALLOWED));
        this.skipWhitespaceAndComments();
        if (!this.token.isRightParenthesis()) {
            throw new Error("Expected right parenthesis");
        }
        this.setNextToken();
        return asyncFunc;
    }

    private parsePredicateFunction(): PredicateFunction | null {
        if (
            !this.ahead([
                Token.IDENTIFIER(""),
                Token.LEFT_PARENTHESIS,
                Token.IDENTIFIER(""),
                Token.IN,
            ])
        ) {
            return null;
        }
        if (this.token.value === null) {
            throw new Error("Expected identifier");
        }
        const func = FunctionFactory.createPredicate(this.token.value);
        this.setNextToken();
        if (!this.token.isLeftParenthesis()) {
            throw new Error("Expected left parenthesis");
        }
        this.setNextToken();
        this.skipWhitespaceAndComments();
        if (!this.token.isIdentifier()) {
            throw new Error("Expected identifier");
        }
        const reference = new Reference(this.token.value);
        this._state.variables.set(reference.identifier, reference);
        func.addChild(reference);
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        if (!this.token.isIn()) {
            throw new Error("Expected IN");
        }
        this.setNextToken();
        this.expectAndSkipWhitespaceAndComments();
        const expression = this.parseExpression();
        if (expression === null) {
            throw new Error("Expected expression");
        }
        if (
            !ObjectUtils.isInstanceOfAny(expression.firstChild(), [
                JSONArray,
                Reference,
                Lookup,
                Function,
            ])
        ) {
            throw new Error("Expected array or reference");
        }
        func.addChild(expression);
        this.skipWhitespaceAndComments();
        if (!this.token.isPipe()) {
            throw new Error("Expected pipe");
        }
        this.setNextToken();
        const _return = this.parseExpression();
        if (_return === null) {
            throw new Error("Expected expression");
        }
        func.addChild(_return);
        const where = this.parseWhere();
        if (where !== null) {
            func.addChild(where);
        }
        this.skipWhitespaceAndComments();
        if (!this.token.isRightParenthesis()) {
            throw new Error("Expected right parenthesis");
        }
        this.setNextToken();
        this._state.variables.delete(reference.identifier);
        return func;
    }

    private parseFString(): FString | null {
        if (!this.token.isFString()) {
            return null;
        }
        const f_string = new FString();
        while (this.token.isFString()) {
            if (this.token.value !== null) {
                f_string.addChild(new String(this.token.value));
            }
            this.setNextToken();
            if (this.token.isOpeningBrace()) {
                this.setNextToken();
                const expression = this.parseExpression();
                if (expression === null) {
                    throw new Error("Expected expression");
                }
                f_string.addChild(expression);
                if (!this.token.isClosingBrace()) {
                    throw new Error("Expected closing brace");
                }
                this.setNextToken();
            } else {
                break;
            }
        }
        return f_string;
    }

    private parseJSON(): AssociativeArray | JSONArray {
        if (this.token.isOpeningBrace()) {
            const array = this.parseAssociativeArray();
            if (array === null) {
                throw new Error("Expected associative array");
            }
            return array;
        } else if (this.token.isOpeningBracket()) {
            const array = this.parseJSONArray();
            if (array === null) {
                throw new Error("Expected JSON array");
            }
            return array;
        }
        throw new Error("Expected opening brace or bracket");
    }

    private parseAssociativeArray(): AssociativeArray | null {
        if (!this.token.isOpeningBrace()) {
            return null;
        }
        const array = new AssociativeArray();
        this.setNextToken();
        while (true) {
            this.skipWhitespaceAndComments();
            if (this.token.isClosingBrace()) {
                break;
            }
            if (!this.token.isIdentifier() && !this.token.isKeyword()) {
                throw new Error("Expected identifier");
            }
            const key = this.token.value;
            if (key === null) {
                throw new Error("Expected string");
            }
            this.setNextToken();
            this.skipWhitespaceAndComments();
            if (!this.token.isColon()) {
                throw new Error("Expected colon");
            }
            this.setNextToken();
            this.skipWhitespaceAndComments();
            const value = this.parseExpression();
            if (value === null) {
                throw new Error("Expected expression");
            }
            array.addKeyValue(new KeyValuePair(key, value));
            this.skipWhitespaceAndComments();
            if (this.token.isComma()) {
                this.setNextToken();
            }
        }
        this.setNextToken();
        return array;
    }

    private parseJSONArray(): JSONArray | null {
        if (!this.token.isOpeningBracket()) {
            return null;
        }
        const array = new JSONArray();
        this.setNextToken();
        while (true) {
            this.skipWhitespaceAndComments();
            if (this.token.isClosingBracket()) {
                break;
            }
            const value = this.parseExpression();
            if (value === null) {
                throw new Error("Expected expression");
            }
            array.addValue(value);
            this.skipWhitespaceAndComments();
            if (this.token.isComma()) {
                this.setNextToken();
            }
        }
        this.setNextToken();
        return array;
    }

    private parseUnion(): Union | UnionAll | null {
        if (!this.token.isUnion()) {
            return null;
        }
        this.setNextToken();
        this.skipWhitespaceAndComments();
        let union: Union | UnionAll;
        if (this.token.isAll()) {
            union = new UnionAll();
            this.setNextToken();
        } else {
            union = new Union();
        }
        return union;
    }

    private expectAndSkipWhitespaceAndComments(): void {
        const skipped = this.skipWhitespaceAndComments();
        if (!skipped) {
            throw new Error("Expected whitespace or comment");
        }
    }

    private skipWhitespaceAndComments(): boolean {
        let skipped: boolean = this.previousToken.isWhitespaceOrComment();
        while (this.token.isWhitespace() || this.token.isComment()) {
            this.setNextToken();
            skipped = true;
        }
        return skipped;
    }

    private expectPreviousTokenToBeWhitespaceOrComment(): void {
        if (!this.previousToken.isWhitespaceOrComment()) {
            throw new Error("Expected whitespace or comment");
        }
    }
}

export default Parser;
