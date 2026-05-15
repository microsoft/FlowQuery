import { RowProvenance } from "../../compute/provenance";
import Bindings from "../../graph/bindings";
import { attachVirtualSource } from "../../graph/virtual_sources";
import ASTNode from "../ast_node";
import Expression from "../expressions/expression";
import Operation from "./operation";

/**
 * `LET name = <expression-or-query>`: binds a value to a name in the
 * global {@link Bindings} store.
 *
 * The right-hand side is either a parsed expression (literal, function
 * call, identifier, ...) or a sub-query AST that is executed at
 * run-time; a query RHS materialises to the list of result rows.  In
 * either case the value is stored eagerly when the `LET` operation
 * runs and remains available to subsequent statements until
 * overwritten or `DROP BINDING name` is executed.
 *
 * `LET name = { ... } REFRESH EVERY n unit` registers a refreshable
 * binding: the sub-query is evaluated once at `LET` time, the result
 * is cached, and the next read after the TTL has elapsed re-executes
 * the sub-query.  Refreshable bindings cannot be silently replaced;
 * `DROP BINDING name` first.
 */
class Let extends Operation {
    private _name: string;
    private _expression: Expression | null;
    private _subQuery: ASTNode | null;
    private _value: any = undefined;
    private _refreshEveryMs: number | null;

    constructor(
        name: string,
        expression: Expression | null,
        subQuery: ASTNode | null,
        refreshEveryMs: number | null = null
    ) {
        super();
        this._name = name;
        this._expression = expression;
        this._subQuery = subQuery;
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

    public get refreshEveryMs(): number | null {
        return this._refreshEveryMs;
    }

    public async run(): Promise<void> {
        const bindings = Bindings.getInstance();
        let value: any;
        if (this._subQuery !== null) {
            const first = this._subQuery.firstChild() as Operation;
            const last = this._subQuery.lastChild() as Operation;
            // Always capture provenance for sub-query LET RHS: it lets
            // downstream consumers (e.g. `LOAD JSON FROM <letName>`)
            // thread row-level lineage back through this binding.  Cost
            // is paid once at LET time; downstream readers pay nothing
            // when they don't ask.
            const sink: RowProvenance[] = [];
            // Lazy dynamic import to avoid a load-time cycle:
            // let -> runner -> parser -> let.
            const { default: Runner } = await import("../../compute/runner");
            Runner.wireProvenance(first, sink);
            await first.initialize();
            await first.run();
            await first.finish();
            value = last.results;
            if (Array.isArray(value)) {
                const len = Math.min(sink.length, value.length);
                for (let i = 0; i < len; i++) {
                    const row = value[i];
                    if (row !== null && typeof row === "object") {
                        attachVirtualSource(row, sink[i]);
                    }
                }
            }
        } else if (this._expression !== null) {
            value = this._expression.value();
        } else {
            value = null;
        }
        this._value = value;
        if (this._refreshEveryMs !== null) {
            if (this._subQuery === null) {
                throw new Error("LET REFRESH EVERY requires a sub-query right-hand side");
            }
            bindings.registerRefreshable(this._name, value, this._subQuery, this._refreshEveryMs);
        } else {
            bindings.set(this._name, value);
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

export default Let;
