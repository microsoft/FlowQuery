import Function from "./function";
import { FunctionDef } from "./function_metadata";

@FunctionDef({
    description: "Returns the labels of a node as an array",
    category: "scalar",
    parameters: [{ name: "node", description: "A node to get the labels from", type: "object" }],
    output: { description: "Array of labels", type: "array", example: ["Person"] },
    examples: ["MATCH (n:Person) RETURN labels(n)", "MATCH (n) RETURN labels(n)"],
})
class Labels extends Function {
    constructor() {
        super("labels");
        this._expectedParameterCount = 1;
    }

    public value(): any {
        const val = this.getChildren()[0].value();
        if (val === null || val === undefined) {
            return null;
        }
        if (typeof val !== "object" || Array.isArray(val)) {
            throw new Error("labels() expects a node");
        }
        if ("_label" in val && val._label) {
            return [val._label];
        }
        return [];
    }
}

export default Labels;
