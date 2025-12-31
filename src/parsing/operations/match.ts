import Database from "../../graph/database";
import Node from "../../graph/node";
import PhysicalNode from "../../graph/physical_node";
import Operation from "./operation";

class Match extends Operation {
    private _node: Node;

    constructor(node: Node) {
        super();
        this._node = node;
    }
    public get node(): Node {
        return this._node;
    }
    public async run(): Promise<void> {
        const db = Database.getInstance();
        const found: PhysicalNode | null = db.getNode(this._node);
        if (found === null) {
            return;
        }
        const data = await found.data();
        for (const record of data) {
            this._node.setValue(record);
            await this.next?.run();
        }
    }
}

export default Match;
