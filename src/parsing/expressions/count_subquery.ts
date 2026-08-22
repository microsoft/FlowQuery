import SubqueryExpression from "./subquery_expression";

/** `COUNT { ... }` — the number of rows the subquery produces. */
class CountSubquery extends SubqueryExpression {
    protected reduce(_rows: any[], count: number): number {
        return count;
    }
}

export default CountSubquery;
