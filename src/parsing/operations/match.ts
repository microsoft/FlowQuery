import Database from "../../graph/database";
import GraphNode from "../../graph/graph_node";
import Operation from "./operation";

class Match extends Operation {
    private _node: GraphNode;

    constructor(node: GraphNode) {
        super();
        this._node = node;
    }
    public get node(): GraphNode {
        return this._node;
    }
    public async run(): Promise<void> {
        const db = Database.getInstance();
        const found: GraphNode | null = db.getNode(this._node.label || "");
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
