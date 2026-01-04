import Relationship from "./relationship";
import { RelationshipRecord } from "./relationship_data";

class RelationshipMatchCollector {
    private _matches: RelationshipRecord[] = [];

    public push(match: RelationshipRecord): void {
        this._matches.push(match);
    }
    public pop(): RelationshipRecord | undefined {
        return this._matches.pop();
    }
    public value(): RelationshipRecord | RelationshipRecord[] | null {
        if (this._matches.length === 0) {
            return null;
        } else if (this._matches.length === 1) {
            return this._matches[0];
        } else {
            return this._matches;
        }
    }
}

export default RelationshipMatchCollector;
