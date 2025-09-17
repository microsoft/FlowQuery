import ASTNode from "../ast_node";
import Identifier from "./identifier";

class Reference extends Identifier {
    private _referred: ASTNode | undefined = undefined;
    constructor(value: string, referred: ASTNode | undefined = undefined) {
        super(value);
        this._referred = referred;
    }
    public set referred(node: ASTNode) {
        this._referred = node;
    }
    public toString(): string {
        return `Reference (${this._value})`;
    }
    public value(): any {
        return this._referred?.value();
    }
    public get identifier(): string {
        return this._value;
    }
}

export default Reference;