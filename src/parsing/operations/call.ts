import Expression from "../expressions/expression";
import ExpressionMap from "../expressions/expression_map";
import AsyncFunction from "../functions/async_function";
import Projection from "./projection";

const DEFAULT_VARIABLE_NAME: string = "value";

class Call extends Projection {
    protected _function: AsyncFunction | null = null;
    private _map: ExpressionMap = new ExpressionMap();
    protected _results: Record<string, any>[] = [];
    constructor() {
        super([]);
    }
    public set function(asyncFunction: AsyncFunction) {
        this._function = asyncFunction;
    }
    public get function(): AsyncFunction | null {
        return this._function;
    }
    public set yielded(expressions: Expression[]) {
        this.children = expressions;
        this._map.map = expressions;
    }
    public get hasYield(): boolean {
        return this.children.length > 0;
    }
    public async run(): Promise<void> {
        if (this._function === null) {
            throw new Error("No function set for Call operation.");
        }
        const args = this._function.getArguments();
        for await (const item of this._function.generate(...args)) {
            if (!this.isLast) {
                if (typeof item == "object" && !Array.isArray(item)) {
                    for (const [key, value] of Object.entries(item)) {
                        const expression = this._map.get(key);
                        if (expression) {
                            expression.overridden = value;
                        }
                    }
                } else {
                    const expression = this._map.get(DEFAULT_VARIABLE_NAME);
                    if (expression) {
                        expression.overridden = item;
                    }
                }
                await this.next?.run();
            } else {
                const record: Map<string, any> = new Map();
                if (typeof item == "object" && !Array.isArray(item)) {
                    for (const [key, value] of Object.entries(item)) {
                        if (this._map.has(key) || !this.hasYield) {
                            record.set(key, value);
                        }
                    }
                } else {
                    record.set(DEFAULT_VARIABLE_NAME, item);
                }
                this._results.push(Object.fromEntries(record));
            }
        }
    }
    public get results(): Record<string, any>[] {
        return this._results;
    }
}

export default Call;
