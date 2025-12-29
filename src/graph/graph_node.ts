import Runner from "../compute/runner";
import ASTNode from "../parsing/ast_node";

class GraphNode extends ASTNode {
    private _identifier: string | null = null;
    private _label: string | null = null;
    private _statement: ASTNode | null = null;
    private _value: any = null;
    constructor(label: string | null = null) {
        super();
        this._label = label;
    }
    public set statement(statement: ASTNode | null) {
        this._statement = statement;
    }
    public get statement(): ASTNode | null {
        return this._statement;
    }
    public set identifier(identifier: string | null) {
        this._identifier = identifier;
    }
    public get identifier(): string | null {
        return this._identifier;
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
    public setValue(value: any): void {
        this._value = value;
    }
    public value(): any {
        return this._value;
    }
}

export default GraphNode;
