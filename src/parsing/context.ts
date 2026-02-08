import ASTNode from "./ast_node";

/**
 * Maintains a stack of AST nodes to track parsing context.
 *
 * Used during parsing to maintain the current context and check for specific node types
 * in the parsing hierarchy, which helps with context-sensitive parsing decisions.
 *
 * @example
 * ```typescript
 * const context = new Context();
 * context.push(node);
 * const hasReturn = context.containsType(Return);
 * ```
 */
class Context {
    private nodes: ASTNode[] = [];

    /**
     * Pushes a node onto the context stack.
     *
     * @param node - The AST node to push
     */
    public push(node: ASTNode): void {
        this.nodes.push(node);
    }

    /**
     * Pops the top node from the context stack.
     *
     * @returns The popped node, or undefined if the stack is empty
     */
    public pop(): ASTNode | undefined {
        return this.nodes.pop();
    }

    /**
     * Checks if the nodes stack contains a node of the specified type.
     *
     * @param type - The constructor of the node type to search for
     * @returns True if a node of the specified type is found in the stack, false otherwise
     */
    public containsType(type: new (...args: any[]) => ASTNode): boolean {
        return this.nodes.some((v) => v instanceof type);
    }

    public clone(): Context {
        const newContext = new Context();
        newContext.nodes = [...this.nodes];
        return newContext;
    }
}

export default Context;
