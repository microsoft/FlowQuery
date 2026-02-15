import Data from "./data";

export type RelationshipRecord = { left_id: string; right_id: string } & Record<string, any>;

class RelationshipData extends Data {
    constructor(records: RelationshipRecord[] = []) {
        super(records);
        super._buildIndex("left_id");
        super._buildIndex("right_id");
    }
    public find(id: string, hop: number = 0, direction: "left" | "right" = "right"): boolean {
        return super._find(id, hop, direction === "left" ? "right_id" : "left_id");
    }
    /*
    ** Get the properties of the current relationship record
    '' excluding the left_id and right_id fields
    */
    public properties(): Record<string, any> | null {
        const current = this.current();
        if (current) {
            const { left_id, right_id, _type, ...props } = current;
            return props;
        }
        return null;
    }
    public current(hop: number = 0): RelationshipRecord | null {
        return super.current(hop) as RelationshipRecord | null;
    }
}

export default RelationshipData;
