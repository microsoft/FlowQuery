import Relationship from "./relationship";
import { RelationshipRecord } from "./relationship_data";

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
        const data: RelationshipRecord = this._reference!.getData()?.current(
            hop
        ) as RelationshipRecord;
        await this._target?.find(data.right_id, hop);
    }
}

export default RelationshipReference;
