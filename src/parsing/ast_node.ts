class ASTNode {
    protected _parent: ASTNode | null = null;
    protected children: ASTNode[] = [];

    public addChild(child: ASTNode): void {
        child._parent = this;
        this.children.push(child);
    }

    public firstChild(): ASTNode {
        if(this.children.length === 0) {
            throw new Error('Expected child');
        }
        return this.children[0];
    }

    public lastChild(): ASTNode {
        if(this.children.length === 0) {
            throw new Error('Expected child');
        }
        return this.children[this.children.length - 1];
    }

    public getChildren(): ASTNode[] {
        return this.children;
    }

    public childCount(): number {
        return this.children.length;
    }

    public value(): any {
        return null;
    }

    public isOperator(): boolean {
        return false;
    }

    public isOperand(): boolean {
        return !this.isOperator();
    }

    public get precedence(): number {
        return 0;
    }

    public get leftAssociative(): boolean {
        return false;
    }

    public print(): string {
        return Array.from(this._print(0)).join('\n');
    }

    private *_print(indent: number): Generator<string> {
        if(indent === 0) {
            yield this.constructor.name;
        } else if(indent > 0) {
            yield '-'.repeat(indent) + ` ${this.toString()}`;
        }
        for(const child of this.children) {
            yield* child._print(indent + 1);
        }
    }

    protected toString(): string {
        return this.constructor.name;
    }
}

export default ASTNode;