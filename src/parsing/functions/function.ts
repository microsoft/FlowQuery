import ASTNode from "../ast_node";

class Function extends ASTNode {
    protected _name: string;
    protected _expectedParameterCount: number | null = null;
    protected _supports_distinct: boolean = false;

    constructor(name: string) {
        super();
        this._name = name;
    }

    public set parameters(nodes: ASTNode[]) {
        if (this._expectedParameterCount !== null && this._expectedParameterCount !== nodes.length) {
            throw new Error(`Function ${this._name} expected ${this._expectedParameterCount} parameters, but got ${nodes.length}`);
        }
        this.children = nodes;
    }

    public get name(): string {
        return this._name;
    }

    public toString(): string {
        return `Function (${this._name})`;
    }

    public set distinct(distinct: boolean) {
        if (this._supports_distinct) {
            this._supports_distinct = distinct;
        } else {
            throw new Error(`Function ${this._name} does not support distinct`);
        }
    }
}

export default Function;