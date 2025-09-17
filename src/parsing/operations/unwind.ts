import Operation from "./operation";
import Expression from "../expressions/expression";

class Unwind extends Operation {
    private _value: any;
    constructor(expression: Expression) {
        super();
        this.addChild(expression);
    }
    public get expression(): Expression {
        return this.children[0] as Expression;
    }
    public get as(): string {
        return this.children[1].value as unknown as string;
    }
    public async run(): Promise<void> {
        const expression = this.expression.value();
        if(!(Array.isArray(expression))) {
            throw new Error('Expected array');
        }
        for(let i = 0; i < expression.length; i++) {
            this._value = expression[i];
            await this.next?.run();
        }
        this.next?.reset();
    }
    public value(): any {
        return this._value;
    }
}

export default Unwind;