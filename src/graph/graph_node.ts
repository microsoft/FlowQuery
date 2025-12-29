import Runner from "../compute/runner";
import ASTNode from "../parsing/ast_node";

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
    public async data(): Promise<Record<string, any>[]> {
        if (this._statement === null) {
            throw new Error("Statement is null");
        }
        const runner = new Runner(null, this._statement);
        await runner.run();
        return runner.results;
    }
}

export default GraphNode;
