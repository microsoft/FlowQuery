import ASTNode from "./ast_node";
import Context from "./context";

class ParserState {
    private _variables: Map<string, ASTNode> = new Map();
    private _context: Context = new Context();
    private _returns: number = 0;

    public get variables(): Map<string, ASTNode> {
        return this._variables;
    }

    public get context(): Context {
        return this._context;
    }

    public get returns(): number {
        return this._returns;
    }
    public incrementReturns(): void {
        this._returns++;
    }
}

export default ParserState;
