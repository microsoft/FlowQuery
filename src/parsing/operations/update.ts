import Bindings from "../../graph/bindings";
import ASTNode from "../ast_node";
import Expression from "../expressions/expression";
import Operation from "./operation";

/**
 * `UPDATE name = <rhs>`  — replace the value bound to `name`.
 *
 * `UPDATE name MERGE ON <key(s)> [SET .field, …] [WHEN [NOT] MATCHED] = <rhs>`
 * — key-based upsert.  Rows in the existing binding whose key(s)
 * match a row in the new value are replaced (or partially updated if
 * `SET .field, …` is given); unmatched new rows are appended.  The
 * optional `WHEN MATCHED` / `WHEN NOT MATCHED` clauses suppress the
 * other branch (mirroring SQL `MERGE`).
 *
 * `UPDATE name` always requires `name` to already be bound — use `LET`
 * to introduce a new binding.
 */
class Update extends Operation {
    private _name: string;
    private _mergeKeys: string[] | null;
    private _setFields: string[] | null;
    private _whenMatched: boolean;
    private _whenNotMatched: boolean;
    private _expression: Expression | null;
    private _subQuery: ASTNode | null;
    private _value: any = undefined;

    constructor(
        name: string,
        mergeKeys: string[] | null,
        setFields: string[] | null,
        whenMatched: boolean,
        whenNotMatched: boolean,
        expression: Expression | null,
        subQuery: ASTNode | null
    ) {
        super();
        this._name = name;
        this._mergeKeys = mergeKeys;
        this._setFields = setFields;
        this._whenMatched = whenMatched;
        this._whenNotMatched = whenNotMatched;
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

    public get mergeKeys(): string[] | null {
        return this._mergeKeys;
    }

    public get setFields(): string[] | null {
        return this._setFields;
    }

    public get whenMatched(): boolean {
        return this._whenMatched;
    }

    public get whenNotMatched(): boolean {
        return this._whenNotMatched;
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
        if (this._mergeKeys !== null) {
            bindings.merge(this._name, value, {
                keys: this._mergeKeys,
                setFields: this._setFields,
                whenMatched: this._whenMatched,
                whenNotMatched: this._whenNotMatched,
            });
            this._value = bindings.get(this._name);
        } else {
            bindings.set(this._name, value);
            this._value = value;
        }
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
