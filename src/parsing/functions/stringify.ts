import ASTNode from "../ast_node";
import Function from "./function";
import Number from "../expressions/number";

class Stringify extends Function {
    constructor() {
        super("stringify");
        this._expectedParameterCount = 2;
    }
    public set parameters(nodes: ASTNode[]) {
        if(nodes.length === 1) {
            nodes.push(new Number("3")); // Default to 3 if only one parameter is provided
        }
        super.parameters = nodes;
    }
    public value(): any {
        const value = this.getChildren()[0].value();
        const indent = parseInt(this.getChildren()[1].value());
        if (typeof value !== "object") {
            throw new Error("Invalid argument for stringify function");
        }
        return JSON.stringify(value, null, indent);
    }
}

export default Stringify;