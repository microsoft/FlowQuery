import ASTNode from "../ast_node";

class GraphNode {
    private _label: string | null = null;
    private _statement: ASTNode | null = null;
    constructor(label: string) {
        this._label = label;
    }
    public set statement(statement: ASTNode | null) {
        this._statement = statement;
    }
    public get statement(): ASTNode | null {
        return this._statement;
    }
    public get label(): string | null {
        return this._label;
    }
}

export default GraphNode;
