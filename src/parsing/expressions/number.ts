import ASTNode from "../ast_node";

class Number extends ASTNode {
    private _value: number;

    constructor(value: string) {
        super();
        if(value.indexOf('.') !== -1) {
            this._value = parseFloat(value);
        } else {
            this._value = parseInt(value);
        }
    }

    public value(): number {
        return this._value;
    }

    protected toString(): string {
        return `${this.constructor.name} (${this._value})`;
    }
}

export default Number;