import Database from "../../graph/database";
import Relationship from "../../graph/relationship";
import ASTNode from "../ast_node";
import Operation from "./operation";

class CreateRelationship extends Operation {
    private _relationship: Relationship | null = null;
    private _statement: ASTNode | null = null;
    constructor(relationship: Relationship, statement: ASTNode) {
        super();
        this._relationship = relationship;
        this._statement = statement;
    }
    public get relationship(): Relationship | null {
        return this._relationship;
    }
    public get statement(): ASTNode | null {
        return this._statement;
    }
    public run(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                if (this._relationship === null) {
                    throw new Error("Relationship is null");
                }
                const db = Database.getInstance();
                db.addRelationship(this._relationship, this._statement!);
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
