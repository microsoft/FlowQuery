import ASTNode from "../ast_node";

class Else extends ASTNode {
    constructor() {
        super();
    }
    public value(): any {
        return this.getChildren()[0].value();
    }
}

export default Else;