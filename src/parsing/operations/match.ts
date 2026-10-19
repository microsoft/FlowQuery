import Node from "../../graph/node";
import Pattern from "../../graph/pattern";
import Patterns from "../../graph/patterns";
import { RelationshipScope } from "../../graph/relationship";
import { IDENTITY_PROPERTY, PushedPredicate, isStaticExpression } from "../../graph/source_access";
import type SourceContext from "../../graph/source_context";
import ASTNode from "../ast_node";
import Lookup from "../data_structures/lookup";
import Expression from "../expressions/expression";
import Identifier from "../expressions/identifier";
import {
    And,
    Equals,
    GreaterThan,
    GreaterThanOrEqual,
    In,
    LessThan,
    LessThanOrEqual,
} from "../expressions/operator";
import Reference from "../expressions/reference";
import Function from "../functions/function";
import Operation from "./operation";
import Where from "./where";

class Match extends Operation {
    private _patterns: Patterns | null = null;
    private _optional: boolean = false;
    private _sourceContext: SourceContext | null = null;

    constructor(patterns: Pattern[] = [], optional: boolean = false) {
        super();
        this._patterns = new Patterns(patterns);
        this._optional = optional;
        // openCypher: a relationship is bound at most once per MATCH clause,
        // across all of its comma-separated patterns.
        const scope = new RelationshipScope();
        for (const pattern of patterns) {
            pattern.relationshipScope = scope;
        }
    }
    public get patterns(): Pattern[] {
        return this._patterns ? this._patterns.patterns : [];
    }
    public get optional(): boolean {
        return this._optional;
    }
    /** @internal Query-scoped source context assigned by the runner. */
    public set sourceContext(ctx: SourceContext | null) {
        this._sourceContext = ctx;
    }
    public get sourceContext(): SourceContext | null {
        return this._sourceContext;
    }
    public get saturated(): boolean {
        return this.next?.saturated ?? false;
    }
    protected toString(): string {
        return this._optional ? "OptionalMatch" : "Match";
    }
    /**
     * Executes the match operation by chaining the patterns together.
     * After each pattern match, it continues to the next operation in the chain.
     * If optional and no match is found, continues with null values.
     * @return Promise<void>
     */
    public async run(): Promise<void> {
        this.extractWherePredicates();
        this.extractPushdownPredicates();
        await this._patterns!.initialize(this._sourceContext);
        let matched = false;
        for await (const _ of this._patterns!.traverse()) {
            this._sourceContext?.throwIfCancelled();
            matched = true;
            // Continue to the next operation after all patterns are matched
            await this.next?.run();
            // Nothing downstream can change any more (e.g. LIMIT reached):
            // stop reading so source-backed reads are closed early.
            if (this.next?.saturated) {
                break;
            }
        }
        // For OPTIONAL MATCH: if nothing matched, continue with null values
        if (!matched && this._optional) {
            for (const pattern of this._patterns!.patterns) {
                for (const element of pattern.chain) {
                    if (element instanceof Node) {
                        element.setValue(null!);
                    }
                }
            }
            await this.next?.run();
        }
    }

    /**
     * Extracts simple equality predicates from the immediately following WHERE clause
     * and merges them into the matching nodes' properties so they can be passed as
     * $-parameters to virtual node/relationship definitions.
     *
     * Handles predicates of the form:
     * - `n.prop = value` or `value = n.prop`
     * - Multiple predicates joined by AND
     *
     * Only literal values (numbers, strings, booleans) are extracted.
     * Complex expressions (OR, >, <, function calls, etc.) remain as post-filters.
     */
    private extractWherePredicates(): void {
        if (!(this.next instanceof Where)) {
            return;
        }
        const where = this.next as Where;
        const predicates = this.collectEqualityPredicates(where.expression.firstChild());
        if (predicates.length === 0) {
            return;
        }
        // Build a map of node identifiers to their Node objects in the pattern
        const nodeMap = new Map<string, Node>();
        for (const pattern of this._patterns!.patterns) {
            for (const element of pattern.chain) {
                if (element instanceof Node && element.identifier !== null) {
                    nodeMap.set(element.identifier, element);
                }
            }
        }
        // Add extracted predicates as properties (or, for `id(n) = v`, the
        // identity) of the matching nodes
        for (const pred of predicates) {
            const node = nodeMap.get(pred.nodeIdentifier);
            if (node === undefined) continue;
            if (pred.property === IDENTITY_PROPERTY) {
                if (node.identity === null) node.identity = pred.valueExpression;
            } else if (!node.properties.has(pred.property)) {
                node.setProperty(pred.property, pred.valueExpression);
            }
        }
    }

    /**
     * Attaches range and IN comparisons from the immediately following WHERE
     * clause to the pattern nodes so that source providers may evaluate
     * them.  The WHERE clause stays in place and re-checks every row, so
     * sources only need to return a superset.  Not applied to OPTIONAL
     * MATCH, whose null-row semantics depend on the full candidate set.
     */
    private extractPushdownPredicates(): void {
        const nodeMap = new Map<string, Node>();
        for (const pattern of this._patterns!.patterns) {
            for (const element of pattern.chain) {
                if (element instanceof Node && element.constructor === Node) {
                    element.pushedPredicates = [];
                    if (element.identifier !== null) {
                        nodeMap.set(element.identifier, element);
                    }
                }
            }
        }
        if (this._optional || !(this.next instanceof Where)) {
            return;
        }
        const where = this.next as Where;
        for (const { identifier, predicate } of this.collectPushdownPredicates(
            where.expression.firstChild()
        )) {
            const node = nodeMap.get(identifier);
            if (node !== undefined) {
                node.pushedPredicates = [...node.pushedPredicates, predicate];
            }
        }
    }

    private collectPushdownPredicates(
        node: ASTNode
    ): { identifier: string; predicate: PushedPredicate }[] {
        if (node instanceof And) {
            return [
                ...this.collectPushdownPredicates(node.lhs),
                ...this.collectPushdownPredicates(node.rhs),
            ];
        }
        const ops: [any, PushedPredicate["op"], PushedPredicate["op"] | null][] = [
            [GreaterThan, "gt", "lt"],
            [GreaterThanOrEqual, "gte", "lte"],
            [LessThan, "lt", "gt"],
            [LessThanOrEqual, "lte", "gte"],
            [In, "in", null],
        ];
        for (const [type, op, flipped] of ops) {
            if (!(node instanceof type)) continue;
            const operator = node as any;
            const direct = this.pushdownTerm(operator.lhs, operator.rhs, op);
            if (direct !== null) return [direct];
            if (flipped !== null) {
                const reversed = this.pushdownTerm(operator.rhs, operator.lhs, flipped);
                if (reversed !== null) return [reversed];
            }
            return [];
        }
        return [];
    }

    private pushdownTerm(
        lookupSide: ASTNode,
        valueSide: ASTNode,
        op: PushedPredicate["op"]
    ): { identifier: string; predicate: PushedPredicate } | null {
        if (
            !(lookupSide instanceof Lookup) ||
            !(lookupSide.variable instanceof Reference) ||
            !(lookupSide.index instanceof Identifier) ||
            !isStaticExpression(valueSide)
        ) {
            return null;
        }
        return {
            identifier: (lookupSide.variable as Reference).identifier,
            predicate: {
                op,
                property: (lookupSide.index as Identifier).value(),
                expression: valueSide,
            },
        };
    }

    /**
     * Recursively collects equality predicates from the expression tree.
     * Only extracts simple `node.property = literal` patterns.
     */
    private collectEqualityPredicates(
        node: ASTNode
    ): { nodeIdentifier: string; property: string; valueExpression: Expression }[] {
        if (node instanceof And) {
            return [
                ...this.collectEqualityPredicates(node.lhs),
                ...this.collectEqualityPredicates(node.rhs),
            ];
        }
        if (node instanceof Equals) {
            const result = this.tryExtractEqualityPredicate(node.lhs, node.rhs);
            if (result !== null) {
                return [result];
            }
            // Try reversed: value = n.prop
            const reversed = this.tryExtractEqualityPredicate(node.rhs, node.lhs);
            if (reversed !== null) {
                return [reversed];
            }
        }
        return [];
    }

    /**
     * Tries to extract a {nodeIdentifier, property, value} tuple from a pair of
     * AST nodes where `lookupSide` is expected to be a Lookup(Reference, Identifier)
     * and `valueSide` is expected to be a literal value.
     */
    private tryExtractEqualityPredicate(
        lookupSide: ASTNode,
        valueSide: ASTNode
    ): { nodeIdentifier: string; property: string; valueExpression: Expression } | null {
        const identified = Match.identityOf(lookupSide);
        if (identified !== null && this.isLiteralValue(valueSide)) {
            const expr = new Expression();
            expr.addNode(valueSide);
            expr.finish();
            return {
                nodeIdentifier: identified,
                property: IDENTITY_PROPERTY,
                valueExpression: expr,
            };
        }
        if (!(lookupSide instanceof Lookup)) {
            return null;
        }
        const lookup = lookupSide as Lookup;
        if (!(lookup.variable instanceof Reference) || !(lookup.index instanceof Identifier)) {
            return null;
        }
        // Only extract if the value side is a simple literal (not a reference/lookup/function)
        if (!this.isLiteralValue(valueSide)) {
            return null;
        }
        const nodeIdentifier = (lookup.variable as Reference).identifier;
        const property = (lookup.index as Identifier).value();
        // Wrap the value side in an Expression for compatibility with Node.setProperty
        const expr = new Expression();
        expr.addNode(valueSide);
        expr.finish();
        return { nodeIdentifier, property, valueExpression: expr };
    }

    /** The variable of `id(variable)`, or `null` for any other expression. */
    private static identityOf(node: ASTNode): string | null {
        if (!(node instanceof Function) || node.name !== "id") return null;
        const args = node.getChildren();
        if (args.length !== 1) return null;
        let arg: ASTNode = args[0];
        if (arg instanceof Expression && arg.childCount() === 1) arg = arg.firstChild();
        return arg instanceof Reference ? arg.identifier : null;
    }

    /**
     * Checks whether a node is a simple literal value (number, string, boolean, null).
     */
    private isLiteralValue(node: ASTNode): boolean {
        return node.isOperand() && !(node instanceof Reference) && !(node instanceof Lookup);
    }
}

export default Match;
