import Bindings from "../../graph/bindings";
import Expression from "../expressions/expression";
import Operation from "./operation";

/**
 * `UPDATE name AS alias DELETE WHERE <predicate>` — remove rows from a
 * list-binding that satisfy the predicate.
 *
 * Iterates the current rows of `name`, binding each to `alias`, and
 * evaluates the predicate.  Rows whose predicate evaluates truthy are
 * dropped; remaining rows keep their relative order.  Replaces the
 * binding with the filtered list.
 *
 * The alias is registered in the parser's variable scope so the
 * predicate can reference `alias.field` (or just `alias` for scalar
 * rows).  At runtime, the alias resolves to the *current* row via
 * {@link value}.
 */
class UpdateDelete extends Operation {
    private _name: string;
    private _alias: string;
    private _predicate: Expression;
    private _currentRow: any = undefined;
    private _value: any[] = [];

    constructor(name: string, alias: string, predicate: Expression) {
        super();
        this._name = name;
        this._alias = alias;
        this._predicate = predicate;
        this.addChild(predicate);
    }

    /**
     * Replaces the predicate (used by the parser, which must register
     * the operation in its variable scope *before* parsing the
     * predicate so that `<alias>` references resolve to this node).
     */
    public setPredicate(predicate: Expression): void {
        if (this.children.length > 0) {
            this.replaceChild(this._predicate, predicate);
        } else {
            this.addChild(predicate);
        }
        this._predicate = predicate;
    }

    public get name(): string {
        return this._name;
    }

    public get alias(): string {
        return this._alias;
    }

    public get predicate(): Expression {
        return this._predicate;
    }

    /**
     * Returns the row currently bound to the alias during predicate
     * evaluation.  This is what {@link Reference}.value() resolves to
     * when the alias is referenced in the predicate.
     */
    public value(): any {
        return this._currentRow;
    }

    public async run(): Promise<void> {
        const bindings = Bindings.getInstance();
        if (!bindings.has(this._name)) {
            throw new Error(`Binding '${this._name}' is not defined; use LET to create it`);
        }
        const existing = bindings.get(this._name);
        if (!Array.isArray(existing)) {
            throw new Error(
                `UPDATE ${this._name} AS ${this._alias} DELETE WHERE … requires '${this._name}' to be a list`
            );
        }
        const result: any[] = [];
        for (const row of existing) {
            this._currentRow = row;
            const keep = !this._predicate.value();
            if (keep) {
                result.push(row);
            }
        }
        this._currentRow = undefined;
        bindings.set(this._name, result);
        this._value = result;
        await this.next?.run();
    }

    public get results(): Record<string, any>[] {
        return this._value as Record<string, any>[];
    }
}

export default UpdateDelete;
