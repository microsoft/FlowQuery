import ASTNode from "../parsing/ast_node";
import Expression from "../parsing/expressions/expression";

class Node extends ASTNode {
    private _identifier: string | null = null;
    private _label: string | null = null;
    private _properties: Map<string, Expression> = new Map();
    private _value: any = null;
    constructor(identifier: string | null = null, label: string | null = null) {
        super();
        this._identifier = identifier;
        this._label = label;
    }
    public set identifier(identifier: string) {
        this._identifier = identifier;
    }
    public get identifier(): string | null {
        return this._identifier;
    }
    public set label(label: string) {
        this._label = label;
    }
    public get label(): string | null {
        return this._label;
    }
    public setProperty(key: string, value: Expression): void {
        this._properties.set(key, value);
    }
    public getProperty(key: string): Expression | null {
        return this._properties.get(key) || null;
    }
    public setValue(value: any): void {
        this._value = value;
    }
    public value(): any {
        return this._value;
    }
}

export default Node;
