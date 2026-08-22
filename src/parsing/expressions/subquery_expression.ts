import ASTNode from "../ast_node";
import Operation from "../operations/operation";

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

/**
 * Base class for the brace-delimited subquery expressions `EXISTS { }`,
 * `COUNT { }` and `COLLECT { }`.  The base executes the nested query and
 * hands the resulting rows and row-count to `reduce()`, which each concrete
 * subclass implements to produce its value.
 */
abstract class SubqueryExpression extends ASTNode {
    private _subqueryAST: ASTNode;
    private _value: any;

    constructor(subqueryAST: ASTNode) {
        super();
        this._subqueryAST = subqueryAST;
    }

    public introducesScope(): boolean {
        return true;
    }

    public async evaluate(): Promise<void> {
        // Imported lazily to break the module cycle with Runner (which
        // imports the parser, which imports this file's subclasses).
        const { default: Runner } = await import("../../compute/runner");
        const { default: Return } = await import("../operations/return");

        const first = this._subqueryAST.firstChild() as Operation;
        const last = this._subqueryAST.lastChild() as Operation;

        let rows: any[] = [];
        let count = 0;

        if (last instanceof Return) {
            const runner = new Runner(null, this._subqueryAST);
            await runner.run();
            rows = runner.results ?? [];
            count = rows.length;
        } else {
            // Subquery without RETURN (e.g., EXISTS { MATCH ... })
            const counter = new RowCounter();
            const savedNext = last.next;
            last.next = counter;

            await first.initialize();
            await first.run();
            await first.finish();

            last.next = savedNext;
            count = counter.count;
        }

        this._value = this.reduce(rows, count);
    }

    public value(): any {
        return this._value;
    }

    /** Reduce the executed subquery's rows and row-count to this expression's value. */
    protected abstract reduce(rows: any[], count: number): any;
}

export default SubqueryExpression;
