import ASTNode from "../ast_node";
import Identifier from "./identifier";

/**
 * Represents a reference to a previously defined variable or expression.
 *
 * References point to values defined earlier in the query (e.g., in WITH or LOAD statements).
 *
 * @example
 * ```typescript
 * const ref = new Reference("myVar", previousNode);
 * console.log(ref.value()); // Gets value from referred node
 * ```
 */
class Reference extends Identifier {
    private _referred: ASTNode | undefined = undefined;

    /**
     * Creates a new Reference to a variable.
     *
     * @param value - The identifier name
     * @param referred - The node this reference points to (optional)
     */
    constructor(value: string, referred: ASTNode | undefined = undefined) {
        super(value);
        this._referred = referred;
    }
    public get referred(): ASTNode | undefined {
        return this._referred;
    }
    public set referred(node: ASTNode) {
        this._referred = node;
    }
    public toString(): string {
        return `Reference (${this._value})`;
    }
    public value(): any {
        return this._referred?.value();
    }
    public get identifier(): string {
        return this._value;
    }
}

export default Reference;
