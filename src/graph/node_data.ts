import Data from "./data";

class NodeData extends Data {
    constructor(records: Record<string, any>[] = []) {
        super(records);
        super._buildIndex("id");
    }
    public find(id: string): boolean {
        return super._find(id);
    }
}

export default NodeData;
