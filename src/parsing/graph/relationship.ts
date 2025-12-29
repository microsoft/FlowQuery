import ASTNode from "../ast_node";

class Relationship {
    private _from: string | null = null; // label of the starting node
    private _to: string | null = null; // label of the ending node
    private _type: string | null = null;
    private _statement: ASTNode | null = null;
    public set type(type: string | null) {
        this._type = type;
    }
    public set from(from: string | null) {
        this._from = from;
    }
    public get from(): string | null {
        return this._from;
    }
    public set to(to: string | null) {
        this._to = to;
    }
    public get to(): string | null {
        return this._to;
    }
    public get type(): string | null {
        return this._type;
    }
    public set statement(statement: ASTNode | null) {
        this._statement = statement;
    }
    public get statement(): ASTNode | null {
        return this._statement;
    }
}

export default Relationship;
