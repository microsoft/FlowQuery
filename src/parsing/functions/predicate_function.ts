import ASTNode from "../ast_node";
import Expression from "../expressions/expression";
import Reference from "../expressions/reference";
import Where from "../operations/where";
import ValueHolder from "./value_holder";

class PredicateFunction extends ASTNode {
    private _name: string;
    protected _valueHolder: ValueHolder = new ValueHolder();
    private _hasReturnExpression: boolean = true;

    constructor(name?: string) {
        super();
        this._name = name || this.constructor.name;
    }

    public get name(): string {
        return this._name;
    }

    public get hasReturnExpression(): boolean {
        return this._hasReturnExpression;
    }

    public set hasReturnExpression(value: boolean) {
        this._hasReturnExpression = value;
    }

    protected get reference(): Reference {
        return this.firstChild() as Reference;
    }

    protected get array(): ASTNode {
        return this.getChildren()[1].firstChild();
    }

    protected get _return(): Expression | null {
        if (!this._hasReturnExpression) return null;
        return this.getChildren()[2] as Expression;
    }

    protected get where(): Where | null {
        if (this._hasReturnExpression) {
            if (this.getChildren().length === 4) {
                return this.getChildren()[3] as Where;
            }
        } else {
            if (this.getChildren().length === 3) {
                return this.getChildren()[2] as Where;
            }
        }
        return null;
    }

    public value(): any {
        throw new Error("Method not implemented.");
    }

    public toString(): string {
        return `PredicateFunction (${this._name})`;
    }
}

export default PredicateFunction;
