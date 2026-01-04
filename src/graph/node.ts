import ASTNode from "../parsing/ast_node";
import Expression from "../parsing/expressions/expression";
import NodeData, { NodeRecord } from "./node_data";
import Relationship from "./relationship";

class Node extends ASTNode {
    protected _identifier: string | null = null;
    protected _label: string | null = null;
    protected _properties: Map<string, Expression> = new Map();
    protected _value: NodeRecord | null = null;

    protected _incoming: Relationship | null = null;
    protected _outgoing: Relationship | null = null;

    private _data: NodeData | null = null;

    // Function to be called after each 'next' and 'find' operation
    // It is used to chain operations in a traversal
    // For example, after matching on a graph pattern, we may want to
    // continue to the next node or relationship in the pattern, or
    // perform the next operation in a statement.
    private _todoNext: (() => Promise<void>) | null = null;

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
    public get properties(): Map<string, Expression> {
        return this._properties;
    }
    public setProperty(key: string, value: Expression): void {
        this._properties.set(key, value);
    }
    public getProperty(key: string): Expression | null {
        return this._properties.get(key) || null;
    }
    public setValue(value: NodeRecord): void {
        this._value = value;
    }
    public value(): NodeRecord | null {
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
        this._data?.reset();
        while (this._data?.next()) {
            this.setValue(this._data?.current()!);
            await this._outgoing?.find(this._value!.id);
            await this.runTodoNext();
        }
    }
    public async find(id: string, hop: number = 0): Promise<void> {
        this._data?.reset();
        while (this._data?.find(id, hop)) {
            this.setValue(this._data?.current(hop) as NodeRecord);
            await this._outgoing?.find(this._value!.id, hop);
            await this.runTodoNext();
        }
    }
    // For setting a function to be called after each 'next' and 'find' operation
    public set todoNext(func: (() => Promise<void>) | null) {
        this._todoNext = func;
    }
    public async runTodoNext(): Promise<void> {
        if (this._todoNext) {
            await this._todoNext();
        }
    }
}

export default Node;
