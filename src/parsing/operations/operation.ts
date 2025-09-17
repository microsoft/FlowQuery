import ASTNode from "../ast_node";

abstract class Operation extends ASTNode {
    private _previous: Operation | null = null;
    private _next: Operation | null = null;
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
    public async run(): Promise<void> {
        throw new Error('Not implemented');
    }
    public async finish(): Promise<void> {
        await this.next?.finish();
    }
    public reset(): void {
        ;
    }
    public get results(): Record<string, any>[] {
        throw new Error('Not implemented');
    }
}

export default Operation;