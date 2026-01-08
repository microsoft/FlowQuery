import Relationship from "./relationship";

export type RelationshipMatchRecord = {
    type: string;
    startNode: Record<string, any>;
    endNode: Record<string, any> | null;
    properties: Record<string, any>;
};

class RelationshipMatchCollector {
    private _matches: RelationshipMatchRecord[] = [];

    public push(relationship: Relationship): RelationshipMatchRecord {
        const match: RelationshipMatchRecord = {
            type: relationship.type!,
            startNode: relationship.source?.value() || {},
            endNode: null,
            properties: relationship.properties,
        };
        this._matches.push(match);
        return match;
    }
    public set endNode(node: any) {
        if (this._matches.length > 0) {
            this._matches[this._matches.length - 1].endNode = node.value();
        }
    }
    public pop(): RelationshipMatchRecord | undefined {
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
     ** meaning the same node id occur more than once in the pattern
     */
    public isCircular(): boolean {
        if (this._matches.length < 2) {
            return false;
        }
        const ids: Array<string> = Array.from(this.nodeIds());
        const unique: Set<string> = new Set();
        for (const id of ids) {
            if (unique.has(id)) {
                return true;
            }
            unique.add(id);
        }
        return false;
    }
    private *nodeIds(): Generator<string> {
        for (let i = 0; i < this._matches.length; i++) {
            const match = this._matches[i];
            if (match.startNode && match.startNode.id) {
                yield match.startNode.id;
            }
        }
    }
}

export default RelationshipMatchCollector;
