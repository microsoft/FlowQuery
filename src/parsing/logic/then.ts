import ASTNode from "../ast_node";

class Then extends ASTNode {
    constructor() {
        super();
    }
    public value(): any {
        return this.getChildren()[0].value();
    }
}

export default Then;