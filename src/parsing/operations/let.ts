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
 */
class Let extends Operation {
    private _name: string;
    private _expression: Expression | null;
    private _subQuery: ASTNode | null;
    private _value: any = undefined;

    constructor(name: string, expression: Expression | null, subQuery: ASTNode | null) {
        super();
        this._name = name;
        this._expression = expression;
        this._subQuery = subQuery;
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

    public async run(): Promise<void> {
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
        Bindings.getInstance().set(this._name, value);
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
