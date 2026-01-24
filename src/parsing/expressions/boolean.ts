import ASTNode from "../ast_node";

class Boolean extends ASTNode {
    private _value: boolean;
    constructor(value: string) {
        super();
        const _value = value.toUpperCase();
        if (_value === "TRUE") {
            this._value = true;
        } else if (_value === "FALSE") {
            this._value = false;
        } else {
            throw new Error(`Invalid boolean value: ${value}`);
        }
    }
    public value(): boolean {
        return this._value;
    }
}

export default Boolean;
