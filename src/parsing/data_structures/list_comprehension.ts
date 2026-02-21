import ASTNode from "../ast_node";
import Expression from "../expressions/expression";
import Reference from "../expressions/reference";
import ValueHolder from "../functions/value_holder";
import Where from "../operations/where";

/**
 * Represents a Cypher-style list comprehension in the AST.
 *
 * List comprehensions allow mapping and filtering arrays inline using the syntax:
 *   [variable IN list | expression]
 *   [variable IN list WHERE condition | expression]
 *   [variable IN list WHERE condition]
 *   [variable IN list]
 *
 * Children layout:
 *   - Child 0: Reference (iteration variable)
 *   - Child 1: Expression (source array)
 *   - Child 2 (optional): Where (filter condition) or Expression (mapping)
 *   - Child 3 (optional): Expression (mapping, when Where is child 2)
 *
 * @example
 * ```typescript
 * // [n IN [1, 2, 3] WHERE n > 1 | n * 2]
 * // => [4, 6]
 * ```
 */
class ListComprehension extends ASTNode {
    private _valueHolder: ValueHolder = new ValueHolder();

    /**
     * The iteration variable reference.
     */
    public get reference(): Reference {
        return this.firstChild() as Reference;
    }

    /**
     * The source array expression (unwrapped from its Expression wrapper).
     */
    public get array(): ASTNode {
        return this.getChildren()[1].firstChild();
    }

    /**
     * The mapping expression applied to each element, or null if not specified.
     * When absent, the iteration variable value itself is returned.
     */
    public get _return(): Expression | null {
        const children = this.getChildren();
        if (children.length <= 2) return null;
        const last = children[children.length - 1];
        if (last instanceof Where) return null;
        return last as Expression;
    }

    /**
     * The optional WHERE filter condition.
     */
    public get where(): Where | null {
        for (const child of this.getChildren()) {
            if (child instanceof Where) return child as Where;
        }
        return null;
    }

    /**
     * Evaluates the list comprehension by iterating over the source array,
     * applying the optional filter, and mapping each element through the
     * return expression.
     *
     * @returns The resulting filtered/mapped array
     */
    public value(): any[] {
        this.reference.referred = this._valueHolder;
        const array = this.array.value();
        if (array === null || !Array.isArray(array)) {
            throw new Error("Expected array for list comprehension");
        }
        const result: any[] = [];
        for (let i = 0; i < array.length; i++) {
            this._valueHolder.holder = array[i];
            if (this.where === null || this.where.value()) {
                if (this._return !== null) {
                    result.push(this._return.value());
                } else {
                    result.push(array[i]);
                }
            }
        }
        return result;
    }

    public toString(): string {
        return "ListComprehension";
    }
}

export default ListComprehension;
