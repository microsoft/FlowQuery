import Relationship from "./relationship";

export type RelationshipMatchRecord = {
    type: string;
    startNode: Record<string, any>;
    endNode: Record<string, any> | null;
    properties: Record<string, any>;
};

class RelationshipMatchCollector {
    private _matches: RelationshipMatchRecord[] = [];
    private _nodeIds: Array<string> = [];

    public push(relationship: Relationship): RelationshipMatchRecord {
        const match: RelationshipMatchRecord = {
            type: relationship.type!,
            startNode: relationship.source?.value() || {},
            endNode: null,
            properties: relationship.properties,
        };
        this._matches.push(match);
        this._nodeIds.push(match.startNode.id);
        return match;
    }
    public set endNode(node: any) {
        if (this._matches.length > 0) {
            this._matches[this._matches.length - 1].endNode = node.value();
        }
    }
    public pop(): RelationshipMatchRecord | undefined {
        this._nodeIds.pop();
        return this._matches.pop();
    }
    public value(): RelationshipMatchRecord | RelationshipMatchRecord[] | null {
        if (this._matches.length === 0) {
            return null;
        } else if (this._matches.length === 1) {
            return this._matches[0];
        } else {
            return this._matches;
        }
    }
    /*
     ** Checks if the collected relationships form a circular pattern
     ** meaning the same node id occur more than 2 times in the collected matches
     */
    public isCircular(): boolean {
        if (this._nodeIds.length < 3) {
            return false;
        }
        const counts: Record<string, number> = {};
        for (const id of this._nodeIds) {
            counts[id] = (counts[id] || 0) + 1;
            if (counts[id] > 2) {
                return true;
            }
        }
        return false;
    }
}

export default RelationshipMatchCollector;
