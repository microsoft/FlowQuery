import SubqueryExpression from "./subquery_expression";

/** `COLLECT { ... }` — the subquery's single returned column gathered into an array. */
class CollectSubquery extends SubqueryExpression {
    protected reduce(rows: any[]): any[] {
        if (rows.length === 0) return [];
        const keys = Object.keys(rows[0]);
        if (keys.length !== 1) {
            throw new Error("COLLECT subquery must return exactly one column");
        }
        const key = keys[0];
        return rows.map((r: any) => r[key]);
    }
}

export default CollectSubquery;
