import ASTNode from "../parsing/ast_node";
import Expression from "../parsing/expressions/expression";
import Node from "./node";
import RelationshipData from "./relationship_data";

class Hops {
    private _min: number = 1;
    private _max: number = Number.MAX_SAFE_INTEGER;

    public set min(min: number) {
        this._min = min;
    }
    public get min(): number {
        return this._min;
    }
    public set max(max: number) {
        this._max = max;
    }
    public get max(): number {
        return this._max;
    }
}

class Relationship extends ASTNode {
    // Labels of the nodes this relationship connects
    private _from: string | null = null; // label of the starting node
    private _to: string | null = null; // label of the ending node

    private _identifier: string | null = null;
    private _type: string | null = null;
    private _properties: Map<string, Expression> = new Map();
    private _hops: Hops = new Hops();

    private _value: any = null;

    private _source: Node | null = null;
    private _target: Node | null = null;

    private _data: RelationshipData | null = null;

    constructor(identifier: string | null = null, type: string | null = null) {
        super();
        this._identifier = identifier;
        this._type = type;
    }
    public set from(from: string | null) {
        this._from = from;
    }
    public get from(): string | null {
        return this._from;
    }
    public set to(to: string | null) {
        this._to = to;
    }
    public get to(): string | null {
        return this._to;
    }
    public set identifier(identifier: string) {
        this._identifier = identifier;
    }
    public get identifier(): string | null {
        return this._identifier;
    }
    public set type(type: string) {
        this._type = type;
    }
    public get type(): string | null {
        return this._type;
    }
    public setProperty(key: string, value: Expression): void {
        this._properties.set(key, value);
    }
    public getProperty(key: string): Expression | null {
        return this._properties.get(key) || null;
    }
    public get hops(): Hops {
        return this._hops;
    }
    public setValue(value: any): void {
        this._value = value;
    }
    public set source(node: Node | null) {
        this._source = node;
    }
    public get source(): Node | null {
        return this._source;
    }
    public set target(node: Node | null) {
        this._target = node;
    }
    public get target(): Node | null {
        return this._target;
    }
    public value(): any {
        return this._value;
    }
    public setData(data: RelationshipData | null): void {
        this._data = data;
    }
    public async find(left_id: string): Promise<void> {
        while (this._data?.find(left_id)) {
            this.setValue(this._data?.current());
            await this._target?.find(this._value.right_id);
        }
    }
}

export default Relationship;
