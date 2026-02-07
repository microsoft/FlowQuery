import ASTNode from "../ast_node";

function deepEquals(a: any, b: any): boolean {
    if (a === b) return true;
    if (a === null || b === null || a === undefined || b === undefined) return false;
    if (typeof a !== typeof b) return false;
    if (typeof a !== "object") return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!deepEquals(a[i], b[i])) return false;
        }
        return true;
    }
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
        if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
        if (!deepEquals(a[key], b[key])) return false;
    }
    return true;
}

abstract class Operator extends ASTNode {
    private _precedence: number = 0;
    private _leftAssociative: boolean = true;

    constructor(precedence: number, leftAssociative: boolean) {
        super();
        this._precedence = precedence;
        this._leftAssociative = leftAssociative;
    }

    public isOperator(): boolean {
        return true;
    }

    public get precedence(): number {
        return this._precedence;
    }
    public get leftAssociative(): boolean {
        return this._leftAssociative;
    }
    public abstract value(): number;
    public get lhs(): ASTNode {
        return this.getChildren()[0];
    }
    public get rhs(): ASTNode {
        return this.getChildren()[1];
    }
}

class Add extends Operator {
    constructor() {
        super(1, true);
    }
    public value(): number {
        return this.lhs.value() + this.rhs.value();
    }
}

class Subtract extends Operator {
    constructor() {
        super(1, true);
    }
    public value(): number {
        return this.lhs.value() - this.rhs.value();
    }
}

class Multiply extends Operator {
    constructor() {
        super(2, true);
    }
    public value(): number {
        return this.lhs.value() * this.rhs.value();
    }
}

class Divide extends Operator {
    constructor() {
        super(2, true);
    }
    public value(): number {
        return this.lhs.value() / this.rhs.value();
    }
}

class Modulo extends Operator {
    constructor() {
        super(2, true);
    }
    public value(): number {
        return this.lhs.value() % this.rhs.value();
    }
}

class Power extends Operator {
    constructor() {
        super(3, false);
    }
    public value(): number {
        return Math.pow(this.lhs.value(), this.rhs.value());
    }
}

class Equals extends Operator {
    constructor() {
        super(0, true);
    }
    public value(): number {
        return deepEquals(this.lhs.value(), this.rhs.value()) ? 1 : 0;
    }
}

class NotEquals extends Operator {
    constructor() {
        super(0, true);
    }
    public value(): number {
        return !deepEquals(this.lhs.value(), this.rhs.value()) ? 1 : 0;
    }
}

class GreaterThan extends Operator {
    constructor() {
        super(0, true);
    }
    public value(): number {
        return this.lhs.value() > this.rhs.value() ? 1 : 0;
    }
}

class LessThan extends Operator {
    constructor() {
        super(0, true);
    }
    public value(): number {
        return this.lhs.value() < this.rhs.value() ? 1 : 0;
    }
}

class GreaterThanOrEqual extends Operator {
    constructor() {
        super(0, true);
    }
    public value(): number {
        return this.lhs.value() >= this.rhs.value() ? 1 : 0;
    }
}

class LessThanOrEqual extends Operator {
    constructor() {
        super(0, true);
    }
    public value(): number {
        return this.lhs.value() <= this.rhs.value() ? 1 : 0;
    }
}

class And extends Operator {
    constructor() {
        super(-1, true);
    }
    public value(): number {
        return this.lhs.value() && this.rhs.value() ? 1 : 0;
    }
}

class Or extends Operator {
    constructor() {
        super(-1, true);
    }
    public value(): number {
        return this.lhs.value() || this.rhs.value() ? 1 : 0;
    }
}

class Not extends Operator {
    constructor() {
        super(0, true);
    }
    public isOperator(): boolean {
        return false;
    }
    public value(): number {
        return !this.lhs.value() ? 1 : 0;
    }
}

class Is extends Operator {
    constructor() {
        super(-1, true);
    }
    public value(): number {
        return this.lhs.value() == this.rhs.value() ? 1 : 0;
    }
}

class IsNot extends Operator {
    constructor() {
        super(-1, true);
    }
    public value(): number {
        return this.lhs.value() != this.rhs.value() ? 1 : 0;
    }
}

class In extends Operator {
    constructor() {
        super(-1, true);
    }
    public value(): number {
        const list = this.rhs.value();
        if (!Array.isArray(list)) {
            throw new Error("Right operand of IN must be a list");
        }
        return list.includes(this.lhs.value()) ? 1 : 0;
    }
}

class NotIn extends Operator {
    constructor() {
        super(-1, true);
    }
    public value(): number {
        const list = this.rhs.value();
        if (!Array.isArray(list)) {
            throw new Error("Right operand of NOT IN must be a list");
        }
        return list.includes(this.lhs.value()) ? 0 : 1;
    }
}

class Contains extends Operator {
    constructor() {
        super(0, true);
    }
    public value(): number {
        const str = this.lhs.value();
        const search = this.rhs.value();
        if (typeof str !== "string" || typeof search !== "string") {
            throw new Error("CONTAINS requires string operands");
        }
        return str.includes(search) ? 1 : 0;
    }
}

class NotContains extends Operator {
    constructor() {
        super(0, true);
    }
    public value(): number {
        const str = this.lhs.value();
        const search = this.rhs.value();
        if (typeof str !== "string" || typeof search !== "string") {
            throw new Error("NOT CONTAINS requires string operands");
        }
        return str.includes(search) ? 0 : 1;
    }
}

class StartsWith extends Operator {
    constructor() {
        super(0, true);
    }
    public value(): number {
        const str = this.lhs.value();
        const search = this.rhs.value();
        if (typeof str !== "string" || typeof search !== "string") {
            throw new Error("STARTS WITH requires string operands");
        }
        return str.startsWith(search) ? 1 : 0;
    }
}

class NotStartsWith extends Operator {
    constructor() {
        super(0, true);
    }
    public value(): number {
        const str = this.lhs.value();
        const search = this.rhs.value();
        if (typeof str !== "string" || typeof search !== "string") {
            throw new Error("NOT STARTS WITH requires string operands");
        }
        return str.startsWith(search) ? 0 : 1;
    }
}

class EndsWith extends Operator {
    constructor() {
        super(0, true);
    }
    public value(): number {
        const str = this.lhs.value();
        const search = this.rhs.value();
        if (typeof str !== "string" || typeof search !== "string") {
            throw new Error("ENDS WITH requires string operands");
        }
        return str.endsWith(search) ? 1 : 0;
    }
}

class NotEndsWith extends Operator {
    constructor() {
        super(0, true);
    }
    public value(): number {
        const str = this.lhs.value();
        const search = this.rhs.value();
        if (typeof str !== "string" || typeof search !== "string") {
            throw new Error("NOT ENDS WITH requires string operands");
        }
        return str.endsWith(search) ? 0 : 1;
    }
}

export {
    deepEquals,
    Operator,
    Add,
    Subtract,
    Multiply,
    Divide,
    Modulo,
    Power,
    Equals,
    NotEquals,
    GreaterThan,
    LessThan,
    GreaterThanOrEqual,
    LessThanOrEqual,
    And,
    Or,
    Not,
    Is,
    IsNot,
    In,
    NotIn,
    Contains,
    NotContains,
    StartsWith,
    NotStartsWith,
    EndsWith,
    NotEndsWith,
};
