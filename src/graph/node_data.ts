import Data from "./data";

export type NodeRecord = { id: string } & Record<string, any>;

class NodeData extends Data {
    constructor(records: NodeRecord[] = []) {
        super(records);
        super._buildIndex("id");
    }
    public find(id: string, hop: number = 0): boolean {
        return super._find(id, hop);
    }
}

export default NodeData;
