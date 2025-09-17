import ASTNode from "../ast_node";
import AggregateFunction from "../functions/aggregate_function";
import Reference from "./reference";

class Expression extends ASTNode {
    private operators: ASTNode[] = <ASTNode[]>[];
    private output: ASTNode[] = <ASTNode[]>[];
    private _alias: string | null = null;
    private _overridden: any | null = null;
    private _reducers: AggregateFunction[] | null = null;

    public addNode(node: ASTNode): void {
        /* Implements the Shunting Yard algorithm */
        if(node.isOperand()) {
            this.output.push(node);
        } else if(node.isOperator()) {
            const operator1: ASTNode = node;
            while(this.operators.length > 0) {
                let operator2 = this.operators[this.operators.length - 1];
                if(
                    operator2.precedence > operator1.precedence ||
                    (operator2.precedence === operator1.precedence && operator1.leftAssociative)
                ) {
                    this.output.push(operator2);
                    this.operators.pop();
                } else {
                    break;
                }
            }
            this.operators.push(operator1);
        }
    }

    public finish(): void {
        let last: ASTNode | undefined;
        while(last = this.operators.pop()) {
            this.output.push(last);
        };
        this.addChild(this.toTree());
    }

    private toTree(): ASTNode {
        const node = this.output.pop() || new ASTNode();
        if(node.isOperator()) {
            const rhs = this.toTree();
            const lhs = this.toTree();
            node.addChild(lhs);
            node.addChild(rhs);
        } 
        return node;
    }

    public nodesAdded(): boolean {
        return this.operators.length > 0 || this.output.length > 0;
    }

    public value(): any {
        if(this._overridden !== null) {
            return this._overridden;
        }
        if(this.childCount() !== 1) {
            throw new Error('Expected one child');
        }
        return this.children[0].value();
    }

    public setAlias(alias: string): void {
        this._alias = alias;
    }

    public set alias(alias: string) {
        this._alias = alias;
    }

    public get alias(): string | null {
        if(this.firstChild() instanceof Reference && this._alias === null) {
            return (<Reference>this.firstChild()).identifier;
        }
        return this._alias;
    }

    public toString(): string {
        if(this._alias !== null) {
            return `Expression (${this._alias})`;
        } else {
            return 'Expression';
        }
    }
    public reducers(): AggregateFunction[] {
        if(this._reducers === null) {
            this._reducers = [...this._extract_reducers()];
        }
        return this._reducers;
    }
    private *_extract_reducers(node: ASTNode = this): Generator<AggregateFunction> {
        if(node instanceof AggregateFunction) {
            yield node;
        }
        for(const child of node.getChildren()) {
            yield* this._extract_reducers(child);
        }
    }
    public mappable(): boolean {
        return this.reducers().length === 0;
    }
    public has_reducers(): boolean {
        return this.reducers().length > 0;
    }
    public set overridden(value: any) {
        this._overridden = value;
    }
}

export default Expression;