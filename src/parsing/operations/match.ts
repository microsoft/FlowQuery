import Database from "../../graph/database";
import Node from "../../graph/node";
import Pattern from "../../graph/pattern";
import PhysicalNode from "../../graph/physical_node";
import Operation from "./operation";

class Match extends Operation {
    private _pattern: Pattern;

    constructor(pattern: Pattern) {
        super();
        this._pattern = pattern;
    }
    public get pattern(): Pattern {
        return this._pattern;
    }
    public async run(): Promise<void> {
        const db = Database.getInstance();
        const node = this.pattern.startNode;
        const found: PhysicalNode | null = db.getNode(node);
        if (found === null) {
            return;
        }
        const data = await found.data();
        for (const record of data) {
            node.setValue(record);
            await this.next?.run();
        }
    }
}

export default Match;
