import { FunctionDef } from "./function_metadata";
import PredicateFunction from "./predicate_function";

@FunctionDef({
    description:
        "Returns true if exactly one element in the list satisfies the condition. Uses syntax: single(variable IN list WHERE condition)",
    category: "predicate",
    parameters: [
        { name: "variable", description: "Variable name to bind each element", type: "string" },
        { name: "list", description: "List to iterate over", type: "array" },
        {
            name: "where",
            description: "Condition to test for each element",
            type: "boolean",
        },
    ],
    output: {
        description: "True if exactly one element satisfies the condition",
        type: "boolean",
        example: true,
    },
    examples: [
        "RETURN single(n IN [1, 2, 3] WHERE n > 2)",
        "WITH [1, 2, 3] AS nums RETURN single(n IN nums WHERE n = 2)",
    ],
})
class PredicateSingle extends PredicateFunction {
    constructor() {
        super("single");
    }

    public value(): any {
        this.reference.referred = this._valueHolder;
        const array = this.array.value();
        if (array === null || !Array.isArray(array)) {
            return false;
        }
        let count = 0;
        for (let i = 0; i < array.length; i++) {
            this._valueHolder.holder = array[i];
            if (this.where !== null && this.where.value()) {
                count++;
                if (count > 1) return false;
            }
        }
        return count === 1;
    }
}

export default PredicateSingle;
