import Data from "./data";

export type RelationshipRecord = { left_id: string; right_id: string } & Record<string, any>;

class RelationshipData extends Data {
    constructor(records: RelationshipRecord[] = []) {
        super(records);
        super._buildIndex("left_id");
    }
    public find(left_id: string, hop: number = 0): boolean {
        return super._find(left_id, hop);
    }
}

export default RelationshipData;
