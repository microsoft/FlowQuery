import Relationship from "./relationship";

class RelationshipReference extends Relationship {
    private _reference: Relationship | null = null;
    constructor(base: Relationship, reference: Relationship) {
        super();
        this._from = base.from;
        this._to = base.to;
        this._identifier = base.identifier;
        this._type = base.type;
        this._hops = base.hops!;
        this._source = base.source;
        this._target = base.target;
        this._reference = reference;
    }
    public async find(left_id: string, hop: number = 0): Promise<void> {
        this.setValue(this._reference!);
        await this._target?.find(this._value!.endNode!.id, hop);
    }
}

export default RelationshipReference;
