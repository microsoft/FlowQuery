import Bindings from "../../graph/bindings";
import ASTNode from "../ast_node";
import Expression from "../expressions/expression";
import Operation from "./operation";

/**
 * `LET name = <expression-or-query>` — binds a value to a name in the
 * global {@link Bindings} store.
 *
 * The right-hand side is either a parsed expression (literal, function
 * call, identifier, …) or a sub-query AST that is executed at run-time;
 * a query RHS materialises to the list of result rows.
 *
 * `LET STATIC name = { ... } [REFRESH EVERY n unit]` registers a
 * deferred provider on the {@link Bindings} singleton instead of
 * evaluating eagerly: the sub-query is stored, and the binding's value
 * is (re)computed lazily by `Bindings.materialize(name)` on first read
 * or after the TTL elapses.  STATIC bindings cannot be silently
 * replaced; drop them first with `DROP BINDING name`.
 */
class Let extends Operation {
    private _name: string;
    private _expression: Expression | null;
    private _subQuery: ASTNode | null;
    private _value: any = undefined;
    private _isStatic: boolean;
    private _refreshEveryMs: number | null;

    constructor(
        name: string,
        expression: Expression | null,
        subQuery: ASTNode | null,
        isStatic: boolean = false,
        refreshEveryMs: number | null = null
    ) {
        super();
        this._name = name;
        this._expression = expression;
        this._subQuery = subQuery;
        this._isStatic = isStatic;
        this._refreshEveryMs = refreshEveryMs;
        if (expression !== null) {
            this.addChild(expression);
        }
        if (subQuery !== null) {
            this.addChild(subQuery);
        }
    }

    public get name(): string {
        return this._name;
    }

    public get expression(): Expression | null {
        return this._expression;
    }

    public get subQuery(): ASTNode | null {
        return this._subQuery;
    }

    public get isStatic(): boolean {
        return this._isStatic;
    }

    public get refreshEveryMs(): number | null {
        return this._refreshEveryMs;
    }

    public async run(): Promise<void> {
        const bindings = Bindings.getInstance();
        if (this._isStatic) {
            // STATIC LET: register a deferred provider.  The sub-query
            // is not run here; it is run lazily by
            // Bindings.materialize() on first read or TTL expiry.
            if (this._subQuery === null) {
                throw new Error("LET STATIC requires a sub-query right-hand side");
            }
            bindings.registerStatic(this._name, this._subQuery, this._refreshEveryMs);
            await this.next?.run();
            return;
        }
        // Non-STATIC LET cannot silently overwrite a STATIC binding.
        if (bindings.isStatic(this._name)) {
            throw new Error(`Binding '${this._name}' is STATIC; DROP BINDING ${this._name} first`);
        }
        let value: any;
        if (this._subQuery !== null) {
            const first = this._subQuery.firstChild() as Operation;
            const last = this._subQuery.lastChild() as Operation;
            await first.initialize();
            await first.run();
            await first.finish();
            value = last.results;
        } else if (this._expression !== null) {
            value = this._expression.value();
        } else {
            value = null;
        }
        this._value = value;
        bindings.set(this._name, value);
        await this.next?.run();
    }

    public get results(): Record<string, any>[] {
        if (Array.isArray(this._value)) {
            return this._value as Record<string, any>[];
        }
        return [];
    }
}

export default Let;
