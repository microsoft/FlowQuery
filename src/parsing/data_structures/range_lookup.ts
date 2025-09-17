import ASTNode from "../ast_node";

class RangeLookup extends ASTNode {
    constructor() {
        super();
    }
    public set from(from: ASTNode) {
        this.addChild(from);
    }
    public get from(): ASTNode {
        return this.children[0];
    }
    public set to(to: ASTNode) {
        this.addChild(to);
    }
    public get to(): ASTNode {
        return this.children[1];
    }
    public set variable(variable: ASTNode) {
        this.addChild(variable);
    }
    public get variable(): ASTNode {
        return this.children[2];
    }
    public isOperand(): boolean {
        return true;
    }
    public value(): any {
        const array: any[] = this.variable.value();
        const from = this.from.value() || 0;
        const to = this.to.value() || array.length;
        return this.variable.value().slice(from, to);
    }
}

export default RangeLookup;