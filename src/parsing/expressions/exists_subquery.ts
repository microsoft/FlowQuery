import SubqueryExpression from "./subquery_expression";

/** `EXISTS { ... }` — true when the subquery produces at least one row. */
class ExistsSubquery extends SubqueryExpression {
    protected reduce(_rows: any[], count: number): boolean {
        return count > 0;
    }
}

export default ExistsSubquery;
