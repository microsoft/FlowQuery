import ASTNode from "../ast_node";

class When extends ASTNode {
    constructor() {
        super();
    }
    public value(): boolean {
        return this.getChildren()[0].value();
    }
}

export default When;