import Database from "../../graph/database";
import Node from "../../graph/node";
import ASTNode from "../ast_node";
import Operation from "./operation";

class CreateNode extends Operation {
    private _node: Node | null = null;
    private _statement: ASTNode | null = null;
    constructor(node: Node, statement: ASTNode) {
        super();
        this._node = node;
        this._statement = statement;
    }
    public get node(): Node | null {
        return this._node;
    }
    public get statement(): ASTNode | null {
        return this._statement;
    }
    public run(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                if (this._node === null) {
                    throw new Error("Node is null");
                }
                const db: Database = Database.getInstance();
                db.addNode(this._node, this._statement!);
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

export default CreateNode;
