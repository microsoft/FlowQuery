import ASTNode from "../ast_node";

class ValueHolder extends ASTNode {
    private _holder: any;
    public set holder(value: any) {
        this._holder = value;
    }
    public value(): any {
        return this._holder;
    }
}

export default ValueHolder;