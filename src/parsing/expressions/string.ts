import ASTNode from "../ast_node";

class String extends ASTNode {
    protected _value: string;

    constructor(value: string) {
        super();
        this._value = value;
    }

    public value(): string {
        return this._value;
    }

    public toString(): string {
        return `String (${this._value})`;
    }
}

export default String;