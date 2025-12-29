import ASTNode from "../ast_node";
import Database from "../graph/database";
import GraphNode from "../graph/graph_node";
import Operation from "./operation";

class CreateNode extends Operation {
    private _node: GraphNode | null = null;
    constructor(node: GraphNode | null) {
        super();
        this._node = node;
    }
    public get node(): GraphNode | null {
        return this._node;
    }
    public run(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                if (this._node === null) {
                    throw new Error("Node is null");
                }
                const db: Database = Database.getInstance();
                db.addNode(this._node);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }
}

export default CreateNode;
