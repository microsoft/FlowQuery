import Data from "./data";

class NodeData extends Data {
    constructor(records: Record<string, any>[] = []) {
        super(records);
        super._buildIndex("id");
    }
    public find(id: string, hop: number = 0): boolean {
        return super._find(id, hop);
    }
}

export default NodeData;
