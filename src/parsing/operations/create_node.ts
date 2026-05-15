import Database from "../../graph/database";
import Node from "../../graph/node";
import ASTNode from "../ast_node";
import Operation from "./operation";

class CreateNode extends Operation {
    private _node: Node | null = null;
    private _statement: ASTNode | null = null;
    private _isStatic: boolean = false;
    private _refreshEveryMs: number | null = null;
    constructor(
        node: Node,
        statement: ASTNode,
        isStatic: boolean = false,
        refreshEveryMs: number | null = null
    ) {
        super();
        this._node = node;
        this._statement = statement;
        this._isStatic = isStatic;
        this._refreshEveryMs = refreshEveryMs;
    }
    public get node(): Node | null {
        return this._node;
    }
    public get statement(): ASTNode | null {
        return this._statement;
    }
    public get isStatic(): boolean {
        return this._isStatic;
    }
    public get refreshEveryMs(): number | null {
        return this._refreshEveryMs;
    }
    public run(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                if (this._node === null) {
                    throw new Error("Node is null");
                }
                const db: Database = Database.getInstance();
                db.addNode(this._node, this._statement!, this._isStatic, this._refreshEveryMs);
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
