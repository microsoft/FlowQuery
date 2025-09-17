import ASTNode from "../ast_node";

class Lookup extends ASTNode {
    constructor() {
        super();
    }
    public set index(index: ASTNode) {
        this.addChild(index);
    }
    public get index(): ASTNode {
        return this.children[0];
    }
    public set variable(variable: ASTNode) {
        this.addChild(variable);
    }
    public get variable(): ASTNode {
        return this.children[1];
    }
    public isOperand(): boolean {
        return true;
    }
    public value(): any {
        return this.variable.value()[this.index.value()];
    }
}

export default Lookup;