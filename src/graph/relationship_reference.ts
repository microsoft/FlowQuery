import { endpointMatches, endpointNamespace } from "./graph_records";
import Relationship from "./relationship";
import { RelationshipRecord } from "./relationship_data";

class RelationshipReference extends Relationship {
    private _reference: Relationship | null = null;
    constructor(base: Relationship, reference: Relationship) {
        super();
        this._identifier = base.identifier;
        this._types = base.types;
        this._graph = base.graph;
        this._hops = base.hops!;
        this._source = base.source;
        this._target = base.target;
        this._reference = reference;
    }
    public async *find(left_id: string, hop: number = 0, origin?: string): AsyncGenerator<void> {
        const data: RelationshipRecord = this._reference!.currentRecord(hop) as RelationshipRecord;
        if (!endpointMatches(data, this.anchorSide, origin)) return;
        this.setValue(this._reference!);
        const followId = this._direction === "left" ? "left_id" : "right_id";
        if (this._target) {
            yield* this._target.find(data[followId], hop, endpointNamespace(data, this.nextSide));
        } else {
            yield;
        }
    }
}

export default RelationshipReference;
