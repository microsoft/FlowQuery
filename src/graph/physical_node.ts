import type Runner from "../compute/runner";
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
    public async data(args: Record<string, any> | null = null): Promise<Record<string, any>[]> {
        if (this._statement === null) {
            throw new Error("Statement is null");
        }
        // Lazy require to avoid a load-time cycle:
        // physical_node -> runner -> parsing -> graph (back to here).
        // Python uses the same idiom (function-local import).
        const RunnerCtor: typeof Runner = require("../compute/runner").default;
        const runner = new RunnerCtor(null, this._statement, args);
        await runner.run();
        return runner.results;
    }
}

export default PhysicalNode;
