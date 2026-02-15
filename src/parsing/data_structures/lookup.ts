import ASTNode from "../ast_node";

/**
 * Represents a lookup operation (array/object indexing) in the AST.
 *
 * Lookups access elements from arrays or properties from objects using an index or key.
 *
 * @example
 * ```typescript
 * // For array[0] or obj.property or obj["key"]
 * const lookup = new Lookup();
 * lookup.variable = arrayOrObjNode;
 * lookup.index = indexNode;
 * ```
 */
class Lookup extends ASTNode {
    constructor() {
        super();
    }
    public set index(index: ASTNode) {
        this.addChild(index);
    }
    public get index(): ASTNode {
        return this.children[0];
    }
    public set variable(variable: ASTNode) {
        this.addChild(variable);
    }
    public get variable(): ASTNode {
        return this.children[1];
    }
    public isOperand(): boolean {
        return true;
    }
    public value(): any {
        const obj = this.variable.value();
        if (obj === null || obj === undefined) {
            return null;
        }
        return obj[this.index.value()];
    }
}

export default Lookup;
