import ASTNode from "../ast_node";
import Else from "./else";
import When from "./when";
import Then from "./then";

class Case extends ASTNode {
    constructor() {
        super();
    }

    public value(): any {
        let i = 0;
        let child = this.getChildren()[i];
        while (child instanceof When) {
            const then = (this.getChildren()[i+1] as Then);
            if (child.value()) {
                return then.value();
            }
            i += 2;
            child = this.getChildren()[i];
        }
        return (child as Else).value();
    }
}

export default Case;