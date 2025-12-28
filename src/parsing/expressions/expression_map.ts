import Expression from "./expression";

class ExpressionMap {
    private _map: Map<string, Expression> = new Map();
    public get(alias: string): Expression | undefined {
        return this._map.get(alias);
    }
    public has(alias: string): boolean {
        return this._map.has(alias);
    }
    public set map(expressions: Expression[]) {
        this._map.clear();
        for (const expr of expressions) {
            if (expr.alias == undefined) {
                continue;
            }
            this._map.set(expr.alias, expr);
        }
    }
}

export default ExpressionMap;
