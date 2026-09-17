import PatternExpression from "../../graph/pattern_expression";
import ASTNode from "../ast_node";
import Lookup from "../data_structures/lookup";
import AggregateFunction from "../functions/aggregate_function";
import Identifier from "./identifier";
import Reference from "./reference";
import SubqueryExpression from "./subquery_expression";

/**
 * Represents an expression in the FlowQuery AST.
 *
 * Expressions are built using the Shunting Yard algorithm to handle operator
 * precedence and associativity. They can contain operands (numbers, strings, identifiers)
 * and operators (arithmetic, logical, comparison).
 *
 * @example
 * ```typescript
 * const expr = new Expression();
 * expr.addNode(numberNode);
 * expr.addNode(plusOperator);
 * expr.addNode(anotherNumberNode);
 * expr.finish();
 * ```
 */
class Expression extends ASTNode {
    private operators: ASTNode[] = <ASTNode[]>[];
    private output: ASTNode[] = <ASTNode[]>[];
    private _alias: string | null = null;
    private _overridden: any = undefined;
    private _reducers: AggregateFunction[] | null = null;
    private _patterns: PatternExpression[] | null = null;

    /**
     * Adds a node (operand or operator) to the expression.
     *
     * Uses the Shunting Yard algorithm to maintain correct operator precedence.
     *
     * @param node - The AST node to add (operand or operator)
     */
    public addNode(node: ASTNode): void {
        /* Implements the Shunting Yard algorithm */
        if (node.isOperand()) {
            this.output.push(node);
        } else if (node.isOperator()) {
            const operator1: ASTNode = node;
            while (this.operators.length > 0) {
                let operator2 = this.operators[this.operators.length - 1];
                if (
                    operator2.precedence > operator1.precedence ||
                    (operator2.precedence === operator1.precedence && operator1.leftAssociative)
                ) {
                    this.output.push(operator2);
                    this.operators.pop();
                } else {
                    break;
                }
            }
            this.operators.push(operator1);
        }
    }

    /**
     * Finalizes the expression by converting it to a tree structure.
     *
     * Should be called after all nodes have been added.
     */
    public finish(): void {
        let last: ASTNode | undefined;
        while ((last = this.operators.pop())) {
            this.output.push(last);
        }
        this.addChild(this.toTree());
    }

    private toTree(): ASTNode {
        const node = this.output.pop() || new ASTNode();
        if (node.isOperator()) {
            const rhs = this.toTree();
            const lhs = this.toTree();
            node.addChild(lhs);
            node.addChild(rhs);
        }
        return node;
    }

    public nodesAdded(): boolean {
        return this.operators.length > 0 || this.output.length > 0;
    }

    public value(): any {
        if (this._overridden !== undefined) {
            return this._overridden;
        }
        if (this.childCount() !== 1) {
            throw new Error("Expected one child");
        }
        return this.children[0].value();
    }

    public setAlias(alias: string): void {
        this._alias = alias;
    }

    public set alias(alias: string) {
        this._alias = alias;
    }

    public get alias(): string | null {
        if (this._alias !== null) {
            return this._alias;
        }
        const first = this.firstChild();
        if (first instanceof Reference) {
            return (<Reference>first).identifier;
        }
        return Expression.propertyPath(first);
    }

    /**
     * Names an un-aliased dot lookup after its source text (`u.displayName`)
     * so projected columns keep a readable key.  Returns null for anything
     * else, leaving the caller to fall back to `expr<n>`.
     */
    private static propertyPath(node: ASTNode | null): string | null {
        if (!(node instanceof Lookup)) {
            return null;
        }
        const index = node.index;
        // Bracket lookups carry an Expression index; only dot access has a bare
        // Identifier, and Reference extends Identifier so it must be excluded.
        if (!(index instanceof Identifier) || index instanceof Reference) {
            return null;
        }
        const variable = node.variable;
        const prefix =
            variable instanceof Reference
                ? (<Reference>variable).identifier
                : Expression.propertyPath(variable);
        return prefix === null ? null : `${prefix}.${index.value()}`;
    }

    public toString(): string {
        if (this._alias !== null) {
            return `Expression (${this._alias})`;
        } else {
            return "Expression";
        }
    }
    public reducers(): AggregateFunction[] {
        if (this._reducers === null) {
            this._reducers = [...this._extract(this, AggregateFunction)];
        }
        return this._reducers;
    }
    public patterns(): PatternExpression[] {
        if (this._patterns === null) {
            this._patterns = [...this._extract(this, PatternExpression)];
        }
        return this._patterns;
    }
    private _subqueries: SubqueryExpression[] | null = null;
    public subqueries(): SubqueryExpression[] {
        if (this._subqueries === null) {
            this._subqueries = [...this._extract(this, SubqueryExpression)];
        }
        return this._subqueries;
    }
    private *_extract(node: ASTNode = this, of_type: any): Generator<any> {
        if (node instanceof of_type) {
            yield node;
        }
        for (const child of node.getChildren()) {
            yield* this._extract(child, of_type);
        }
    }
    public mappable(): boolean {
        return this.reducers().length === 0;
    }
    public has_reducers(): boolean {
        return this.reducers().length > 0;
    }
    public set overridden(value: any) {
        this._overridden = value;
    }
}

export default Expression;
