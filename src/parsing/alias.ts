import ASTNode from "./ast_node";

class Alias extends ASTNode {
    private alias: string;
    constructor(alias: string) {
        super();
        this.alias = alias;
    }

    public toString(): string {
        return `Alias (${this.alias})`;
    }

    public getAlias(): string {
        return this.alias;
    }

    public value(): string {
        return this.alias;
    }
}

export default Alias;