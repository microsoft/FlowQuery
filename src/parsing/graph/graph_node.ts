import Runner from "../../compute/runner";

class GraphNode {
    private _label: string | null = null;
    private _statement: Runner | null = null;
    constructor(label: string) {
        this._label = label;
    }
    public set statement(statement: Runner | null) {
        this._statement = statement;
    }
    public get statement(): Runner | null {
        return this._statement;
    }
    public get label(): string | null {
        return this._label;
    }
}

export default GraphNode;
