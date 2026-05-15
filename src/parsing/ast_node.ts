/**
 * Represents a node in the Abstract Syntax Tree (AST).
 *
 * The AST is a tree representation of the parsed FlowQuery statement structure.
 * Each node can have children and maintains a reference to its parent.
 *
 * @example
 * ```typescript
 * const root = new ASTNode();
 * const child = new ASTNode();
 * root.addChild(child);
 * ```
 */
class ASTNode {
    protected _parent: ASTNode | null = null;
    protected children: ASTNode[] = [];

    /**
     * Adds a child node to this node and sets the child's parent reference.
     *
     * @param child - The child node to add
     */
    public addChild(child: ASTNode): void {
        child._parent = this;
        this.children.push(child);
    }

    /**
     * Replaces an existing child node with a new node in-place.  The
     * new node takes the old node's position and parent reference.
     *
     * @param oldChild - The existing child to replace
     * @param newChild - The replacement node
     * @returns True if the replacement was performed, false otherwise
     */
    public replaceChild(oldChild: ASTNode, newChild: ASTNode): boolean {
        const idx = this.children.indexOf(oldChild);
        if (idx === -1) {
            return false;
        }
        newChild._parent = this;
        this.children[idx] = newChild;
        return true;
    }

    /**
     * Returns the first child node.
     *
     * @returns The first child node
     * @throws {Error} If the node has no children
     */
    public firstChild(): ASTNode {
        if (this.children.length === 0) {
            throw new Error("Expected child");
        }
        return this.children[0];
    }

    /**
     * Returns the last child node.
     *
     * @returns The last child node
     * @throws {Error} If the node has no children
     */
    public lastChild(): ASTNode {
        if (this.children.length === 0) {
            throw new Error("Expected child");
        }
        return this.children[this.children.length - 1];
    }

    /**
     * Returns all child nodes.
     *
     * @returns Array of child nodes
     */
    public getChildren(): ASTNode[] {
        return this.children;
    }

    /**
     * Returns the number of child nodes.
     *
     * @returns The count of children
     */
    public childCount(): number {
        return this.children.length;
    }

    /**
     * Returns the value of this node. Override in subclasses to provide specific values.
     *
     * @returns The node's value, or null if not applicable
     */
    public value(): any {
        return null;
    }

    /**
     * Checks if this node represents an operator.
     *
     * @returns True if this is an operator node, false otherwise
     */
    public isOperator(): boolean {
        return false;
    }

    /**
     * Checks if this node represents an operand (the opposite of an operator).
     *
     * @returns True if this is an operand node, false otherwise
     */
    public isOperand(): boolean {
        return !this.isOperator();
    }

    /**
     * Gets the operator precedence for this node. Higher values indicate higher precedence.
     *
     * @returns The precedence value (0 for non-operators)
     */
    public get precedence(): number {
        return 0;
    }

    /**
     * Indicates whether this operator is left-associative.
     *
     * @returns True if left-associative, false otherwise
     */
    public get leftAssociative(): boolean {
        return false;
    }

    /**
     * Prints a string representation of the AST tree starting from this node.
     *
     * @returns A formatted string showing the tree structure
     */
    public print(): string {
        return Array.from(this._print(0)).join("\n");
    }

    /**
     * Generator function for recursively printing the tree structure.
     *
     * @param indent - The current indentation level
     * @yields Lines representing each node in the tree
     */
    private *_print(indent: number): Generator<string> {
        if (indent === 0) {
            yield this.constructor.name;
        } else if (indent > 0) {
            yield "-".repeat(indent) + ` ${this.toString()}`;
        }
        for (const child of this.children) {
            yield* child._print(indent + 1);
        }
    }

    /**
     * Returns a string representation of this node. Override in subclasses for custom formatting.
     *
     * @returns The string representation
     */
    protected toString(): string {
        return this.constructor.name;
    }
}

export default ASTNode;
