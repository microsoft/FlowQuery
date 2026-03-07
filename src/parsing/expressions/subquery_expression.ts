import Runner from "../../compute/runner";
import ASTNode from "../ast_node";
import Operation from "../operations/operation";
import Return from "../operations/return";

export enum SubqueryMode {
    EXISTS = "exists",
    COUNT = "count",
    COLLECT = "collect",
}

/**
 * Counts rows flowing through an operation chain without producing results.
 * Used by SubqueryExpression to evaluate MATCH-only subqueries (no RETURN).
 */
class RowCounter extends Operation {
    public count: number = 0;
    public async run(): Promise<void> {
        this.count++;
    }
}

class SubqueryExpression extends ASTNode {
    private _mode: SubqueryMode;
    private _subqueryAST: ASTNode;
    private _results: any[] = [];
    private _rowCount: number = 0;

    constructor(mode: SubqueryMode, subqueryAST: ASTNode) {
        super();
        this._mode = mode;
        this._subqueryAST = subqueryAST;
    }

    public get mode(): SubqueryMode {
        return this._mode;
    }

    public async evaluate(): Promise<void> {
        this._results = [];
        this._rowCount = 0;

        const first = this._subqueryAST.firstChild() as Operation;
        const last = this._subqueryAST.lastChild() as Operation;

        if (last instanceof Return) {
            const runner = new Runner(null, this._subqueryAST);
            await runner.run();
            this._results = runner.results ?? [];
            this._rowCount = this._results.length;
        } else {
            // Subquery without RETURN (e.g., EXISTS { MATCH ... })
            const counter = new RowCounter();
            const savedNext = last.next;
            last.next = counter;

            await first.initialize();
            await first.run();
            await first.finish();

            last.next = savedNext;
            this._rowCount = counter.count;
        }
    }

    public value(): any {
        switch (this._mode) {
            case SubqueryMode.EXISTS:
                return this._rowCount > 0;
            case SubqueryMode.COUNT:
                return this._rowCount;
            case SubqueryMode.COLLECT: {
                if (this._results.length === 0) return [];
                const keys = Object.keys(this._results[0]);
                if (keys.length !== 1) {
                    throw new Error("COLLECT subquery must return exactly one column");
                }
                const key = keys[0];
                return this._results.map((r: any) => r[key]);
            }
        }
    }
}

export default SubqueryExpression;
