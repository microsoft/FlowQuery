import ASTNode from "./ast_node";
import Context from "./context";
import Expression from "./expressions/expression";

/**
 * Mutable parser state shared across operation parsers.
 *
 * Two scope concepts are tracked:
 *
 * - `variables` is the *current* scope.  It is updated in place as the
 *   parser walks forward (MATCH binds nodes/relationships, UNWIND binds
 *   its alias, RETURN/WITH register projection aliases, etc.).
 * - `inputScope` is an optional snapshot of `variables` taken at the
 *   start of a RETURN/WITH clause, *before* its projection aliases are
 *   registered.  It is consulted by `resolve` so that trailing modifiers
 *   attached to that clause (ORDER BY / WHERE / LIMIT) can still see the
 *   pre-projection bindings — making references such as
 *   `ORDER BY peer.name` after `RETURN peer.name AS peer` resolve to the
 *   matched node rather than the projected scalar.
 */
class ParserState {
    private _variables: Map<string, ASTNode> = new Map();
    private _variableStack: Map<string, ASTNode>[] = [];
    private _inputScope: Map<string, ASTNode> | null = null;
    private _context: Context = new Context();
    private _returns: number = 0;
    private _inVirtualDefinition: boolean = false;

    public get variables(): Map<string, ASTNode> {
        return this._variables;
    }

    /**
     * Save the current variable scope onto a stack and start a child
     * scope that inherits the outer bindings.  Mutations made in the
     * child scope (typically registering a single block-local name) do
     * not leak back to the outer scope when `popVariableScope` is
     * called.  Used for syntactic blocks that introduce their own
     * binding — list comprehensions, predicate-function bodies, etc.
     */
    public pushVariableScope(): void {
        this._variableStack.push(this._variables);
        this._variables = new Map(this._variables);
    }

    /**
     * Restore the variable scope previously pushed by
     * `pushVariableScope`.
     */
    public popVariableScope(): void {
        const previous = this._variableStack.pop();
        if (previous === undefined) {
            throw new Error("popVariableScope without matching pushVariableScope");
        }
        this._variables = previous;
    }

    /**
     * Seed the current variable scope with the bindings of another
     * parser state.  Used when entering a subquery expression: the
     * subquery gets its own fresh state (with independent returns
     * counter, aggregate context, input-scope snapshot, etc.) but
     * still needs to see the outer query's variable bindings.
     */
    public inheritVariablesFrom(other: ParserState): void {
        for (const [k, v] of other._variables) {
            this._variables.set(k, v);
        }
    }

    public get inputScope(): Map<string, ASTNode> | null {
        return this._inputScope;
    }

    /**
     * Capture the current variable scope as the clause input scope.
     *
     * Called by RETURN/WITH parsers immediately before their projection
     * expressions are registered, so that `inputScope` reflects what
     * was visible *before* the projections introduced any aliases.
     */
    public takeInputScopeSnapshot(): void {
        this._inputScope = new Map(this._variables);
    }

    /**
     * Drop the clause input snapshot.  Called once a clause's trailing
     * modifiers (ORDER BY / WHERE / LIMIT) have been parsed.
     */
    public clearInputScope(): void {
        this._inputScope = null;
    }

    /**
     * Resolve an identifier reference during expression parsing.
     *
     * The current (output) scope wins by default — this is what makes
     * post-aggregation references such as `WHERE i = 1` after
     * `RETURN i, sum(j) AS sum` see the grouped value through the
     * projection's override mechanism.
     *
     * When the reference is followed by a property or index access
     * (`propertyAccess` is true) and an input-scope snapshot is active,
     * the input binding is preferred whenever the current binding is a
     * projection alias (Expression) while the input bound the same name
     * to a graph entity (Node / Relationship / Pattern / Unwind / Load —
     * anything that is not itself an Expression).  This makes
     * `ORDER BY peer.name` after `RETURN peer.name AS peer` reach the
     * matched node rather than crashing on subscripting the projected
     * string.
     */
    public resolve(identifier: string, propertyAccess: boolean = false): ASTNode | undefined {
        const current = this._variables.get(identifier);
        if (propertyAccess && this._inputScope !== null && current instanceof Expression) {
            const inherited = this._inputScope.get(identifier);
            if (inherited !== undefined && !(inherited instanceof Expression)) {
                return inherited;
            }
        }
        return current;
    }

    public get context(): Context {
        return this._context;
    }

    public get returns(): number {
        return this._returns;
    }
    public incrementReturns(): void {
        this._returns++;
    }
    public get inVirtualDefinition(): boolean {
        return this._inVirtualDefinition;
    }
    public set inVirtualDefinition(value: boolean) {
        this._inVirtualDefinition = value;
    }
}

export default ParserState;
