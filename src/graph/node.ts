import ASTNode from "../parsing/ast_node";
import Expression from "../parsing/expressions/expression";
import NodeData from "./node_data";
import Relationship from "./relationship";

class Node extends ASTNode {
    private _identifier: string | null = null;
    private _label: string | null = null;
    private _properties: Map<string, Expression> = new Map();
    private _value: any = null;

    private _incoming: Relationship | null = null;
    private _outgoing: Relationship | null = null;

    private _data: NodeData | null = null;

    private _callback: (() => Promise<void>) | null = null;

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
    public set outgoing(relationship: Relationship | null) {
        this._outgoing = relationship;
    }
    public get outgoing(): Relationship | null {
        return this._outgoing;
    }
    public set incoming(relationship: Relationship | null) {
        this._incoming = relationship;
    }
    public get incoming(): Relationship | null {
        return this._incoming;
    }
    public setData(data: NodeData | null): void {
        this._data = data;
    }
    public async next(): Promise<void> {
        while (this._data?.next()) {
            this.setValue(this._data?.current());
            await this._outgoing?.find(this._value.id);
            await this._callback?.();
        }
    }
    public async find(id: string): Promise<void> {
        while (this._data?.find(id)) {
            this.setValue(this._data?.current());
            await this._outgoing?.find(this._value.id);
            await this._callback?.();
        }
    }
    public setCallback(callback: () => Promise<void>): void {
        this._callback = callback;
    }
}

export default Node;
