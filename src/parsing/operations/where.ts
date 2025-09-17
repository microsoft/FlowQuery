import Operation from "./operation";
import Expression from "../expressions/expression";

class Where extends Operation {
    constructor(expression: Expression) {
        super();
        this.addChild(expression);
    }
    public get expression(): Expression {
        return this.children[0] as Expression;
    }
    public async run(): Promise<void> {
        if(this.expression.value()) {
            await this.next?.run();
        }
    }
    public value(): any {
        return this.expression.value();
    }
}

export default Where;