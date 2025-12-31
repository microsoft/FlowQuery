import Runner from "../compute/runner";
import ASTNode from "../parsing/ast_node";
import Node from "./node";

class PhysicalNode extends Node {
    private _statement: ASTNode | null = null;
    public set statement(statement: ASTNode | null) {
        this._statement = statement;
    }
    public get statement(): ASTNode | null {
        return this._statement;
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

export default PhysicalNode;
