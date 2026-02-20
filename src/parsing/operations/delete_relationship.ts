import Database from "../../graph/database";
import Relationship from "../../graph/relationship";
import Operation from "./operation";

class DeleteRelationship extends Operation {
    private _relationship: Relationship | null = null;
    constructor(relationship: Relationship) {
        super();
        this._relationship = relationship;
    }
    public get relationship(): Relationship | null {
        return this._relationship;
    }
    public run(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                if (this._relationship === null) {
                    throw new Error("Relationship is null");
                }
                const db = Database.getInstance();
                db.removeRelationship(this._relationship);
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
export default DeleteRelationship;
