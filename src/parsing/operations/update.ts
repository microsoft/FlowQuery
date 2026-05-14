import Bindings from "../../graph/bindings";
import ASTNode from "../ast_node";
import Expression from "../expressions/expression";
import Operation from "./operation";

/**
 * `UPDATE name = <rhs>` — replace the value bound to `name`.
 *
 * `UPDATE name` always requires `name` to already be bound — use
 * `LET` to introduce a new binding.  Per-row updates (key-based
 * upsert, partial-field merge, conditional matched/not-matched
 * branches) live on the `MERGE INTO … USING …` operation.
 *
 * `UPDATE name AS alias DELETE WHERE <pred>` — see {@link UpdateDelete}.
 */
class Update extends Operation {
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
        const bindings = Bindings.getInstance();
        if (!bindings.has(this._name)) {
            throw new Error(`Binding '${this._name}' is not defined; use LET to create it`);
        }
        if (bindings.isStatic(this._name)) {
            throw new Error(
                `Binding '${this._name}' is STATIC; use REFRESH BINDING ${this._name} to re-evaluate or DROP BINDING ${this._name} first`
            );
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
        bindings.set(this._name, value);
        this._value = value;
        await this.next?.run();
    }

    public get results(): Record<string, any>[] {
        if (Array.isArray(this._value)) {
            return this._value as Record<string, any>[];
        }
        return [];
    }
}

export default Update;
