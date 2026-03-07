import { FunctionDef } from "./function_metadata";
import PredicateFunction from "./predicate_function";

@FunctionDef({
    description:
        "Returns true if at least one element in the list satisfies the condition. Uses syntax: any(variable IN list WHERE condition)",
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
        description: "True if any element satisfies the condition",
        type: "boolean",
        example: true,
    },
    examples: [
        "RETURN any(n IN [1, 2, 3] WHERE n > 2)",
        "WITH [1, -1, 2] AS nums RETURN any(n IN nums WHERE n < 0)",
    ],
})
class PredicateAny extends PredicateFunction {
    constructor() {
        super("any");
    }

    public value(): any {
        this.reference.referred = this._valueHolder;
        const array = this.array.value();
        if (array === null || !Array.isArray(array)) {
            return false;
        }
        for (let i = 0; i < array.length; i++) {
            this._valueHolder.holder = array[i];
            if (this.where !== null && this.where.value()) {
                return true;
            }
        }
        return false;
    }
}

export default PredicateAny;
