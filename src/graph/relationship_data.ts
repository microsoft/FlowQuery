import Data from "./data";

class RelationshipData extends Data {
    constructor(records: Record<string, any>[] = []) {
        super(records);
        super._buildIndex("left_id");
    }
    public find(left_id: string): boolean {
        return super._find(left_id);
    }
}

export default RelationshipData;
