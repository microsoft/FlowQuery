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
    public current(hop: number = 0): NodeRecord | null {
        return super.current(hop) as NodeRecord | null;
    }
}

export default NodeData;
