import ASTNode from "../ast_node";
import Function from "./function";
import String from "../expressions/string";

class Join extends Function {
    constructor() {
        super("join");
        this._expectedParameterCount = 2;
    }
    public set parameters(nodes: ASTNode[]) {
        if(nodes.length === 1) {
            nodes.push(new String(""));
        }
        super.parameters = nodes;
    }
    public value(): any {
        const array = this.getChildren()[0].value();
        const delimiter = this.getChildren()[1].value();
        if (!Array.isArray(array) || typeof delimiter !== "string") {
            throw new Error("Invalid arguments for join function");
        }
        return array.join(delimiter);
    }
}

export default Join;