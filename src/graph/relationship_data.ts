import Data from "./data";

export type RelationshipRecord = { left_id: string; right_id: string } & Record<string, any>;

class RelationshipData extends Data {
    constructor(records: RelationshipRecord[] = []) {
        super(records);
        super._buildIndex("left_id");
        super._buildIndex("right_id");
    }
    public find(left_id: string, hop: number = 0): boolean {
        return super._find(left_id, hop, "left_id");
    }
    public findReverse(right_id: string, hop: number = 0): boolean {
        return super._find(right_id, hop, "right_id");
    }
    /*
    ** Get the properties of the current relationship record
    '' excluding the left_id and right_id fields
    */
    public properties(): Record<string, any> | null {
        const current = this.current();
        if (current) {
            const { left_id, right_id, ...props } = current;
            return props;
        }
        return null;
    }
    public current(hop: number = 0): RelationshipRecord | null {
        return super.current(hop) as RelationshipRecord | null;
    }
}

export default RelationshipData;
