import { FunctionDef } from "./function_metadata";
import PredicateFunction from "./predicate_function";

@FunctionDef({
    description:
        "Returns true if all elements in the list satisfy the condition. Uses syntax: all(variable IN list WHERE condition)",
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
        description: "True if all elements satisfy the condition",
        type: "boolean",
        example: true,
    },
    examples: [
        "RETURN all(n IN [2, 4, 6] WHERE n > 0)",
        "WITH [1, 2, 3] AS nums RETURN all(n IN nums WHERE n > 0)",
    ],
})
class PredicateAll extends PredicateFunction {
    constructor() {
        super("all");
    }

    public value(): any {
        this.reference.referred = this._valueHolder;
        const array = this.array.value();
        if (array === null || !Array.isArray(array)) {
            return true;
        }
        for (let i = 0; i < array.length; i++) {
            this._valueHolder.holder = array[i];
            if (this.where !== null && !this.where.value()) {
                return false;
            }
        }
        return true;
    }
}

export default PredicateAll;
