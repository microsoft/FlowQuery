import ASTNode from "../ast_node";

/**
 * Base class for all FlowQuery operations.
 *
 * Operations represent the main statements in FlowQuery (WITH, UNWIND, RETURN, LOAD, WHERE).
 * They form a linked list structure and can be executed sequentially.
 *
 * @abstract
 */
abstract class Operation extends ASTNode {
    private _previous: Operation | null = null;
    private _next: Operation | null = null;

    /**
     * Creates a new Operation instance.
     */
    constructor() {
        super();
    }
    public get previous(): Operation | null {
        return this._previous;
    }
    public set previous(value: Operation | null) {
        this._previous = value;
    }
    public get next(): Operation | null {
        return this._next;
    }
    public set next(value: Operation | null) {
        this._next = value;
    }
    public addSibling(operation: Operation): void {
        this._parent?.addChild(operation);
        operation.previous = this;
        this.next = operation;
    }
    public get isLast(): boolean {
        return this._next === null;
    }

    /**
     * Executes this operation. Must be implemented by subclasses.
     *
     * @returns A promise that resolves when the operation completes
     * @throws {Error} If not implemented by subclass
     */
    public async run(): Promise<void> {
        throw new Error("Not implemented");
    }

    /**
     * Finishes execution by calling finish on the next operation in the chain.
     *
     * @returns A promise that resolves when all operations finish
     */
    public async finish(): Promise<void> {
        await this.next?.finish();
    }
    public async initialize(): Promise<void> {
        await this.next?.initialize();
    }
    public reset(): void {}
    public get results(): Record<string, any>[] {
        throw new Error("Not implemented");
    }
}

export default Operation;
