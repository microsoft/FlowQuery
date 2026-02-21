import Relationship from "./relationship";

export type RelationshipMatchRecord = {
    type: string;
    startNode: Record<string, any>;
    endNode: Record<string, any> | null;
    properties: Record<string, any>;
    [key: string]: any;
};

class RelationshipMatchCollector {
    private _matches: RelationshipMatchRecord[] = [];
    private _nodeIds: Array<string> = [];

    public push(relationship: Relationship, traversalId: string): RelationshipMatchRecord {
        const data = relationship.getData();
        const currentRecord = data?.current();
        const actualType =
            currentRecord && "_type" in currentRecord ? currentRecord["_type"] : relationship.type!;
        const relProperties = data?.properties() as Record<string, any>;
        const match: RelationshipMatchRecord = {
            ...(relProperties || {}),
            type: actualType,
            startNode: relationship.source?.value() || {},
            endNode: null,
            properties: relProperties,
        };
        this._matches.push(match);
        this._nodeIds.push(traversalId);
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
            const _match = this._matches[0];
            return _match;
        } else {
            const _matches = this._matches;
            return _matches;
        }
    }
    public get matches(): RelationshipMatchRecord[] {
        return this._matches;
    }
    /*
     ** Checks if traversing to the given node id would form a cycle
     ** in the current traversal path
     */
    public isCircular(nextId: string): boolean {
        return this._nodeIds.includes(nextId);
    }
}

export default RelationshipMatchCollector;
