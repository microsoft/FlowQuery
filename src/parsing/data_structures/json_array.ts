import ASTNode from "../ast_node";

class JSONArray extends ASTNode {
    public addValue(value: ASTNode): void {
        this.addChild(value);
    }
    public value(): any[] {
        return this.children.map(child => child.value());
    }
}

export default JSONArray;