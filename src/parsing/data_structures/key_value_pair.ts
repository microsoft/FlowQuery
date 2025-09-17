import ASTNode from "../ast_node";
import String from "../expressions/string";

class KeyValuePair extends ASTNode {
    constructor(key: string, value: ASTNode) {
        super();
        this.addChild(new String(key));
        this.addChild(value);
    }
    public get key(): string {
        return this.children[0].value();
    }
    public get _value(): any {
        return this.children[1].value();
    }
    public toString(): string {
        return `KeyValuePair`;
    }
}

export default KeyValuePair;