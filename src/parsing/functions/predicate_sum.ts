import PredicateFunction from "./predicate_function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Calculates the sum of values in an array with optional filtering. Uses list comprehension syntax: sum(variable IN array [WHERE condition] | expression)",
    category: "predicate",
    parameters: [
        { name: "variable", description: "Variable name to bind each element", type: "string" },
        { name: "array", description: "Array to iterate over", type: "array" },
        { name: "expression", description: "Expression to sum for each element", type: "any" },
        { name: "where", description: "Optional filter condition", type: "boolean", required: false }
    ],
    output: { description: "Sum of the evaluated expressions", type: "number", example: 6 },
    examples: ["WITH [1, 2, 3] AS nums RETURN sum(n IN nums | n)", "WITH [1, 2, 3, 4] AS nums RETURN sum(n IN nums WHERE n > 1 | n * 2)"]
})
class PredicateSum extends PredicateFunction {
    constructor() {
        super("sum");
    }

    public value(): any {
        this.reference.referred = this._valueHolder;
        const array = this.array.value();
        if (array === null || !Array.isArray(array)) {
            throw new Error("Invalid array for sum function");
        }
        let _sum: any | null = null;
        for(let i = 0; i < array.length; i++) {
            this._valueHolder.holder = array[i];
            if (this.where === null || this.where.value()) {
                if (_sum === null) {
                    _sum = this._return.value();
                } else {
                    _sum += this._return.value();
                }
            }
        }
        return _sum;
    }
}

export default PredicateSum;