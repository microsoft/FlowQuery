import Node from "../../graph/node";
import Pattern from "../../graph/pattern";
import Patterns from "../../graph/patterns";
import ASTNode from "../ast_node";
import Lookup from "../data_structures/lookup";
import Expression from "../expressions/expression";
import Identifier from "../expressions/identifier";
import { And, Equals } from "../expressions/operator";
import Reference from "../expressions/reference";
import Operation from "./operation";
import Where from "./where";

class Match extends Operation {
    private _patterns: Patterns | null = null;
    private _optional: boolean = false;

    constructor(patterns: Pattern[] = [], optional: boolean = false) {
        super();
        this._patterns = new Patterns(patterns);
        this._optional = optional;
    }
    public get patterns(): Pattern[] {
        return this._patterns ? this._patterns.patterns : [];
    }
    public get optional(): boolean {
        return this._optional;
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
        await this._patterns!.initialize();
        let matched = false;
        this._patterns!.toDoNext = async () => {
            matched = true;
            // Continue to the next operation after all patterns are matched
            await this.next?.run();
        };
        // Kick off the graph pattern traversal
        await this._patterns!.traverse();
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
        // Add extracted predicates as properties on the matching nodes
        for (const pred of predicates) {
            const node = nodeMap.get(pred.nodeIdentifier);
            if (node !== undefined && !node.properties.has(pred.property)) {
                node.setProperty(pred.property, pred.valueExpression);
            }
        }
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

    /**
     * Checks whether a node is a simple literal value (number, string, boolean, null).
     */
    private isLiteralValue(node: ASTNode): boolean {
        return node.isOperand() && !(node instanceof Reference) && !(node instanceof Lookup);
    }
}

export default Match;
