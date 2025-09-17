import ASTNode from "./ast_node";

class Context {
    private stack: ASTNode[] = [];
    public push(node: ASTNode): void {
        this.stack.push(node);
    }
    public pop(): ASTNode | undefined {
        return this.stack.pop();
    }
    public containsType(type: new (...args: any[]) => ASTNode): boolean {
        return this.stack.some((v) => v instanceof type);
    }
}

export default Context;