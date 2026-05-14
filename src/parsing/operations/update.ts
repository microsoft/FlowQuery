import Bindings from "../../graph/bindings";
import ASTNode from "../ast_node";
import Expression from "../expressions/expression";
import Operation from "./operation";

/**
 * `UPDATE name = <rhs>`  — replace the value bound to `name`.
 *
 * `UPDATE name MERGE ON <key> = <rhs>` — key-based upsert: rows in the
 * existing binding whose `<key>` matches a row in the new value are
 * replaced entirely; unmatched new rows are appended.  Both sides must
 * be lists of objects carrying `<key>`.
 */
class Update extends Operation {
    private _name: string;
    private _mergeKey: string | null;
    private _expression: Expression | null;
    private _subQuery: ASTNode | null;
    private _value: any = undefined;

    constructor(
        name: string,
        mergeKey: string | null,
        expression: Expression | null,
        subQuery: ASTNode | null
    ) {
        super();
        this._name = name;
        this._mergeKey = mergeKey;
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

    public get mergeKey(): string | null {
        return this._mergeKey;
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
        const bindings = Bindings.getInstance();
        if (this._mergeKey !== null) {
            bindings.merge(this._name, this._mergeKey, value);
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
