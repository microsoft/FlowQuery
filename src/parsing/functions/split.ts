import ASTNode from "../ast_node";
import Function from "./function";
import String from "../expressions/string";

class Split extends Function {
    constructor() {
        super("split");
        this._expectedParameterCount = 2;
    }
    public set parameters(nodes: ASTNode[]) {
        if(nodes.length === 1) {
            nodes.push(new String(""));
        }
        super.parameters = nodes;
    }
    public value(): any {
        const str = this.getChildren()[0].value();
        const delimiter = this.getChildren()[1].value();
        if (typeof str !== "string" || typeof delimiter !== "string") {
            throw new Error("Invalid arguments for split function");
        }
        return str.split(delimiter);
    }
}

export default Split;