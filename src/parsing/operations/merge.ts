import Bindings from "../../graph/bindings";
import ASTNode from "../ast_node";
import Expression from "../expressions/expression";
import Operation from "./operation";

/**
 * One item in the `WHEN MATCHED THEN UPDATE SET` list.
 *
 * `field` is the name of the field on the matched target row to
 * overwrite; `expression` is the value to assign.  When `expression`
 * is `null`, the default is `source.<field>` — i.e. the value of the
 * same-named field on the current incoming row.  This makes the
 * partial-merge case (`SET .name, .email`) ergonomic without having to
 * write `SET .name = source.name, .email = source.email`.
 */
export interface MergeSetItem {
    field: string;
    expression: Expression | null;
}

/**
 * The action taken when an incoming source row matches an existing
 * target row.  Either rewrite specific fields (`update`) or remove
 * the matched target row (`delete`).
 */
export type MergeMatchedAction = { type: "update"; setItems: MergeSetItem[] } | { type: "delete" };

/**
 * The action taken when an incoming source row matches no existing
 * target row.  Inserts the row produced by `expression`, or the bare
 * source row if `expression` is `null` (the implicit-insert default).
 */
export interface MergeNotMatchedAction {
    type: "insert";
    expression: Expression | null;
}

/**
 * The `ON` clause: either a short-form list of key fields (matched
 * positionally against the source row by name) or an arbitrary
 * predicate evaluated per (target, source) pair.
 */
export type MergeOnClause =
    | { type: "keys"; keys: string[] }
    | { type: "predicate"; predicate: Expression };

/**
 * `MERGE INTO <name> [AS <target>] USING <source-rhs> [AS <source>]
 *      ON ( <key> | (<k1>, <k2>, …) | <predicate> )
 *      [ WHEN MATCHED THEN UPDATE SET <set-list> ]
 *      [ WHEN MATCHED THEN DELETE ]
 *      [ WHEN NOT MATCHED THEN INSERT [<expr>] ]`
 *
 * SQL-MERGE-style upsert into an existing list-binding.  The source
 * may be any expression, sub-query, or bare binding name; both the
 * `target` and `source` aliases are in scope inside the `ON`
 * predicate and any `SET .field = <expr>` / `INSERT <expr>`
 * expressions, allowing per-pair computation across both sides.
 *
 * Execution semantics:
 *
 * - The source RHS is evaluated once to produce a list of rows.
 * - For each source row, the target list is scanned for a matching
 *   row using the `ON` clause.
 * - If a match is found and a `WHEN MATCHED` branch is present, that
 *   branch is applied (rewriting the matched target row in place, or
 *   removing it).  Without a `WHEN MATCHED` branch, the source row is
 *   silently ignored.
 * - If no match is found and a `WHEN NOT MATCHED THEN INSERT` branch
 *   is present, the row is appended to the target list.  Without the
 *   branch, the source row is silently ignored.
 *
 * The target binding must already exist (use `LET` to create it).
 */
/**
 * Proxy AST node used by the parser to register the `target` /
 * `source` alias in the variable scope while parsing the ON
 * predicate and SET / INSERT expressions.  Resolves to the row
 * currently exposed by the owning Merge instance.
 */
export class MergeTargetAlias extends ASTNode {
    private _merge: Merge;
    constructor(merge: Merge) {
        super();
        this._merge = merge;
    }
    public value(): any {
        return this._merge.targetValue();
    }
}

export class MergeSourceAlias extends ASTNode {
    private _merge: Merge;
    constructor(merge: Merge) {
        super();
        this._merge = merge;
    }
    public value(): any {
        return this._merge.sourceValue();
    }
}

class Merge extends Operation {
    private _name: string;
    private _targetAlias: string | null;
    private _sourceAlias: string | null;
    private _onClause: MergeOnClause;
    private _matched: MergeMatchedAction | null;
    private _notMatched: MergeNotMatchedAction | null;
    private _sourceExpression: Expression | null;
    private _sourceSubQuery: ASTNode | null;

    /**
     * The target row currently in scope (during ON / SET / INSERT
     * evaluation).  `undefined` for `WHEN NOT MATCHED` rows.
     */
    private _currentTarget: any = undefined;
    /**
     * The source row currently in scope (during ON / SET / INSERT
     * evaluation).
     */
    private _currentSource: any = undefined;

    /** The last value written back to the binding (for `results`). */
    private _value: any[] = [];

    constructor(
        name: string,
        targetAlias: string | null,
        sourceAlias: string | null,
        sourceExpression: Expression | null,
        sourceSubQuery: ASTNode | null,
        onClause: MergeOnClause,
        matched: MergeMatchedAction | null,
        notMatched: MergeNotMatchedAction | null
    ) {
        super();
        this._name = name;
        this._targetAlias = targetAlias;
        this._sourceAlias = sourceAlias;
        this._sourceExpression = sourceExpression;
        this._sourceSubQuery = sourceSubQuery;
        this._onClause = onClause;
        this._matched = matched;
        this._notMatched = notMatched;
        if (sourceExpression !== null) {
            this.addChild(sourceExpression);
        }
        if (sourceSubQuery !== null) {
            this.addChild(sourceSubQuery);
        }
        if (onClause.type === "predicate") {
            this.addChild(onClause.predicate);
        }
        if (matched !== null && matched.type === "update") {
            for (const item of matched.setItems) {
                if (item.expression !== null) {
                    this.addChild(item.expression);
                }
            }
        }
        if (notMatched !== null && notMatched.expression !== null) {
            this.addChild(notMatched.expression);
        }
    }

    /**
     * Replaces the placeholder ON clause and matched / not-matched
     * actions with their parsed counterparts (used by the parser,
     * which must register the operation in its variable scope before
     * parsing those expressions so that the target / source aliases
     * resolve to this node).
     */
    public setClauses(
        onClause: MergeOnClause,
        matched: MergeMatchedAction | null,
        notMatched: MergeNotMatchedAction | null
    ): void {
        this._onClause = onClause;
        this._matched = matched;
        this._notMatched = notMatched;
        if (onClause.type === "predicate") {
            this.addChild(onClause.predicate);
        }
        if (matched !== null && matched.type === "update") {
            for (const item of matched.setItems) {
                if (item.expression !== null) {
                    this.addChild(item.expression);
                }
            }
        }
        if (notMatched !== null && notMatched.expression !== null) {
            this.addChild(notMatched.expression);
        }
    }

    public get name(): string {
        return this._name;
    }

    public get targetAlias(): string | null {
        return this._targetAlias;
    }

    public get sourceAlias(): string | null {
        return this._sourceAlias;
    }

    public get sourceExpression(): Expression | null {
        return this._sourceExpression;
    }

    public get sourceSubQuery(): ASTNode | null {
        return this._sourceSubQuery;
    }

    public get onClause(): MergeOnClause {
        return this._onClause;
    }

    public get matched(): MergeMatchedAction | null {
        return this._matched;
    }

    public get notMatched(): MergeNotMatchedAction | null {
        return this._notMatched;
    }

    /**
     * Returns the row currently in scope for the given alias.  This is
     * what {@link Reference}.value() resolves to when the target /
     * source alias is referenced inside the ON predicate or in a
     * SET / INSERT expression.  The parser stamps an aliasContext on
     * the proxy AST nodes it registers in the variable scope so we
     * can disambiguate without name comparison.
     */
    public targetValue(): any {
        return this._currentTarget;
    }

    public sourceValue(): any {
        return this._currentSource;
    }

    public async run(): Promise<void> {
        const bindings = Bindings.getInstance();
        if (!bindings.has(this._name)) {
            throw new Error(`Binding '${this._name}' is not defined; use LET to create it`);
        }
        const existing = bindings.get(this._name);
        if (!Array.isArray(existing)) {
            throw new Error(`MERGE INTO ${this._name} requires '${this._name}' to be a list`);
        }
        // Evaluate source once.
        let source: any;
        if (this._sourceSubQuery !== null) {
            const first = this._sourceSubQuery.firstChild() as Operation;
            const last = this._sourceSubQuery.lastChild() as Operation;
            await first.initialize();
            await first.run();
            await first.finish();
            source = last.results;
        } else if (this._sourceExpression !== null) {
            source = this._sourceExpression.value();
        } else {
            source = null;
        }
        if (!Array.isArray(source)) {
            throw new Error(
                `MERGE INTO ${this._name} USING … requires the source to evaluate to a list of rows`
            );
        }

        // Working copy of the target list; mutations are applied in
        // place and a final assignment writes it back to the binding.
        const result: any[] = existing.slice();
        // Tombstone marker for delete actions; we sweep at the end so
        // that intra-merge index lookups remain stable.
        const tombstones: Set<number> = new Set();

        for (const sourceRow of source) {
            this._currentSource = sourceRow;
            const matchedIndex = this.findMatch(result, tombstones, sourceRow);
            if (matchedIndex !== -1) {
                this._currentTarget = result[matchedIndex];
                if (this._matched !== null) {
                    if (this._matched.type === "delete") {
                        tombstones.add(matchedIndex);
                    } else {
                        result[matchedIndex] = this.applySet(
                            result[matchedIndex],
                            this._matched.setItems
                        );
                    }
                }
                this._currentTarget = undefined;
            } else {
                if (this._notMatched !== null) {
                    const inserted =
                        this._notMatched.expression !== null
                            ? this._notMatched.expression.value()
                            : sourceRow;
                    result.push(inserted);
                }
            }
        }
        this._currentSource = undefined;

        const swept: any[] = [];
        for (let i = 0; i < result.length; i++) {
            if (!tombstones.has(i)) {
                swept.push(result[i]);
            }
        }
        bindings.set(this._name, swept);
        this._value = swept;
        await this.next?.run();
    }

    /**
     * Finds the first index in `target` (skipping tombstones) for
     * which the ON clause holds against the current source row.  The
     * source row is already exposed via {@link sourceValue}.
     */
    private findMatch(target: any[], tombstones: Set<number>, sourceRow: any): number {
        if (this._onClause.type === "keys") {
            const keys = this._onClause.keys;
            // Source row must be an object with all keys defined; if not,
            // it cannot match anything and falls through to NOT MATCHED.
            if (sourceRow === null || typeof sourceRow !== "object") {
                return -1;
            }
            for (const k of keys) {
                if (!(k in sourceRow)) {
                    return -1;
                }
            }
            for (let i = 0; i < target.length; i++) {
                if (tombstones.has(i)) {
                    continue;
                }
                const t = target[i];
                if (t === null || typeof t !== "object") {
                    continue;
                }
                let matches = true;
                for (const k of keys) {
                    if (!(k in t) || t[k] !== sourceRow[k]) {
                        matches = false;
                        break;
                    }
                }
                if (matches) {
                    return i;
                }
            }
            return -1;
        }
        // Predicate ON — evaluate per (target, source) pair.
        for (let i = 0; i < target.length; i++) {
            if (tombstones.has(i)) {
                continue;
            }
            this._currentTarget = target[i];
            const ok = this._onClause.predicate.value();
            if (ok) {
                this._currentTarget = undefined;
                return i;
            }
        }
        this._currentTarget = undefined;
        return -1;
    }

    /**
     * Builds the next value for a matched target row by applying the
     * `SET <set-list>` items.  Items without an explicit expression
     * default to `source.<field>`.
     */
    private applySet(targetRow: any, setItems: MergeSetItem[]): any {
        const base = targetRow !== null && typeof targetRow === "object" ? { ...targetRow } : {};
        for (const item of setItems) {
            if (item.expression !== null) {
                base[item.field] = item.expression.value();
            } else {
                // Default: copy source.<field> if present, otherwise
                // leave the existing field untouched.  This makes
                // `SET .name, .email` behave like the old partial-merge
                // form (only listed fields overwrite; missing ones
                // preserve the target's value).
                const src = this._currentSource;
                if (src !== null && typeof src === "object" && item.field in src) {
                    base[item.field] = src[item.field];
                }
            }
        }
        return base;
    }

    public get results(): Record<string, any>[] {
        return this._value as Record<string, any>[];
    }
}

export default Merge;
