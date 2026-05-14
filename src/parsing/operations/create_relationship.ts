import Database from "../../graph/database";
import Relationship from "../../graph/relationship";
import ASTNode from "../ast_node";
import Operation from "./operation";

class CreateRelationship extends Operation {
    private _relationship: Relationship | null = null;
    private _statement: ASTNode | null = null;
    private _isStatic: boolean = false;
    private _refreshEveryMs: number | null = null;
    constructor(
        relationship: Relationship,
        statement: ASTNode,
        isStatic: boolean = false,
        refreshEveryMs: number | null = null
    ) {
        super();
        this._relationship = relationship;
        this._statement = statement;
        this._isStatic = isStatic;
        this._refreshEveryMs = refreshEveryMs;
    }
    public get relationship(): Relationship | null {
        return this._relationship;
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
                if (this._relationship === null) {
                    throw new Error("Relationship is null");
                }
                const db = Database.getInstance();
                db.addRelationship(
                    this._relationship,
                    this._statement!,
                    this._isStatic,
                    this._refreshEveryMs
                );
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
export default CreateRelationship;
