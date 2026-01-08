import ASTNode from "../parsing/ast_node";
import Expression from "../parsing/expressions/expression";
import Hops from "./hops";
import Node from "./node";
import RelationshipData, { RelationshipRecord } from "./relationship_data";
import RelationshipMatchCollector, {
    RelationshipMatchRecord,
} from "./relationship_match_collector";

class Relationship extends ASTNode {
    // Labels of the nodes this relationship connects
    protected _from: string | null = null; // label of the starting node
    protected _to: string | null = null; // label of the ending node

    protected _identifier: string | null = null;
    protected _type: string | null = null;
    protected _properties: Map<string, Expression> = new Map();
    protected _hops: Hops = new Hops();

    protected _value: RelationshipMatchRecord | null = null;
    protected _matches: RelationshipMatchCollector = new RelationshipMatchCollector();

    protected _source: Node | null = null;
    protected _target: Node | null = null;

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
    public get properties(): Record<string, any> {
        return this._data?.properties() || {};
    }
    public setProperty(key: string, value: Expression): void {
        this._properties.set(key, value);
    }
    public getProperty(key: string): Expression | null {
        return this._properties.get(key) || null;
    }
    public set hops(hops: Hops) {
        this._hops = hops;
    }
    public get hops(): Hops | null {
        return this._hops;
    }
    public setValue(relationship: Relationship): void {
        const match: RelationshipMatchRecord = this._matches.push(relationship);
        this._value = match;
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
    public value(): RelationshipMatchRecord | null {
        return this._value;
    }
    public setData(data: RelationshipData | null): void {
        this._data = data;
    }
    public setEndNode(node: Node): void {
        this._matches.endNode = node;
    }
    public async find(left_id: string, hop: number = 0): Promise<void> {
        if (hop === 0) {
            this._data?.reset();
        }
        while (this._data?.find(left_id, hop)) {
            const data: RelationshipRecord = this._data?.current(hop) as RelationshipRecord;
            if (hop >= this.hops!.min) {
                this.setValue(this);
                await this._target?.find(data.right_id, hop);
                if (hop + 1 < this.hops!.max) {
                    await this.find(data.right_id, hop + 1);
                }
                this._matches.pop();
            }
        }
    }
}

export default Relationship;
