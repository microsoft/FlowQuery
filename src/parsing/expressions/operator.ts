import ASTNode from "../ast_node";

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
        return this.lhs.value() === this.rhs.value() ? 1 : 0;
    }
}

class NotEquals extends Operator {
    constructor() {
        super(0, true);
    }
    public value(): number {
        return this.lhs.value() !== this.rhs.value() ? 1 : 0;
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

export {
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
};
