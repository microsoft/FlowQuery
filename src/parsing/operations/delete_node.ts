import Database from "../../graph/database";
import Node from "../../graph/node";
import Operation from "./operation";

class DeleteNode extends Operation {
    private _node: Node | null = null;
    constructor(node: Node) {
        super();
        this._node = node;
    }
    public get node(): Node | null {
        return this._node;
    }
    public run(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                if (this._node === null) {
                    throw new Error("Node is null");
                }
                const db: Database = Database.getInstance();
                db.removeNode(this._node);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }
    public get results(): Record<string, any>[] {
        return [];
    }
}

export default DeleteNode;
